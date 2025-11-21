import api from "./client";

/**
 * Retrieves users optionally filtered by status.
 * @param {{ status?: string }} [params]
 */
export const fetchUsers = async ({ status } = {}) => {
  const { data } = await api.get("/admin/users", {
    params: status ? { status } : undefined,
  });
  return data;
};

/**
 * Approves a user and optionally sets a quota.
 * @param {string} id
 * @param {{ maxStorageBytes?: number }} [options]
 */
export const approveUser = async (id, { maxStorageBytes } = {}) => {
  const payload = {};
  if (typeof maxStorageBytes === "number" && maxStorageBytes > 0) {
    payload.maxStorageBytes = maxStorageBytes;
  }
  const { data } = await api.post(`/admin/users/${id}/approve`, payload);
  return data;
};

/**
 * Updates the maximum storage allocation for a user.
 * @param {string} id
 * @param {{ maxStorageBytes: number }} options
 */
export const updateQuota = async (id, { maxStorageBytes }) => {
  const payload = {};
  if (typeof maxStorageBytes === "number" && maxStorageBytes > 0) {
    payload.maxStorageBytes = maxStorageBytes;
  }
  const { data } = await api.post(`/admin/users/${id}/quota`, payload);
  return data;
};
