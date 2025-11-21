import ApiError from "./apiError.js";

const ensureTrailingSlash = (value = "") =>
  value.endsWith("/") ? value : `${value.replace(/\/$/, "")}/`;

/**
 * Builds a root prefix for a given user identifier.
 * @param {string} identifier
 */
export const buildUserRoot = (identifier) =>
  ensureTrailingSlash(`users/${identifier}`);

/**
 * Joins a user's root with a relative key.
 * @param {string} rootPrefix
 * @param {string} relativeKey
 */
export const withUserKey = (rootPrefix, relativeKey) => {
  const root = ensureTrailingSlash(rootPrefix || "");
  if (!relativeKey) return root.slice(0, -1);
  return `${root}${relativeKey}`.replace(/\/{2,}/g, "/");
};

/**
 * Joins a user's root with a relative prefix ensuring trailing slash.
 * @param {string} rootPrefix
 * @param {string} relativePrefix
 */
export const withUserPrefix = (rootPrefix, relativePrefix) => {
  const root = ensureTrailingSlash(rootPrefix || "");
  const normalized = relativePrefix ? ensureTrailingSlash(relativePrefix) : "";
  return `${root}${normalized}`.replace(/\/{2,}/g, "/");
};

/**
 * Removes the root prefix from an absolute key while preventing traversal.
 * @param {string} rootPrefix
 * @param {string} absoluteKey
 */
export const stripUserPrefix = (rootPrefix, absoluteKey) => {
  const root = ensureTrailingSlash(rootPrefix || "");
  if (!absoluteKey.startsWith(root)) {
    throw new ApiError(403, "Object is outside of your storage root");
  }
  return absoluteKey.slice(root.length);
};

export default {
  buildUserRoot,
  withUserKey,
  withUserPrefix,
  stripUserPrefix,
};
