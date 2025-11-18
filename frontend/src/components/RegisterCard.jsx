import { useState } from "react";
import { FiUserPlus } from "react-icons/fi";

const RegisterCard = ({ onSubmit, loading, error, onSwitchToLogin }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setFormError("Email is required");
      return;
    }
    if (password !== confirmPassword) {
      setFormError("Passwords do not match");
      return;
    }
    setFormError("");
    onSubmit({ username: trimmedEmail, password });
  };

  const renderError = formError || error;

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card w-full max-w-md rounded-3xl p-8"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-sm font-semibold text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-200">
        <FiUserPlus /> Create an account
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Join DevDrive
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Use the email address where you want to receive verification codes.
        We’ll send a 6-digit code to confirm it belongs to you before moving to
        MFA.
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (formError) setFormError("");
            }}
            required
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Password
          </label>
          <input
            type="password"
            value={password}
            minLength={8}
            onChange={(event) => {
              setPassword(event.target.value);
              if (formError) setFormError("");
            }}
            required
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Confirm password
          </label>
          <input
            type="password"
            value={confirmPassword}
            minLength={8}
            onChange={(event) => {
              setConfirmPassword(event.target.value);
              if (formError) setFormError("");
            }}
            required
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {renderError && <p className="text-sm text-red-500">{renderError}</p>}
        <button
          type="submit"
          className="button-primary w-full"
          disabled={loading}
        >
          {loading ? "Sending code..." : "Send verification code"}
        </button>
        {onSwitchToLogin && (
          <button
            type="button"
            className="button-secondary w-full"
            onClick={onSwitchToLogin}
            disabled={loading}
          >
            Back to sign in
          </button>
        )}
      </div>
    </form>
  );
};

export default RegisterCard;
