import { format } from "date-fns";

export const formatBytes = (bytes = 0, decimals = 1) => {
  if (!Number(bytes)) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(dm))} ${sizes[i]}`;
};

export const formatDate = (dateInput) => {
  if (!dateInput) return "—";
  return format(new Date(dateInput), "MMM d, yyyy • HH:mm");
};

export const getFileType = (key = "") => {
  const extension = key.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(extension)) {
    return "image";
  }
  if (["mp4", "mov", "webm", "mkv"].includes(extension)) {
    return "video";
  }
  if (["mp3", "wav", "aac"].includes(extension)) {
    return "audio";
  }
  if (["pdf"].includes(extension)) {
    return "pdf";
  }
  if (
    [
      "txt",
      "md",
      "json",
      "csv",
      "log",
      "js",
      "ts",
      "py",
      "java",
      "c",
      "cpp",
    ].includes(extension)
  ) {
    return "text";
  }
  return "file";
};

export const titleCase = (value = "") =>
  value
    .split("-")
    .map((chunk) => chunk.charAt(0).toUpperCase() + chunk.slice(1))
    .join(" ");
