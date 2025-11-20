/**
 * Provides a dark-mode toggle that syncs the dashboard theme with the OS
 * preference while persisting the choice in localStorage.
 */
import { useEffect, useState } from "react";

const useDashboardTheme = () => {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      localStorage.getItem("dd-theme")?.toLowerCase() === "dark" || prefersDark
    );
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", isDarkMode);
    document.body.classList.toggle("dark", isDarkMode);
    localStorage.setItem("dd-theme", isDarkMode ? "dark" : "light");
  }, [isDarkMode]);

  return [isDarkMode, setIsDarkMode];
};

export default useDashboardTheme;
