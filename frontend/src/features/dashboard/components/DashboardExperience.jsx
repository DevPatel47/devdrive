/**
 * Renders the authenticated dashboard shell while delegating behavioral logic
 * to the parent container. Accepts fully shaped props for each widget so that
 * presentation stays isolated from business logic.
 * @param {object} props
 */
import { FiShield, FiSliders } from "react-icons/fi";
import Breadcrumbs from "../../../components/Breadcrumbs";
import Sidebar, { MobileSidebarDrawer } from "../../../components/Sidebar";
import UploadArea from "../../../components/UploadArea";
import FileExplorer from "../../../components/FileExplorer";
import PreviewModal from "../../../components/PreviewModal";
import AdminPanel from "../../../components/AdminPanel";
import ActionModal from "./ActionModal";
import AppFooter from "../../../components/AppFooter";
import HowDevDriveWorksModal from "../../../components/HowDevDriveWorksModal";

const DashboardExperience = ({
  sidebarProps,
  headerProps,
  uploadAreaProps,
  fileExplorerProps,
  previewModalProps,
  actionModalProps,
  mobileDrawerProps,
  adminPanelProps,
  showAdminPanel,
  howItWorksModalProps,
}) => {
  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-brand-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-8 lg:flex-row">
        <Sidebar {...sidebarProps} />
        <main className="flex flex-1 flex-col gap-6">
          <div className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm dark:border-brand-800 dark:bg-brand-900/80">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wider text-brand-600">
                  DevDrive
                </p>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-neutral-50">
                  Secure Cloud Storage Platform
                </h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between lg:justify-end">
                <Breadcrumbs {...headerProps.breadcrumbs} />
                {headerProps.isAdmin && (
                  <button
                    type="button"
                    className="button-secondary"
                    onClick={headerProps.onOpenAdminPanel}
                  >
                    <FiShield /> Admin
                  </button>
                )}
                <button
                  type="button"
                  className="button-secondary lg:hidden"
                  onClick={headerProps.onOpenControls}
                >
                  <FiSliders /> Controls
                </button>
              </div>
            </div>
          </div>

          <UploadArea {...uploadAreaProps} />

          <FileExplorer {...fileExplorerProps} />
        </main>
      </div>

      <PreviewModal {...previewModalProps} />
      <ActionModal {...actionModalProps} />
      <MobileSidebarDrawer {...mobileDrawerProps} />
      {showAdminPanel && <AdminPanel {...adminPanelProps} />}
      <AppFooter />
      <HowDevDriveWorksModal {...howItWorksModalProps} />
    </div>
  );
};

export default DashboardExperience;
