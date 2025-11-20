import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import AuthExperience from "./components/AuthExperience";
import DashboardExperience from "./components/DashboardExperience";
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
import useDashboardTheme from "./hooks/useDashboardTheme";
import { safeName, createId } from "./utils/objectUtils";

/**
 * High-level container that wires auth state, storage tooling, and admin flows
 * into presentational components so the UI remains showcase-ready.
 */
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
  const [isDarkMode, setIsDarkMode] = useDashboardTheme();
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
  const [howItWorksOpen, setHowItWorksOpen] = useState(false);

  const toggleTheme = useCallback(
    () => setIsDarkMode((prev) => !prev),
    [setIsDarkMode]
  );

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

  const openHowItWorks = useCallback(() => setHowItWorksOpen(true), []);
  const closeHowItWorks = useCallback(() => setHowItWorksOpen(false), []);

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

  const handleOpenItem = (item) => {
    if (item.type === "folder") {
      setCurrentPrefix(item.key);
      resetSelection();
      return;
    }

    openPreview(item);
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
  const openControls = useCallback(() => setControlsOpen(true), []);

  if (sessionState !== "ready") {
    return (
      <>
        <AuthExperience
          sessionState={sessionState}
          sessionUser={sessionUser}
          authLoading={authLoading}
          authError={authError}
          resendLoading={resendLoading}
          registrationContext={registrationContext}
          onLoginSubmit={handleLoginSubmit}
          onRegisterSubmit={handleRegisterSubmit}
          onEmailOtpSubmit={handleEmailOtpSubmit}
          onResendEmailOtp={handleResendEmailOtp}
          onRegisterVerify={handleRegisterVerify}
          onMfaSubmit={handleMfaSubmit}
          onMfaBack={handleMfaBack}
          onSwitchToRegister={handleSwitchToRegister}
          onSwitchToLogin={handleSwitchToLogin}
          howItWorksOpen={howItWorksOpen}
          onOpenHowItWorks={openHowItWorks}
          onCloseHowItWorks={closeHowItWorks}
        />
        <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
      </>
    );
  }

  const sidebarProps = {
    onCreateFolder: openFolderModal,
    onUploadClick: triggerUploadClick,
    onRefresh: healthRefresh,
    onLogout: handleLogout,
    storageUsed: folderUsage.totalBytes,
    storageLoading: folderUsage.loading,
    storageLimit: storageLimitBytes,
    accountStorageUsed: accountUsage.totalBytes,
    accountStorageLoading: accountUsage.loading,
    isDarkMode,
    onToggleTheme: toggleTheme,
  };

  const headerProps = {
    breadcrumbs: {
      prefix: currentPrefix,
      onNavigate: handleNavigate,
    },
    isAdmin,
    onOpenAdminPanel: () => setAdminPanelOpen(true),
    onOpenControls: openControls,
  };

  const uploadAreaProps = {
    onFilesSelected: handleFilesSelected,
    uploads,
  };

  const fileExplorerProps = {
    items: combinedItems,
    loading,
    viewMode,
    onViewModeChange: setViewMode,
    sortOption,
    onSortChange: setSortOption,
    selected: selectedItem,
    onSelect: (item) => setSelectedItem(item),
    onOpen: handleOpenItem,
    onAction: handleAction,
  };

  const previewModalProps = {
    preview,
    onClose: () => setPreview(null),
    onDownload: handleDownload,
  };

  const actionModalProps = {
    modal,
    onChange: (value) => setModal((prev) => ({ ...prev, value })),
    onClose: () => setModal(null),
    onSubmit: submitModal,
  };

  const mobileDrawerProps = {
    open: controlsOpen,
    onClose: closeControls,
    onCreateFolder: () => {
      openFolderModal();
      closeControls();
    },
    onUploadClick: () => {
      triggerUploadClick();
      closeControls();
    },
    onRefresh: () => {
      healthRefresh();
      closeControls();
    },
    onLogout: () => {
      handleLogout();
      closeControls();
    },
    storageUsed: folderUsage.totalBytes,
    storageLoading: folderUsage.loading,
    storageLimit: storageLimitBytes,
    accountStorageUsed: accountUsage.totalBytes,
    accountStorageLoading: accountUsage.loading,
    isDarkMode,
    onToggleTheme: toggleTheme,
  };

  const adminPanelProps = {
    open: adminPanelOpen,
    onClose: () => setAdminPanelOpen(false),
    pendingUsers: adminData.pending,
    approvedUsers: adminData.approved,
    loading: adminLoading,
    onRefresh: loadAdminUsers,
    onApprove: handleApproveUser,
    onQuotaUpdate: handleQuotaUpdate,
  };

  const howItWorksModalProps = {
    open: howItWorksOpen,
    onClose: closeHowItWorks,
  };

  return (
    <>
      <DashboardExperience
        sidebarProps={sidebarProps}
        headerProps={headerProps}
        uploadAreaProps={uploadAreaProps}
        fileExplorerProps={fileExplorerProps}
        previewModalProps={previewModalProps}
        actionModalProps={actionModalProps}
        mobileDrawerProps={mobileDrawerProps}
        adminPanelProps={adminPanelProps}
        showAdminPanel={isAdmin}
        howItWorksModalProps={howItWorksModalProps}
      />
      <Toaster position="bottom-right" toastOptions={{ duration: 3000 }} />
    </>
  );
};

export default DashboardApp;
