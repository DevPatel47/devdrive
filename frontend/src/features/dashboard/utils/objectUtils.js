/**
 * Utility helpers for normalizing S3 object metadata within the dashboard.
 * These helpers avoid direct dependencies on the dashboard view so that tests
 * and other features can reuse the same naming and id-generation logic.
 */
export const safeName = (name = "") => {
  const segments = name
    .split(/[\\/]+/)
    .filter((segment) => segment && segment !== "..")
    .map((segment, index) => {
      const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, "-");
      return cleaned || `untitled-${index + 1}`;
    });

  if (!segments.length) {
    return `untitled-${Date.now()}`;
  }

  return segments.join("/");
};

export const createId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};
