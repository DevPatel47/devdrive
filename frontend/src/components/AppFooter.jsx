/**
 * Reusable footer that links back to the developer portfolio for credibility.
 */
const AppFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 px-4 text-center text-xs text-slate-500 dark:text-slate-400">
      <p>
        © {year} DevDrive. Built by{" "}
        <a
          href="https://allaboutdevpatel.com"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-brand-600 hover:underline"
        >
          Dev Patel
        </a>
        . Explore the portfolio for detailed developer insights.
      </p>
    </footer>
  );
};

export default AppFooter;
