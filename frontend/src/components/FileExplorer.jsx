import { useMemo, useState } from "react";
import {
  FiGrid,
  FiList,
  FiSearch,
  FiSlash,
  FiDownload,
  FiEdit2,
  FiMove,
  FiTrash2,
  FiEye,
} from "react-icons/fi";
import clsx from "clsx";
import FileItem from "./FileItem";

const recentValue = (item) =>
  item.lastModified ? new Date(item.lastModified).getTime() : 0;

const sorters = {
  name: (a, b) => a.name.localeCompare(b.name),
  recent: (a, b) => recentValue(b) - recentValue(a),
  size: (a, b) => (b.size || 0) - (a.size || 0),
};

const FileExplorer = ({
  items = [],
  loading = false,
  viewMode = "grid",
  onViewModeChange,
  sortOption = "name",
  onSortChange,
  selected,
  onSelect,
  onOpen,
  onAction,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [contextMenu, setContextMenu] = useState(null);

  const filteredItems = useMemo(() => {
    const trimmed = searchTerm.trim().toLowerCase();
    const needle = trimmed || "";
    const dataset = [...items];
    dataset.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      const sorter = sorters[sortOption] || sorters.name;
      return sorter(a, b);
    });
    if (!needle) return dataset;
    return dataset.filter((entry) => entry.name.toLowerCase().includes(needle));
  }, [items, sortOption, searchTerm]);

  const menuItems = [
    {
      key: "preview",
      label: "Preview",
      icon: FiEye,
      hidden: (item) => item.type === "folder",
    },
    {
      key: "download",
      label: "Download",
      icon: FiDownload,
      hidden: (item) => item.type === "folder",
    },
    { key: "rename", label: "Rename", icon: FiEdit2 },
    { key: "move", label: "Move", icon: FiMove },
    { key: "delete", label: "Delete", icon: FiTrash2 },
  ];

  const closeContextMenu = () => setContextMenu(null);

  const handleContextMenu = (event, item) => {
    event.preventDefault();
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      item,
    });
  };

  return (
    <section className="relative flex-1 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/60">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">
          My Cloud Workspace
        </h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="group relative flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 dark:border-slate-700">
            <FiSearch className="text-slate-400" />
            <input
              type="search"
              placeholder="Search files"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-40 bg-transparent text-sm outline-none placeholder:text-slate-400"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="rounded-full bg-slate-100 p-1 text-slate-500 hover:text-brand-600 dark:bg-slate-800"
              >
                <FiSlash className="h-4 w-4" />
              </button>
            )}
          </div>
          <select
            value={sortOption}
            onChange={(event) => onSortChange(event.target.value)}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="name">Name · A → Z</option>
            <option value="recent">Recently updated</option>
            <option value="size">Size · Largest</option>
          </select>
          <div className="flex items-center gap-2 rounded-full border border-slate-200 p-1 dark:border-slate-700">
            <button
              type="button"
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                viewMode === "grid"
                  ? "bg-brand-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
              onClick={() => onViewModeChange("grid")}
            >
              <span className="flex items-center gap-2">
                <FiGrid /> Grid
              </span>
            </button>
            <button
              type="button"
              className={clsx(
                "rounded-full px-4 py-2 text-sm font-semibold transition",
                viewMode === "list"
                  ? "bg-brand-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              )}
              onClick={() => onViewModeChange("list")}
            >
              <span className="flex items-center gap-2">
                <FiList /> List
              </span>
            </button>
          </div>
        </div>
      </div>

      <div className="mt-6 min-h-[300px]">
        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-32 animate-pulse rounded-2xl border border-slate-200 bg-slate-100/70 dark:border-slate-800 dark:bg-slate-800/60"
              />
            ))}
          </div>
        ) : filteredItems.length ? (
          viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => (
                <FileItem
                  key={item.key}
                  item={item}
                  viewMode="grid"
                  isSelected={selected?.key === item.key}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onContextMenu={handleContextMenu}
                  onAction={onAction}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredItems.map((item) => (
                <FileItem
                  key={item.key}
                  item={item}
                  viewMode="list"
                  isSelected={selected?.key === item.key}
                  onSelect={onSelect}
                  onOpen={onOpen}
                  onContextMenu={handleContextMenu}
                  onAction={onAction}
                />
              ))}
            </div>
          )
        ) : (
          <div className="flex h-48 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-200 text-center text-slate-500 dark:border-slate-700">
            <p className="font-medium">No files here yet</p>
            <p className="text-sm">
              Upload files or create a new folder to get started.
            </p>
          </div>
        )}
      </div>

      {contextMenu && (
        <div>
          <button
            type="button"
            className="fixed inset-0 z-30 cursor-default"
            aria-label="Close context menu"
            onClick={closeContextMenu}
          />
          <div
            className="fixed z-40 min-w-[180px] rounded-xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
            style={{ top: contextMenu.y, left: contextMenu.x }}
          >
            {menuItems.map((menuItem) => {
              if (menuItem.hidden?.(contextMenu.item)) return null;
              return (
                <button
                  key={menuItem.key}
                  type="button"
                  onClick={() => {
                    onAction(menuItem.key, contextMenu.item);
                    closeContextMenu();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <menuItem.icon className="h-4 w-4" />
                  {menuItem.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};

export default FileExplorer;
