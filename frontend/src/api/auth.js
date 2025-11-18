import api from "./client";

export const login = async ({ username, password }) => {
  const { data } = await api.post("/auth/login", { username, password });
  return data;
};

export const registerInit = async ({ username, password }) => {
  const { data } = await api.post("/auth/register/init", {
    username,
    password,
  });
  return data;
};

export const verifyEmailOtp = async ({ code, token }) => {
  const { data } = await api.post("/auth/register/email-verify", {
    code,
    token,
  });
  return data;
};

export const resendEmailOtp = async ({ token }) => {
  const { data } = await api.post("/auth/register/resend-email", { token });
  return data;
};

export const registerVerify = async ({ code, token }) => {
  const { data } = await api.post("/auth/register/verify", { code, token });
  return data;
};

export const verifyMfa = async ({ code }) => {
  const { data } = await api.post("/auth/mfa", { code });
  return data;
};

export const fetchSession = async () => {
  const { data } = await api.get("/auth/me");
  return data;
};

export const logout = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};
