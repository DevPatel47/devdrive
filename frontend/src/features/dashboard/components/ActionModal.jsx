/**
 * Generic modal for renaming, moving, creating, or deleting S3 objects.
 * Keeps the dashboard container lean by housing the shared presentation logic.
 */
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

export default ActionModal;
