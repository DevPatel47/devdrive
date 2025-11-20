import { useState } from "react";
import { FiLock } from "react-icons/fi";

const LoginCard = ({
  onSubmit,
  loading,
  error,
  onSwitchToRegister,
  onShowHowItWorks,
}) => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ username, password });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card w-full max-w-md rounded-3xl p-8"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-700 dark:bg-brand-500/10 dark:text-brand-200">
        <FiLock /> Secure Access
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Sign in to DevDrive
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Use your DevDrive credentials to continue.
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
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
            onChange={(event) => setPassword(event.target.value)}
            required
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          className="button-primary w-full"
          disabled={loading}
        >
          {loading ? "Verifying..." : "Continue"}
        </button>
        {onShowHowItWorks && (
          <button
            type="button"
            className="button-secondary w-full"
            onClick={onShowHowItWorks}
            disabled={loading}
          >
            How DevDrive works
          </button>
        )}
      </div>
      {onSwitchToRegister && (
        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
          Need an account?{" "}
          <button
            type="button"
            className="font-semibold text-brand-600 hover:underline"
            onClick={onSwitchToRegister}
            disabled={loading}
          >
            Create one
          </button>
        </p>
      )}
    </form>
  );
};

export default LoginCard;
