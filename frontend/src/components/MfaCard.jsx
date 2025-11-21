import { useState } from "react";
import { FiShield } from "react-icons/fi";

/**
 * Handles the second factor challenge during login/registration.
 * @param {{ onSubmit: ({ code: string }) => void, onBack: () => void, loading?: boolean, error?: string }} props
 */
const MfaCard = ({ onSubmit, onBack, loading, error }) => {
  const [code, setCode] = useState("");

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ code });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card w-full max-w-md rounded-3xl p-8"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
        <FiShield /> MFA Required
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Enter your code
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Open your authenticator app and enter the 6-digit code.
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            One-time code
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            maxLength={6}
            required
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-center text-lg tracking-[0.4em] outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        {error && <p className="text-sm text-red-500">{error}</p>}
        <div className="flex gap-3">
          <button
            type="button"
            className="button-secondary w-full"
            onClick={onBack}
          >
            Back
          </button>
          <button
            type="submit"
            className="button-primary w-full"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default MfaCard;
