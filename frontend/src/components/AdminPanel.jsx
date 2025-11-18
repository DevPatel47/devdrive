import { useEffect, useMemo, useState } from "react";
import { formatBytes } from "../utils/formatters";

const GB = 1024 ** 3;

const toGbValue = (bytes) => {
  if (!bytes || bytes <= 0) return "";
  return Math.round(bytes / GB);
};

const toBytes = (gigabytes) => {
  const value = Number(gigabytes);
  if (!Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value * GB);
};

const Section = ({ title, children }) => (
  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
    <div className="flex items-center justify-between">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {title}
      </h3>
    </div>
    {children}
  </section>
);

const UserRow = ({
  user,
  quotaValue,
  onQuotaChange,
  onApprove,
  onQuotaUpdate,
  actionLabel,
  loading,
}) => {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/90 p-4 shadow-sm dark:border-slate-800/70 dark:bg-slate-900/80">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-slate-900 dark:text-slate-100">
            {user.username}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Usage: {formatBytes(user.storageUsedBytes || 0)}
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-800 dark:text-slate-300">
          {user.status}
        </span>
      </div>
      <label className="text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        Storage quota (GB)
        <input
          type="number"
          min={1}
          className="mt-1 w-full rounded-2xl border border-slate-200 px-4 py-2 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
          value={quotaValue}
          onChange={(event) => onQuotaChange(event.target.value)}
        />
      </label>
      <div className="flex flex-wrap gap-3">
        {onApprove && (
          <button
            type="button"
            className="button-primary flex-1"
            onClick={onApprove}
            disabled={loading}
          >
            {actionLabel || "Approve"}
          </button>
        )}
        {onQuotaUpdate && (
          <button
            type="button"
            className="button-secondary flex-1"
            onClick={onQuotaUpdate}
            disabled={loading}
          >
            Save quota
          </button>
        )}
      </div>
    </div>
  );
};

const AdminPanel = ({
  open,
  onClose,
  pendingUsers = [],
  approvedUsers = [],
  loading = false,
  onRefresh,
  onApprove,
  onQuotaUpdate,
}) => {
  const [quotaInputs, setQuotaInputs] = useState({});

  const users = useMemo(
    () => [...pendingUsers, ...approvedUsers],
    [pendingUsers, approvedUsers]
  );

  useEffect(() => {
    const next = {};
    users.forEach((user) => {
      next[user.id] = toGbValue(user.maxStorageBytes);
    });
    setQuotaInputs(next);
  }, [users]);

  if (!open) return null;

  const handleInputChange = (userId, value) => {
    setQuotaInputs((prev) => ({ ...prev, [userId]: value }));
  };

  const resolveQuotaBytes = (userId) => toBytes(quotaInputs[userId]);

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="glass-card w-full max-w-4xl rounded-3xl p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
              Admin dashboard
            </p>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              Account approvals & quotas
            </h2>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              className="button-secondary"
              onClick={onRefresh}
            >
              Refresh
            </button>
            <button
              type="button"
              className="button-secondary"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <Section
            title="Pending approvals"
            emptyLabel="No users waiting for approval."
          >
            {pendingUsers.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No users are currently waiting. Refresh to check again.
              </p>
            )}
            <div className="space-y-4">
              {pendingUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  quotaValue={quotaInputs[user.id] ?? ""}
                  onQuotaChange={(value) => handleInputChange(user.id, value)}
                  onApprove={() => onApprove(user, resolveQuotaBytes(user.id))}
                  loading={loading}
                />
              ))}
            </div>
          </Section>

          <Section title="Approved users" emptyLabel="No approved users yet.">
            {approvedUsers.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Approved users will appear here with their current quota.
              </p>
            )}
            <div className="space-y-4">
              {approvedUsers.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  quotaValue={quotaInputs[user.id] ?? ""}
                  onQuotaChange={(value) => handleInputChange(user.id, value)}
                  onQuotaUpdate={() =>
                    onQuotaUpdate(user, resolveQuotaBytes(user.id))
                  }
                  loading={loading}
                  actionLabel="Update quota"
                />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
