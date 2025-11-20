import { FiInfo, FiShield, FiUsers, FiCheckCircle } from "react-icons/fi";

const steps = [
  {
    icon: FiUsers,
    title: "Email-first sign up",
    description:
      "Start with your email. We verify ownership with a 6-digit OTP so only you can continue.",
  },
  {
    icon: FiShield,
    title: "Mandatory MFA",
    description:
      "Scan the QR code with your authenticator app. Every session requires a TOTP code to sign in.",
  },
  {
    icon: FiCheckCircle,
    title: "Transparent approvals",
    description:
      "Admins review new accounts, apply storage quotas, and only then unlock the dashboard.",
  },
  {
    icon: FiInfo,
    title: "Isolated storage",
    description:
      "Files live in private AWS S3 prefixes. Uploads/downloads use short-lived pre-signed URLs only.",
  },
];

const HowDevDriveWorksModal = ({ open, onClose }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 px-4 py-8">
      <div className="glass-card w-full max-w-2xl rounded-3xl p-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
              How DevDrive Works
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Transparency from onboarding to storage
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              Every step is audited: verified emails, enforced MFA, admin
              approvals, and per-user S3 isolation ensure nobody can access data
              they do not own.
            </p>
          </div>
          <button type="button" className="button-secondary" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {steps.map(({ icon: Icon, title, description }) => (
            <div
              key={title}
              className="rounded-2xl border border-slate-200/70 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                  <Icon />
                </span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {title}
                </h3>
              </div>
              <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
                {description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowDevDriveWorksModal;
