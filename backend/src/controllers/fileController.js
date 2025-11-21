import listFiles from "./files/listFiles.js";
import createUploadUrlController from "./files/createUploadUrl.js";
import createDownloadUrlController from "./files/createDownloadUrl.js";
import deleteObjectController from "./files/deleteObject.js";
import createFolderController from "./files/createFolder.js";
import renameObjectController from "./files/renameObject.js";
import moveObjectController from "./files/moveObject.js";

/**
 * Collects all file-related HTTP handlers so routes can import a single module.
 */

export {
  listFiles,
  createUploadUrlController,
  createDownloadUrlController,
  deleteObjectController,
  createFolderController,
  renameObjectController,
  moveObjectController,
};

export default {
  listFiles,
  createUploadUrlController,
  createDownloadUrlController,
  deleteObjectController,
  createFolderController,
  renameObjectController,
  moveObjectController,
};
