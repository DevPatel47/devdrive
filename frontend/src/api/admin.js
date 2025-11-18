import api from "./client";

export const fetchUsers = async ({ status } = {}) => {
  const { data } = await api.get("/admin/users", {
    params: status ? { status } : undefined,
  });
  return data;
};

export const approveUser = async (id, { maxStorageBytes } = {}) => {
  const payload = {};
  if (typeof maxStorageBytes === "number" && maxStorageBytes > 0) {
    payload.maxStorageBytes = maxStorageBytes;
  }
  const { data } = await api.post(`/admin/users/${id}/approve`, payload);
  return data;
};

export const updateQuota = async (id, { maxStorageBytes }) => {
  const payload = {};
  if (typeof maxStorageBytes === "number" && maxStorageBytes > 0) {
    payload.maxStorageBytes = maxStorageBytes;
  }
  const { data } = await api.post(`/admin/users/${id}/quota`, payload);
  return data;
};
