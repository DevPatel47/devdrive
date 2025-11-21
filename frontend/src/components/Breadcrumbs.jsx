import { Fragment } from "react";
import { FiChevronRight } from "react-icons/fi";

const breadcrumbStyles =
  "inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium transition hover:bg-slate-100 dark:hover:bg-slate-800";

/**
 * Visual navigation for moving between folder prefixes.
 * @param {{ prefix?: string, onNavigate: (path: string) => void }} props
 */
const Breadcrumbs = ({ prefix = "", onNavigate }) => {
  const segments = prefix.split("/").filter(Boolean);
  const crumbs = segments.map((segment, index) => {
    const path = `${segments.slice(0, index + 1).join("/")}/`;
    return { label: segment, path };
  });

  return (
    <nav className="flex flex-wrap items-center gap-2" aria-label="Breadcrumb">
      <button
        type="button"
        onClick={() => onNavigate("")}
        className={`${breadcrumbStyles} ${
          !segments.length
            ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
            : "text-slate-600 dark:text-slate-300"
        }`}
      >
        Home
      </button>
      {crumbs.map((crumb, index) => (
        <Fragment key={crumb.path}>
          <FiChevronRight className="text-slate-400" />
          <button
            type="button"
            onClick={() => onNavigate(crumb.path)}
            className={`${breadcrumbStyles} ${
              index === crumbs.length - 1
                ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                : "text-slate-600 dark:text-slate-300"
            }`}
          >
            {crumb.label}
          </button>
        </Fragment>
      ))}
    </nav>
  );
};

export default Breadcrumbs;
