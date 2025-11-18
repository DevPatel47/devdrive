export const health = async (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
};

export default {
  health,
};
