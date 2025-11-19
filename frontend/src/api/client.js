import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

let unauthorizedHandler = null;
let refreshPromise = null;

export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

const shouldSkipAuthRetry = (config) => {
  if (!config?.url) return true;
  return config.url.startsWith("/auth/");
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { response, config } = error;
    if (!response || !config) {
      return Promise.reject(error);
    }

    if (
      response.status === 401 &&
      !config._retry &&
      !shouldSkipAuthRetry(config)
    ) {
      config._retry = true;

      try {
        if (!refreshPromise) {
          refreshPromise = api.post("/auth/refresh");
        }
        await refreshPromise;
        refreshPromise = null;
        return api(config);
      } catch (refreshError) {
        refreshPromise = null;
        if (unauthorizedHandler) {
          unauthorizedHandler();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const listObjects = async (prefix = "") => {
  const { data } = await api.get("/files", { params: { prefix } });
  return data;
};

export const requestUploadUrl = async ({ key, contentType, contentLength }) => {
  const { data } = await api.post("/upload-url", {
    key,
    contentType,
    contentLength,
  });
  return data;
};

export const requestDownloadUrl = async (key) => {
  const { data } = await api.get("/download-url", { params: { key } });
  return data;
};

export const deleteObject = async (key) => {
  const { data } = await api.delete("/delete", { params: { key } });
  return data;
};

export const createFolder = async ({ prefix = "", name }) => {
  const { data } = await api.post("/create-folder", { prefix, name });
  return data;
};

export const renameObject = async ({ key, newName }) => {
  const { data } = await api.post("/rename", { key, newName });
  return data;
};

export const moveObject = async ({ sourceKey, destinationPrefix }) => {
  const { data } = await api.post("/move", { sourceKey, destinationPrefix });
  return data;
};

export const fetchStorageUsage = async (prefix = "") => {
  const { data } = await api.get("/storage/usage", { params: { prefix } });
  return data;
};

export default api;
