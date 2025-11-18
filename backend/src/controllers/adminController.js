import ApiError from "../utils/apiError.js";
import User from "../models/User.js";
import {
  calculatePrefixUsage,
  ensureFolderExists,
} from "../services/s3Service.js";
import { notifyUserApproved } from "../services/emailService.js";
import { buildUserRoot } from "../utils/userRoot.js";
import config from "../config/env.js";

const VALID_STATUSES = new Set(["pending", "approved", "suspended"]);

const serializeUser = (user) => ({
  id: user.id,
  username: user.username,
  status: user.status,
  role: user.role,
  maxStorageBytes: user.maxStorageBytes,
  createdAt: user.createdAt,
  updatedAt: user.updatedAt,
  approvedAt: user.approvedAt,
  approvedBy: user.approvedBy,
  mfaVerified: user.mfaVerified,
});

export const listUsers = async (req, res) => {
  const { status } = req.query || {};
  const filter = {};
  if (status && VALID_STATUSES.has(status)) {
    filter.status = status;
  }

  const users = await User.find(filter).sort({ createdAt: -1 });
  const results = await Promise.all(
    users.map(async (user) => {
      const usage = user.rootPrefix
        ? await calculatePrefixUsage(user.rootPrefix)
        : { totalBytes: 0 };
      return {
        ...serializeUser(user),
        storageUsedBytes: usage.totalBytes || 0,
      };
    })
  );
  res.json({ users: results });
};

export const approveUser = async (req, res) => {
  const { id } = req.params;
  const { maxStorageBytes } = req.body || {};

  const user = await User.findById(id);
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (user.status === "approved") {
    throw new ApiError(400, "User is already approved");
  }

  if (maxStorageBytes !== undefined) {
    const parsed = Number(maxStorageBytes);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      throw new ApiError(400, "maxStorageBytes must be a positive number");
    }
    user.maxStorageBytes = parsed;
  } else if (!user.maxStorageBytes) {
    user.maxStorageBytes = config.storage.defaultUserQuotaBytes;
  }

  user.status = "approved";
  user.approvedAt = new Date();
  user.approvedBy = req.user.id;
  if (!user.rootPrefix) {
    user.rootPrefix = buildUserRoot(user._id.toString());
  }
  await user.save();
  await ensureFolderExists(user.rootPrefix);
  await notifyUserApproved({ username: user.username, email: user.username });

  res.json({ user: serializeUser(user) });
};

export const updateUserQuota = async (req, res) => {
  const { id } = req.params;
  const { maxStorageBytes } = req.body || {};
  const parsed = Number(maxStorageBytes);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new ApiError(400, "maxStorageBytes must be a positive number");
  }

  const user = await User.findByIdAndUpdate(
    id,
    { maxStorageBytes: parsed },
    { new: true }
  );
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.json({ user: serializeUser(user) });
};

export default {
  listUsers,
  approveUser,
  updateUserQuota,
};
