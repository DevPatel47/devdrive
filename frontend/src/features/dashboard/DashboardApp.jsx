import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { FiShield, FiSliders } from "react-icons/fi";
import Breadcrumbs from "../../components/Breadcrumbs";
import FileExplorer from "../../components/FileExplorer";
import UploadArea from "../../components/UploadArea";
import PreviewModal from "../../components/PreviewModal";
import Sidebar, { MobileSidebarDrawer } from "../../components/Sidebar";
import AdminPanel from "../../components/AdminPanel";
import LoginCard from "../../components/LoginCard";
import RegisterCard from "../../components/RegisterCard";
import RegisterEmailOtpCard from "../../components/RegisterEmailOtpCard";
import RegisterMfaCard from "../../components/RegisterMfaCard";
import MfaCard from "../../components/MfaCard";
import {
  createFolder,
  deleteObject,
  listObjects,
  moveObject,
  renameObject,
  requestDownloadUrl,
  requestUploadUrl,
  fetchStorageUsage,
} from "../../api/client";
import {
  fetchUsers as fetchAdminUsers,
  approveUser as approveAdminUser,
  updateQuota as updateAdminQuota,
} from "../../api/admin";
import { getFileType } from "../../utils/formatters";
import useAuthFlow from "../auth/hooks/useAuthFlow.js";
import useSession from "../../app/hooks/useSession.js";

const safeName = (name = "") => {
  const segments = name
    .split(/[\\/]+/)
    .filter((segment) => segment && segment !== "..")
    .map((segment, index) => {
      const cleaned = segment.replace(/[^a-zA-Z0-9._-]/g, "-");
      return cleaned || `untitled-${index + 1}`;
    });
  if (!segments.length) return `untitled-${Date.now()}`;
  return segments.join("/");
};

const createId = () => {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const useDarkMode = () => {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") return false;
    return (
      localStorage.getItem("dd-theme")?.toLowerCase() === "dark" || prefersDark
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
    localStorage.setItem("dd-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return [isDarkMode, setIsDarkMode];
};

const ActionModal = ({ modal, onChange, onClose, onSubmit }) => {
  if (!modal) return null;
  const hasInput = ["rename", "move", "create-folder"].includes(modal.type);

  const content = {
    rename: {
      title: "Rename item",
      description:
        "Choose a new name. Avoid using slashes or special system characters.",
      placeholder: "New name",
      confirmLabel: "Rename",
    },
    move: {
      title: "Move item",
      description:
        "Provide the destination prefix (e.g. marketing/q4/). Leave empty for root.",
      placeholder: "Destination prefix",
      confirmLabel: "Move",
    },
    "create-folder": {
      title: "Create folder",
      description:
        "Enter a folder name. It will be created inside the current location.",
      placeholder: "Folder name",
      confirmLabel: "Create folder",
    },
    delete: {
      title: "Delete item",
      description:
        "This action permanently removes the selected file or folder.",
      confirmLabel: "Delete",
    },
  }[modal.type];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/70 p-4">
      <div className="glass-card w-full max-w-lg rounded-3xl p-6">
        <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          {content.title}
        </h3>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {content.description}
        </p>
        {hasInput && (
          <input
            autoFocus
            className="mt-4 w-full rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm outline-none focus:border-brand-500 dark:border-slate-700 dark:bg-slate-900"
            value={modal.value}
            placeholder={content.placeholder}
            onChange={(event) => onChange(event.target.value)}
          />
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button type="button" className="button-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button-primary" onClick={onSubmit}>
            {content.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

const DashboardApp = () => {
  const {
    sessionState,
    sessionUser,
    authLoading,
    authError,
    resendLoading,
    registrationContext,
    resetAuthState,
    handleSwitchToRegister,
    handleSwitchToLogin,
  } = useSession();
  const [currentPrefix, setCurrentPrefix] = useState("");
  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState(
    () => localStorage.getItem("dd-view-mode") || "grid"
  );
  const [sortOption, setSortOption] = useState("name");
  const [selectedItem, setSelectedItem] = useState(null);
  const [uploads, setUploads] = useState([]);
  const [preview, setPreview] = useState(null);
  const [modal, setModal] = useState(null);
  const [isDarkMode, setIsDarkMode] = useDarkMode();
  const [refreshTick, setRefreshTick] = useState(0);
  const [folderUsage, setFolderUsage] = useState({
    totalBytes: 0,
    loading: false,
  });
  const [accountUsage, setAccountUsage] = useState({
    totalBytes: 0,
    loading: false,
  });
  const [usageRefreshTick, setUsageRefreshTick] = useState(0);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [adminPanelOpen, setAdminPanelOpen] = useState(false);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminData, setAdminData] = useState({ pending: [], approved: [] });

  const resetSession = useCallback(
    ({ notify = false, message } = {}) => {
      if (notify && message) {
        toast.error(message);
      }
      resetAuthState();
      setFolders([]);
      setFiles([]);
      setCurrentPrefix("");
      setSelectedItem(null);
      setUploads([]);
      setPreview(null);
      setLoading(false);
      setFolderUsage({ totalBytes: 0, loading: false });
      setUsageRefreshTick(0);
      setAccountUsage({ totalBytes: 0, loading: false });
      setControlsOpen(false);
      setAdminPanelOpen(false);
      setAdminData({ pending: [], approved: [] });
    },
    [resetAuthState]
  );

  const requestUsageRefresh = useCallback(() => {
    setUsageRefreshTick((tick) => tick + 1);
  }, []);
  const {
    handleLoginSubmit,
    handleRegisterSubmit,
    handleEmailOtpSubmit,
    handleResendEmailOtp,
    handleRegisterVerify,
    handleMfaSubmit,
    handleMfaBack,
    handleLogout,
  } = useAuthFlow({ onSessionReset: resetSession });

  const loadObjects = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listObjects(currentPrefix);
      setFolders(
        (data.folders || []).map((folder) => ({
          ...folder,
          type: "folder",
          children: folder.objectCount ?? 0,
          size: folder.totalBytes ?? 0,
        }))
      );
      setFiles((data.files || []).map((file) => ({ ...file, type: "file" })));
    } catch (error) {
      console.error(error);
      toast.error("Unable to load your files");
    } finally {
      setLoading(false);
    }
  }, [currentPrefix]);

  useEffect(() => {
    if (sessionState !== "ready") return;
    loadObjects();
  }, [sessionState, loadObjects, refreshTick]);

  useEffect(() => {
    if (sessionState !== "ready") return;
    let isActive = true;
    const fetchUsage = async () => {
      setFolderUsage((prev) => ({ ...prev, loading: true }));
      setAccountUsage((prev) => ({ ...prev, loading: true }));
      try {
        const [folderData, accountData] = await Promise.all([
          fetchStorageUsage(currentPrefix),
          fetchStorageUsage(""),
        ]);
        if (!isActive) return;
        setFolderUsage({
          totalBytes: folderData?.totalBytes || 0,
          loading: false,
        });
        setAccountUsage({
          totalBytes: accountData?.totalBytes || 0,
          loading: false,
        });
      } catch (error) {
        if (!isActive) return;
        console.error(error);
        setFolderUsage((prev) => ({ ...prev, loading: false }));
        setAccountUsage((prev) => ({ ...prev, loading: false }));
      }
    };
    fetchUsage();
    return () => {
      isActive = false;
    };
  }, [sessionState, currentPrefix, usageRefreshTick]);

  const loadAdminUsers = useCallback(async () => {
    if (sessionUser?.role !== "admin") return;
    setAdminLoading(true);
    try {
      const [pending, approved] = await Promise.all([
        fetchAdminUsers({ status: "pending" }),
        fetchAdminUsers({ status: "approved" }),
      ]);
      setAdminData({
        pending: pending?.users || [],
        approved: approved?.users || [],
      });
    } catch (error) {
      console.error(error);
      toast.error("Unable to load admin data");
    } finally {
      setAdminLoading(false);
    }
  }, [sessionUser?.role]);

  useEffect(() => {
    if (adminPanelOpen) {
      loadAdminUsers();
    }
  }, [adminPanelOpen, loadAdminUsers]);

  const handleApproveUser = useCallback(
    async (user, quotaBytes) => {
      if (!user) return;
      setAdminLoading(true);
      try {
        await approveAdminUser(
          user.id,
          quotaBytes ? { maxStorageBytes: quotaBytes } : {}
        );
        toast.success(`Approved ${user.username}`);
        await loadAdminUsers();
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Unable to approve user";
        toast.error(message);
      } finally {
        setAdminLoading(false);
      }
    },
    [loadAdminUsers]
  );

  const handleQuotaUpdate = useCallback(
    async (user, quotaBytes) => {
      if (!user) return;
      if (!quotaBytes) {
        toast.error("Enter a quota before saving");
        return;
      }
      setAdminLoading(true);
      try {
        await updateAdminQuota(user.id, { maxStorageBytes: quotaBytes });
        toast.success(`Updated quota for ${user.username}`);
        await loadAdminUsers();
      } catch (error) {
        const message =
          error?.response?.data?.error ||
          error?.response?.data?.message ||
          "Unable to update quota";
        toast.error(message);
      } finally {
        setAdminLoading(false);
      }
    },
    [loadAdminUsers]
  );

  useEffect(() => {
    localStorage.setItem("dd-view-mode", viewMode);
  }, [viewMode]);

  useEffect(() => {
    if (!selectedItem) return;
    const handler = (event) => {
      if (event.key === "Delete") {
        event.preventDefault();
        setModal({ type: "delete", item: selectedItem });
      }
      if (event.key === "Enter") {
        event.preventDefault();
        if (selectedItem.type === "folder") {
          setCurrentPrefix(selectedItem.key);
        } else {
          openPreview(selectedItem);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedItem]);

  const combinedItems = useMemo(() => [...folders, ...files], [folders, files]);
  const storageLimitBytes = sessionUser?.maxStorageBytes ?? null;
  const isAdmin = sessionUser?.role === "admin";

  const resetSelection = () => setSelectedItem(null);

  const handleNavigate = (prefix) => {
    setCurrentPrefix(prefix);
    resetSelection();
  };

  const handleFilesSelected = async (fileList) => {
    for (const file of fileList) {
      const id = createId();
      setUploads((prev) => [
        ...prev,
        {
          id,
          name: file.name,
          progress: 0,
          status: "pending",
          totalBytes: file.size,
          bytesUploaded: 0,
        },
      ]);

      const key = `${currentPrefix}${safeName(
        file.webkitRelativePath || file.name
      )}`;

      try {
        const { url } = await requestUploadUrl({
          key,
          contentType: file.type || "application/octet-stream",
          contentLength: file.size,
        });

        await axios.put(url, file, {
          headers: { "Content-Type": file.type || "application/octet-stream" },
          onUploadProgress: ({ loaded, total }) => {
            setUploads((prev) =>
              prev.map((upload) =>
                upload.id === id
                  ? {
                      ...upload,
                      progress: Math.min(
                        100,
                        Math.round(
                          ((loaded || 0) / (total || file.size || 1)) * 100
                        )
                      ),
                      bytesUploaded: loaded,
                      status: "uploading",
                    }
                  : upload
              )
            );
          },
        });

        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === id
              ? {
                  ...upload,
                  progress: 100,
                  bytesUploaded: file.size,
                  status: "done",
                }
              : upload
          )
        );
        toast.success(`${file.name} uploaded`);
      } catch (error) {
        console.error(error);
        setUploads((prev) =>
          prev.map((upload) =>
            upload.id === id
              ? {
                  ...upload,
                  status: "error",
                  progress: 0,
                  error: error.message,
                }
              : upload
          )
        );
        toast.error(`Upload failed for ${file.name}`);
      }
    }
    setTimeout(() => {
      setUploads((prev) => prev.filter((upload) => upload.status !== "done"));
    }, 4000);
    loadObjects();
    requestUsageRefresh();
  };

  const handleDownload = async (item) => {
    const toastId = toast.loading("Preparing download...");
    try {
      const { url } = await requestDownloadUrl(item.key);
      const link = document.createElement("a");
      link.href = url;
      link.download = item.name;
      link.target = "_blank";
      link.rel = "noopener";
      link.click();
      toast.success("Download ready", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Unable to download file", { id: toastId });
    }
  };

  const openPreview = async (item) => {
    const toastId = toast.loading("Generating preview...");
    try {
      const { url } = await requestDownloadUrl(item.key);
      let content = null;
      const kind = getFileType(item.key);
      if (kind === "text") {
        const response = await fetch(url);
        const text = await response.text();
        content = text.length > 80000 ? `${text.slice(0, 80000)}...` : text;
      }
      setPreview({
        name: item.name,
        url,
        size: item.size,
        kind,
        item,
        content,
      });
      toast.dismiss(toastId);
    } catch (error) {
      console.error(error);
      toast.error("Unable to preview file", { id: toastId });
    }
  };

  const handleAction = (action, item) => {
    setSelectedItem(item);
    if (action === "preview") return openPreview(item);
    if (action === "download") return handleDownload(item);
    if (action === "rename")
      return setModal({ type: "rename", item, value: item.name });
    if (action === "move")
      return setModal({ type: "move", item, value: currentPrefix });
    if (action === "delete") return setModal({ type: "delete", item });
  };

  const submitModal = async () => {
    if (!modal) return;
    try {
      if (modal.type === "rename") {
        const newName = modal.value?.trim();
        if (!newName) return toast.error("Name is required");
        await renameObject({ key: modal.item.key, newName });
        toast.success("Item renamed");
      }
      if (modal.type === "move") {
        const destination = modal.value?.trim() || "";
        await moveObject({
          sourceKey: modal.item.key,
          destinationPrefix: destination,
        });
        toast.success("Item moved");
      }
      if (modal.type === "create-folder") {
        const folderName = modal.value?.trim();
        if (!folderName) return toast.error("Folder name is required");
        await createFolder({ prefix: currentPrefix, name: folderName });
        toast.success("Folder created");
      }
      if (modal.type === "delete") {
        await deleteObject(modal.item.key);
        toast.success("Item deleted");
      }
      setModal(null);
      loadObjects();
      requestUsageRefresh();
    } catch (error) {
      console.error(error);
      toast.error("Request failed, please try again");
    }
  };

  const openFolderModal = () => setModal({ type: "create-folder", value: "" });
  const healthRefresh = () => {
    setRefreshTick((tick) => tick + 1);
    requestUsageRefresh();
  };
  const triggerUploadClick = () =>
    document.getElementById("file-upload")?.click();
  const closeControls = useCallback(() => setControlsOpen(false), []);

  if (sessionState !== "ready") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center gap-8 px-4 py-12 text-center">
          <div>
            <p className="text-sm font-semibold uppercase tracking-widest text-brand-600">
              DevDrive
            </p>
            <h1 className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">
              Personal Cloud Storage
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
              onSubmit={handleLoginSubmit}
              loading={authLoading}
              error={authError}
              onSwitchToRegister={handleSwitchToRegister}
            />
          )}

          {sessionState === "register" && (
            <RegisterCard
              onSubmit={handleRegisterSubmit}
              loading={authLoading}
              error={authError}
              onSwitchToLogin={handleSwitchToLogin}
            />
          )}

          {sessionState === "register-email-otp" && registrationContext && (
            <RegisterEmailOtpCard
              email={registrationContext.email}
              onSubmit={handleEmailOtpSubmit}
              onBack={handleSwitchToRegister}
              onResend={handleResendEmailOtp}
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
              onSubmit={handleRegisterVerify}
              onBack={handleSwitchToRegister}
              loading={authLoading}
              error={authError}
            />
          )}

          {sessionState === "mfa" && (
            <MfaCard
              onSubmit={handleMfaSubmit}
              onBack={handleMfaBack}
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
                  onClick={handleSwitchToLogin}
                >
                  Back to login
                </button>
                <button
                  type="button"
                  className="button-secondary flex-1"
                  onClick={() =>
                    toast.success("We'll notify you when approved")
                  }
                >
                  Got it
                </button>
              </div>
            </div>
          )}
        </div>
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-950`}
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <Sidebar
          onCreateFolder={openFolderModal}
          onUploadClick={() => document.getElementById("file-upload")?.click()}
          onRefresh={healthRefresh}
          onLogout={handleLogout}
          storageUsed={folderUsage.totalBytes}
          storageLoading={folderUsage.loading}
          storageLimit={storageLimitBytes}
          accountStorageUsed={accountUsage.totalBytes}
          accountStorageLoading={accountUsage.loading}
          isDarkMode={isDarkMode}
          onToggleTheme={() => setIsDarkMode((prev) => !prev)}
        />
        <main className="flex flex-1 flex-col gap-6">
          <div className="rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                  DevDrive
                </p>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
                  Personal Cloud Storage
                </h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                <Breadcrumbs
                  prefix={currentPrefix}
                  onNavigate={handleNavigate}
                />
                {isAdmin && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={() => setAdminPanelOpen(true)}
                  >
                    <FiShield /> Admin
                  </button>
                )}
                <button
                  type="button"
                  className="button-secondary lg:hidden"
                  onClick={() => setControlsOpen(true)}
                >
                  <FiSliders /> Controls
                </button>
              </div>
            </div>
          </div>

          <UploadArea onFilesSelected={handleFilesSelected} uploads={uploads} />

          <FileExplorer
            items={combinedItems}
            loading={loading}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            sortOption={sortOption}
            onSortChange={setSortOption}
            selected={selectedItem}
            onSelect={(item) => setSelectedItem(item)}
            onOpen={(item) => {
              if (item.type === "folder") {
                setCurrentPrefix(item.key);
                resetSelection();
              } else {
                openPreview(item);
              }
            }}
            onAction={handleAction}
          />
        </main>
      </div>

      <PreviewModal
        preview={preview}
        onClose={() => setPreview(null)}
        onDownload={handleDownload}
      />
      <ActionModal
        modal={modal}
        onChange={(value) => setModal((prev) => ({ ...prev, value }))}
        onClose={() => setModal(null)}
        onSubmit={submitModal}
      />
      <MobileSidebarDrawer
        open={controlsOpen}
        onClose={closeControls}
        onCreateFolder={() => {
          openFolderModal();
          closeControls();
        }}
        onUploadClick={() => {
          triggerUploadClick();
          closeControls();
        }}
        onRefresh={() => {
          healthRefresh();
          closeControls();
        }}
        onLogout={() => {
          handleLogout();
          closeControls();
        }}
        storageUsed={folderUsage.totalBytes}
        storageLoading={folderUsage.loading}
        storageLimit={storageLimitBytes}
        accountStorageUsed={accountUsage.totalBytes}
        accountStorageLoading={accountUsage.loading}
        isDarkMode={isDarkMode}
        onToggleTheme={() => setIsDarkMode((prev) => !prev)}
      />
      {isAdmin && (
        <AdminPanel
          open={adminPanelOpen}
          onClose={() => setAdminPanelOpen(false)}
          pendingUsers={adminData.pending}
          approvedUsers={adminData.approved}
          loading={adminLoading}
          onRefresh={loadAdminUsers}
          onApprove={handleApproveUser}
          onQuotaUpdate={handleQuotaUpdate}
        />
      )}
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    </div>
  );
};

export default DashboardApp;
