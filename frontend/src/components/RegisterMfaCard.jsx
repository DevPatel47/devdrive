import { useState } from "react";
import { FiShield } from "react-icons/fi";

const RegisterMfaCard = ({ context, onSubmit, onBack, loading, error }) => {
  const [code, setCode] = useState("");

  if (!context) return null;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit({ code: code.trim() });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card w-full max-w-md rounded-3xl p-8"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-200">
        <FiShield /> Secure your account
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Scan the QR code
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Use your authenticator app to scan the QR code below for
        <span className="font-semibold"> {context.username}</span>, then enter
        the 6-digit code to finish enrollment.
      </p>

      <div className="mt-6 flex flex-col items-center gap-4">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-4 shadow dark:border-slate-700 dark:bg-slate-900">
          <img
            src={context.qrCodeDataUrl}
            alt="Authenticator QR code"
            className="h-48 w-48 object-contain"
          />
        </div>
        <div className="w-full rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-4 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          <p className="text-xs uppercase tracking-wide text-slate-400">
            Manual entry code
          </p>
          <p className="mt-1 select-all font-mono text-base font-semibold break-all">
            {context.secret}
          </p>
        </div>
      </div>

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
            disabled={loading}
          >
            Start over
          </button>
          <button
            type="submit"
            className="button-primary w-full"
            disabled={loading}
          >
            {loading ? "Verifying..." : "Verify setup"}
          </button>
        </div>
      </div>
    </form>
  );
};

export default RegisterMfaCard;
