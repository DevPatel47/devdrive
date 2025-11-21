import axios from "axios";

/** Shared Axios instance configured for DevDrive backend. */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 15000,
  withCredentials: true,
});

let unauthorizedHandler = null;
let refreshPromise = null;

/**
 * Registers a callback invoked when refresh fails and the session is invalid.
 * @param {() => void} handler
 */
export const setUnauthorizedHandler = (handler) => {
  unauthorizedHandler = handler;
};

/**
 * Avoids refresh recursion for auth endpoints.
 * @param {import("axios").InternalAxiosRequestConfig} config
 */
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

/**
 * Lists files and folders for the active user.
 * @param {string} [prefix]
 */
export const listObjects = async (prefix = "") => {
  const { data } = await api.get("/files", { params: { prefix } });
  return data;
};

/**
 * Requests a signed upload URL for the given key.
 * @param {{ key: string, contentType: string, contentLength: number }} payload
 */
export const requestUploadUrl = async ({ key, contentType, contentLength }) => {
  const { data } = await api.post("/upload-url", {
    key,
    contentType,
    contentLength,
  });
  return data;
};

/**
 * Retrieves a signed download URL.
 * @param {string} key
 */
export const requestDownloadUrl = async (key) => {
  const { data } = await api.get("/download-url", { params: { key } });
  return data;
};

/**
 * Deletes an object or folder.
 * @param {string} key
 */
export const deleteObject = async (key) => {
  const { data } = await api.delete("/delete", { params: { key } });
  return data;
};

/**
 * Creates a folder placeholder under the provided prefix.
 * @param {{ prefix?: string, name: string }} payload
 */
export const createFolder = async ({ prefix = "", name }) => {
  const { data } = await api.post("/create-folder", { prefix, name });
  return data;
};

/**
 * Renames an object or folder.
 * @param {{ key: string, newName: string }} payload
 */
export const renameObject = async ({ key, newName }) => {
  const { data } = await api.post("/rename", { key, newName });
  return data;
};

/**
 * Moves an object or folder to a new prefix.
 * @param {{ sourceKey: string, destinationPrefix: string }} payload
 */
export const moveObject = async ({ sourceKey, destinationPrefix }) => {
  const { data } = await api.post("/move", { sourceKey, destinationPrefix });
  return data;
};

/**
 * Fetches byte usage for a folder.
 * @param {string} [prefix]
 */
export const fetchStorageUsage = async (prefix = "") => {
  const { data } = await api.get("/storage/usage", { params: { prefix } });
  return data;
};

export default api;
