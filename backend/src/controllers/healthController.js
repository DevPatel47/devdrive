/**
 * Simple readiness endpoint for uptime monitors.
 * @param {import("express").Request} _req
 * @param {import("express").Response} res
 */
export const health = async (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

export default {
  health,
};
