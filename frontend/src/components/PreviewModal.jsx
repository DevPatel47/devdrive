import { AnimatePresence, motion } from "framer-motion";
import { FiDownload, FiX } from "react-icons/fi";
import { formatBytes } from "../utils/formatters";

/**
 * Displays inline previews (image/pdf/text) with graceful fallbacks.
 * @param {{ preview: null | { kind: string, url: string, name: string, size: number, item: object }, onClose: () => void, onDownload: (item: object) => void }} props
 */
const PreviewModal = ({ preview, onClose, onDownload }) => {
  if (!preview) return null;

  /** Renders body content according to preview.kind. */
  const renderBody = () => {
    if (preview.kind === "image") {
      return (
        <img
          src={preview.url}
          alt={preview.name}
          className="max-h-[70vh] w-full rounded-2xl object-contain"
          loading="lazy"
        />
      );
    }

    if (preview.kind === "pdf") {
      return (
        <iframe
          title={preview.name}
          src={preview.url}
          className="h-[70vh] w-full rounded-2xl border border-slate-200"
        />
      );
    }

    if (preview.kind === "text") {
      return (
        <pre className="max-h-[70vh] overflow-auto rounded-2xl bg-slate-900/90 p-6 text-sm text-slate-100">
          {preview.content || "Unable to render preview"}
        </pre>
      );
    }

    return (
      <div className="flex h-60 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 text-center text-slate-500">
        <p className="text-lg font-semibold">Preview unavailable</p>
        <p className="text-sm">Download the file to view it.</p>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="glass-card w-full max-w-4xl rounded-3xl p-6"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {preview.name}
              </p>
              <p className="text-sm text-slate-500">
                {formatBytes(preview.size)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                className="button-secondary"
                onClick={onClose}
              >
                <FiX /> Close
              </button>
              <button
                type="button"
                className="button-primary"
                onClick={() => onDownload(preview.item)}
              >
                <FiDownload /> Download
              </button>
            </div>
          </div>
          <div className="mt-6">{renderBody()}</div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PreviewModal;
