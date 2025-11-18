import { useRef, useState } from "react";
import { FiUploadCloud, FiFolderPlus } from "react-icons/fi";
import clsx from "clsx";
import { formatBytes } from "../utils/formatters";

const UploadArea = ({ onFilesSelected, uploads = [] }) => {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (fileList) => {
    if (!fileList?.length) return;
    onFilesSelected(Array.from(fileList));
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setIsDragging(false);
    const items = event.dataTransfer?.files;
    handleFiles(items);
  };

  return (
    <section
      className={clsx(
        "rounded-3xl border-2 border-dashed p-6 transition",
        isDragging
          ? "border-brand-400 bg-brand-50/40 dark:border-brand-400/60 dark:bg-brand-500/5"
          : "border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/60"
      )}
      onDragOver={(event) => {
        event.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
    >
      <div className="flex flex-col gap-4 rounded-2xl bg-white/80 p-6 text-center shadow-lg dark:bg-slate-900/60">
        <FiUploadCloud className="mx-auto h-12 w-12 text-brand-500" />
        <div>
          <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Upload files
          </p>
          <p className="text-sm text-slate-500">
            Drag & drop or use the quick actions below.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            className="button-primary"
            onClick={() => inputRef.current?.click()}
          >
            <FiUploadCloud /> Select files
          </button>
          <label
            className="button-secondary cursor-pointer"
            htmlFor="folder-upload"
          >
            <FiFolderPlus /> Select folder
          </label>
        </div>
        <input
          ref={inputRef}
          id="file-upload"
          type="file"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <input
          id="folder-upload"
          type="file"
          webkitdirectory="true"
          directory="true"
          multiple
          className="hidden"
          onChange={(event) => {
            handleFiles(event.target.files);
            event.target.value = "";
          }}
        />
      </div>

      {!!uploads.length && (
        <div className="mt-6 space-y-3">
          {uploads.map((upload) => (
            <div
              key={upload.id}
              className="rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/50"
            >
              <div className="flex items-center justify-between text-sm text-slate-500">
                <p className="font-medium text-slate-800 dark:text-slate-100">
                  {upload.name}
                </p>
                <span>
                  {upload.status === "error"
                    ? "Failed"
                    : upload.status === "done"
                    ? "Completed"
                    : `${Math.round(upload.progress)}%`}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div
                  className={clsx(
                    "h-full rounded-full",
                    upload.status === "error"
                      ? "bg-red-500"
                      : upload.status === "done"
                      ? "bg-emerald-500"
                      : "bg-brand-500"
                  )}
                  style={{ width: `${upload.progress}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-slate-500">
                {formatBytes(upload.bytesUploaded)} /{" "}
                {formatBytes(upload.totalBytes)}
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default UploadArea;
