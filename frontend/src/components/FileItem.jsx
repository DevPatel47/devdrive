import clsx from "clsx";
import {
  FiDownload,
  FiEdit2,
  FiFileText,
  FiFolder,
  FiImage,
  FiLoader,
  FiMove,
  FiTrash2,
} from "react-icons/fi";
import { formatBytes, formatDate, getFileType } from "../utils/formatters";

const iconByType = {
  folder: FiFolder,
  image: FiImage,
  text: FiFileText,
  file: FiFileText,
};

const FileItem = ({
  item,
  viewMode = "grid",
  isSelected = false,
  onSelect,
  onOpen,
  onContextMenu,
  onAction,
  disabled = false,
}) => {
  const fileType = item.type === "folder" ? "folder" : getFileType(item.key);
  const Icon = iconByType[fileType] || FiFileText;
  const isFolder = item.type === "folder";
  const folderItemCount = isFolder ? item.children ?? item.objectCount ?? 0 : 0;
  const folderItemsLabel = `${folderItemCount} ${
    folderItemCount === 1 ? "item" : "items"
  }`;
  const folderSizeLabel = formatBytes(item.size || 0);
  const folderMetaLabel = `${folderItemsLabel} • ${folderSizeLabel}`;
  const fileMetaLabel = `${formatBytes(item.size)} • ${formatDate(
    item.lastModified
  )}`;

  const actions = [
    {
      key: "download",
      label: "Download",
      icon: FiDownload,
      hidden: item.type === "folder",
    },
    { key: "rename", label: "Rename", icon: FiEdit2 },
    { key: "move", label: "Move", icon: FiMove },
    { key: "delete", label: "Delete", icon: FiTrash2 },
  ].filter((action) => !action.hidden);

  const handleDoubleClick = () => {
    if (disabled) return;
    if (item.type === "folder") {
      onOpen(item);
    } else {
      onAction("preview", item);
    }
  };

  const shouldOpenOnTap = () =>
    typeof window !== "undefined" &&
    window.matchMedia("(pointer: coarse)").matches;

  const handleClick = () => {
    if (disabled) return;
    onSelect(item);
    if (item.type === "folder" && shouldOpenOnTap()) {
      onOpen(item);
    }
  };

  const renderActions = () => (
    <div className="flex items-center gap-1">
      {actions.map((action) => (
        <button
          key={action.key}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onAction(action.key, item);
          }}
          title={action.label}
          className="rounded-full border border-transparent p-1.5 text-slate-500 hover:border-slate-200 hover:bg-white hover:text-brand-600 dark:hover:border-slate-700 dark:hover:bg-slate-800"
        >
          <action.icon className="h-4 w-4" />
        </button>
      ))}
    </div>
  );

  const handleKeyDown = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleDoubleClick();
    }
    if (event.key === " ") {
      event.preventDefault();
      onSelect(item);
    }
  };

  if (viewMode === "list") {
    return (
      <div
        role="button"
        tabIndex={0}
        className={clsx(
          "group grid gap-y-3 rounded-xl px-4 py-3 text-left transition sm:grid-cols-12",
          isSelected
            ? "bg-brand-50 text-brand-900 dark:bg-brand-500/10 dark:text-brand-100"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={(event) => onContextMenu(event, item)}
        onKeyDown={handleKeyDown}
      >
        <div className="order-1 col-span-12 flex items-start gap-3 sm:col-span-5 sm:items-center">
          <span
            className={clsx(
              "flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border text-xl",
              isSelected
                ? "border-brand-200 bg-brand-100 text-brand-700"
                : "border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-900"
            )}
          >
            <Icon />
          </span>
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900 dark:text-slate-100">
              {item.name}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 sm:hidden">
              {isFolder ? folderMetaLabel : fileMetaLabel}
            </p>
          </div>
        </div>
        <p className="order-2 col-span-6 hidden text-sm text-slate-500 dark:text-slate-400 sm:order-2 sm:col-span-2 sm:block sm:text-left">
          {isFolder ? folderMetaLabel : formatBytes(item.size)}
        </p>
        <p className="order-3 col-span-6 text-right text-sm text-slate-500 sm:order-3 sm:col-span-3 sm:text-left dark:text-slate-400 hidden sm:block">
          {formatDate(item.lastModified)}
        </p>
        <div className="order-4 col-span-12 flex justify-start sm:order-4 sm:col-span-2 sm:justify-end">
          {renderActions()}
        </div>
      </div>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      className={clsx(
        "group flex flex-col rounded-2xl border p-4 text-left transition",
        isSelected
          ? "border-brand-200 bg-brand-50 text-brand-900 dark:border-brand-400/30 dark:bg-brand-500/10"
          : "border-slate-200 bg-white hover:border-brand-200 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/60"
      )}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(event) => onContextMenu(event, item)}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-center justify-between">
        <span
          className={clsx(
            "flex h-12 w-12 items-center justify-center rounded-2xl border text-2xl",
            isSelected
              ? "border-brand-200 bg-brand-100 text-brand-700"
              : "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800"
          )}
        >
          <Icon />
        </span>
        {renderActions()}
      </div>
      <div className="mt-4 space-y-1">
        <p className="font-semibold text-slate-900 dark:text-slate-100">
          {item.name}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {isFolder ? folderMetaLabel : formatBytes(item.size)}
        </p>
      </div>
    </div>
  );
};

export default FileItem;
