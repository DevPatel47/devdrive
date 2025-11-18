import clsx from "clsx";
import {
  FiMoon,
  FiRefreshCcw,
  FiSun,
  FiUpload,
  FiFolderPlus,
  FiX,
} from "react-icons/fi";
import { formatBytes } from "../utils/formatters";

const SidebarContent = ({
  onCreateFolder,
  onUploadClick,
  onRefresh,
  onLogout,
  storageUsed = 0,
  storageLoading = false,
  accountStorageUsed = 0,
  accountStorageLoading = false,
  storageLimit = null,
  isDarkMode,
  onToggleTheme,
}) => {
  const limitLabel = storageLimit
    ? `${formatBytes(storageLimit)} limit`
    : "Unlimited storage";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm font-medium text-slate-500">Quick actions</p>
        <div className="mt-4 space-y-2">
          <button
            type="button"
            className="button-primary w-full"
            onClick={onUploadClick}
          >
            <FiUpload /> Upload files
          </button>
          <button
            type="button"
            className="button-secondary w-full"
            onClick={onCreateFolder}
          >
            <FiFolderPlus /> New folder
          </button>
          <button
            type="button"
            className="button-secondary w-full"
            onClick={onRefresh}
          >
            <FiRefreshCcw /> Refresh
          </button>
          {onLogout && (
            <button
              type="button"
              className="button-secondary w-full"
              onClick={onLogout}
            >
              Sign out
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-500">Storage usage</p>
        <div className="mt-4 space-y-3 text-sm text-slate-500 dark:text-slate-300">
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              Total account
            </p>
            <span className="mt-1 block font-semibold text-slate-800 dark:text-slate-100">
              {accountStorageLoading
                ? "Calculating..."
                : `${formatBytes(accountStorageUsed)} used`}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Combined usage across all folders. {limitLabel}.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/50">
            <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">
              This folder
            </p>
            <span className="mt-1 block font-semibold text-slate-800 dark:text-slate-100">
              {storageLoading
                ? "Calculating..."
                : `${formatBytes(storageUsed)} stored`}
            </span>
            <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
              Includes everything in this location and subfolders.
            </p>
          </div>
        </div>
      </div>

      <div>
        <p className="text-sm font-medium text-slate-500">Appearance</p>
        <button
          type="button"
          className="mt-4 flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
          onClick={onToggleTheme}
        >
          <span>
            {isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          </span>
          {isDarkMode ? <FiSun /> : <FiMoon />}
        </button>
      </div>
    </div>
  );
};

const Sidebar = (props) => (
  <aside className="hidden w-full max-w-xs flex-col gap-6 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/60 lg:flex">
    <SidebarContent {...props} />
  </aside>
);

export const MobileSidebarDrawer = ({ open, onClose, ...props }) => {
  return (
    <div
      className={clsx(
        "fixed inset-0 z-40 flex flex-col items-center lg:hidden",
        open ? "pointer-events-auto" : "pointer-events-none"
      )}
    >
      <div
        className={clsx(
          "absolute inset-0 bg-slate-950/70 transition-opacity",
          open ? "opacity-100" : "opacity-0"
        )}
        onClick={onClose}
      />
      <div
        className={clsx(
          "relative w-full max-w-md px-4 pt-6 transition-all duration-200",
          open ? "translate-y-0 opacity-100" : "-translate-y-6 opacity-0"
        )}
      >
        <div className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-600">
                Controls
              </p>
              <p className="text-xs text-slate-500">
                Quick actions, storage & appearance
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-transparent p-2 text-slate-500 hover:border-slate-200 hover:bg-white dark:hover:border-slate-700 dark:hover:bg-slate-800"
              aria-label="Close controls"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>
          <SidebarContent {...props} />
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
