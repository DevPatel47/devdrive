import toast from "react-hot-toast";
import LoginCard from "../../../components/LoginCard";
import RegisterCard from "../../../components/RegisterCard";
import RegisterEmailOtpCard from "../../../components/RegisterEmailOtpCard";
import RegisterMfaCard from "../../../components/RegisterMfaCard";
import MfaCard from "../../../components/MfaCard";
import HowDevDriveWorksModal from "../../../components/HowDevDriveWorksModal";
import AppFooter from "../../../components/AppFooter";

/**
 * Displays every pre-authentication state (login, registration, MFA, approvals)
 * while keeping the main dashboard container lean and presentation-focused.
 * @param {object} props
 */
const AuthExperience = ({
  sessionState,
  sessionUser,
  authLoading,
  authError,
  resendLoading,
  registrationContext,
  onLoginSubmit,
  onRegisterSubmit,
  onEmailOtpSubmit,
  onResendEmailOtp,
  onRegisterVerify,
  onMfaSubmit,
  onMfaBack,
  onSwitchToRegister,
  onSwitchToLogin,
  howItWorksOpen,
  onOpenHowItWorks,
  onCloseHowItWorks,
}) => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-brand-900">
      <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
            DevDrive
          </p>
          <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
            Secure Cloud Storage Platform
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Secure multi-user access with MFA-protected sessions.
          </p>
        </div>

        {sessionState === "checking" && (
          <div className="glass-card w-full max-w-md rounded-3xl p-8 text-slate-500">
            Checking your session...
          </div>
        )}

        {sessionState === "login" && (
          <LoginCard
            onSubmit={onLoginSubmit}
            loading={authLoading}
            error={authError}
            onSwitchToRegister={onSwitchToRegister}
            onShowHowItWorks={onOpenHowItWorks}
          />
        )}

        {sessionState === "register" && (
          <RegisterCard
            onSubmit={onRegisterSubmit}
            loading={authLoading}
            error={authError}
            onSwitchToLogin={onSwitchToLogin}
            onShowHowItWorks={onOpenHowItWorks}
          />
        )}

        {sessionState === "register-email-otp" && registrationContext && (
          <RegisterEmailOtpCard
            email={registrationContext.email}
            onSubmit={onEmailOtpSubmit}
            onBack={onSwitchToRegister}
            onResend={onResendEmailOtp}
            resendLoading={resendLoading}
            resendAvailableAt={registrationContext.resendAvailableAt}
            codeExpiresAt={registrationContext.codeExpiresAt}
            loading={authLoading}
            error={authError}
          />
        )}

        {sessionState === "register-mfa" && registrationContext && (
          <RegisterMfaCard
            context={registrationContext}
            onSubmit={onRegisterVerify}
            onBack={onSwitchToRegister}
            loading={authLoading}
            error={authError}
          />
        )}

        {sessionState === "mfa" && (
          <MfaCard
            onSubmit={onMfaSubmit}
            onBack={onMfaBack}
            loading={authLoading}
            error={authError}
          />
        )}

        {sessionState === "pending-approval" && (
          <div className="glass-card w-full max-w-md rounded-3xl p-8 text-left">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Awaiting approval
            </h2>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              {sessionUser?.username
                ? `${sessionUser.username} is pending admin approval. We'll email you once it's ready.`
                : "Your account is pending admin approval. We'll notify you once it's ready."}
            </p>
            <div className="mt-6 flex gap-3">
              <button
                type="button"
                className="button-secondary flex-1"
                onClick={onSwitchToLogin}
              >
                Back to login
              </button>
              <button
                type="button"
                className="button-secondary flex-1"
                onClick={() => toast.success("We'll notify you when approved")}
              >
                Got it
              </button>
            </div>
          </div>
        )}
      </div>
      <AppFooter />
      <HowDevDriveWorksModal
        open={howItWorksOpen}
        onClose={onCloseHowItWorks}
      />
    </div>
  );
};

export default AuthExperience;
