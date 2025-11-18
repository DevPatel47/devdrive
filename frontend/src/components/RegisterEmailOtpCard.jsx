import { useEffect, useState } from "react";
import { FiMail } from "react-icons/fi";

const RegisterEmailOtpCard = ({
  email,
  onSubmit,
  onBack,
  onResend,
  loading,
  resendLoading = false,
  resendAvailableAt,
  codeExpiresAt,
  error,
}) => {
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState("");
  const [resendCountdown, setResendCountdown] = useState(() =>
    resendAvailableAt
      ? Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
      : 0
  );
  const [expiresCountdown, setExpiresCountdown] = useState(() =>
    codeExpiresAt
      ? Math.max(0, Math.ceil((codeExpiresAt - Date.now()) / 1000))
      : 0
  );

  const handleSubmit = (event) => {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || trimmed.length !== 6) {
      setFormError("Enter the 6-digit code we emailed you");
      return;
    }
    setFormError("");
    onSubmit({ code: trimmed });
  };

  useEffect(() => {
    const updateCountdowns = () => {
      if (resendAvailableAt) {
        setResendCountdown(
          Math.max(0, Math.ceil((resendAvailableAt - Date.now()) / 1000))
        );
      } else {
        setResendCountdown(0);
      }
      if (codeExpiresAt) {
        setExpiresCountdown(
          Math.max(0, Math.ceil((codeExpiresAt - Date.now()) / 1000))
        );
      } else {
        setExpiresCountdown(0);
      }
    };
    updateCountdowns();
    const interval = setInterval(updateCountdowns, 1000);
    return () => clearInterval(interval);
  }, [resendAvailableAt, codeExpiresAt]);

  const handleResendClick = async () => {
    if (!onResend || resendLoading || resendCountdown > 0) return;
    try {
      await onResend();
      setCode("");
      setFormError("");
    } catch (_error) {
      // Parent surface errors; no-op here.
    }
  };

  const codeExpired = Boolean(codeExpiresAt) && expiresCountdown <= 0;
  const renderError = formError || error;
  const verifyDisabled = loading || codeExpired;

  return (
    <form
      onSubmit={handleSubmit}
      className="glass-card w-full max-w-md rounded-3xl p-8"
    >
      <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700 dark:bg-amber-500/10 dark:text-amber-200">
        <FiMail /> Verify your email
      </div>
      <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
        Check your inbox
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        We sent a 6-digit code to <span className="font-semibold">{email}</span>
        .
        {codeExpiresAt ? (
          codeExpired ? (
            <> The last code expired. Request another below.</>
          ) : (
            <> Expires in {expiresCountdown}s.</>
          )
        ) : (
          <> It expires in 2 minutes.</>
        )}
      </p>
      <div className="mt-6 space-y-4">
        <div>
          <label className="text-sm font-medium text-slate-600 dark:text-slate-300">
            Verification code
          </label>
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/[^0-9]/g, ""));
              if (formError) setFormError("");
            }}
            autoComplete="one-time-code"
            autoFocus
            className="mt-1 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-center text-lg tracking-widest outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>
            {codeExpiresAt
              ? codeExpired
                ? "Code expired. Request a new one."
                : `Code expires in ${expiresCountdown}s`
              : "Code expires in 2 minutes"}
          </span>
          <button
            type="button"
            onClick={handleResendClick}
            disabled={resendLoading || resendCountdown > 0}
            className="font-semibold text-brand-600 transition hover:text-brand-500 disabled:cursor-not-allowed disabled:text-slate-400"
          >
            {resendLoading
              ? "Sending..."
              : resendCountdown > 0
              ? `Resend in ${resendCountdown}s`
              : "Resend code"}
          </button>
        </div>
        {renderError && <p className="text-sm text-red-500">{renderError}</p>}
        <button
          type="submit"
          className="button-primary w-full"
          disabled={verifyDisabled}
        >
          {loading
            ? "Verifying..."
            : codeExpired
            ? "Code expired"
            : "Verify email"}
        </button>
        <button
          type="button"
          className="button-secondary w-full"
          onClick={onBack}
          disabled={loading}
        >
          Use a different email
        </button>
      </div>
    </form>
  );
};

export default RegisterEmailOtpCard;
