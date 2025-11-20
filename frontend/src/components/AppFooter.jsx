/**
 * Reusable footer that links back to the developer portfolio for credibility.
 */
const AppFooter = () => {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-12 px-4 text-center text-xs text-slate-600 dark:text-neutral-300">
      <p>
        © {year} DevDrive. Built by{" "}
        <a
          href="https://allaboutdevpatel.com"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-accent-500 hover:text-accent-400"
        >
          Dev Patel
        </a>
        . Explore the portfolio for detailed developer insights.
      </p>
    </footer>
  );
};

export default AppFooter;
