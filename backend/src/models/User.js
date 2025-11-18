import mongoose from "mongoose";
import config from "../config/env.js";
import { buildUserRoot } from "../utils/userRoot.js";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 64,
    },
    usernameLower: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      unique: true,
      index: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    totpSecret: {
      type: String,
      required: false,
    },
    mfaVerified: {
      type: Boolean,
      default: false,
    },
    rootPrefix: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: ["admin", "user"],
      default: "user",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "suspended"],
      default: "pending",
      index: true,
    },
    maxStorageBytes: {
      type: Number,
      default: () => config.storage.defaultUserQuotaBytes,
    },
    approvedAt: {
      type: Date,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    emailVerification: {
      code: String,
      expiresAt: Date,
      verified: {
        type: Boolean,
        default: false,
      },
      sentAt: Date,
    },
  },
  { timestamps: true }
);

userSchema.pre("validate", function userSchemaPreValidate(next) {
  if (!this.rootPrefix && this._id) {
    this.rootPrefix = buildUserRoot(this._id.toString());
  }
  next();
});

userSchema.methods.toSafeProfile = function toSafeProfile() {
  return {
    id: this._id.toString(),
    username: this.username,
    rootPrefix: this.rootPrefix,
    role: this.role,
    status: this.status,
    maxStorageBytes: this.maxStorageBytes,
    emailVerified: Boolean(this.emailVerification?.verified),
  };
};

const User = mongoose.model("User", userSchema);

export default User;
