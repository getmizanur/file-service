// Routes configuration for the application
// This file defines all the URL routes and their corresponding modules, controllers, and actions
// Note: The 'method' property is sometimes used for documentation but is NOT enforced by the router logic. All routes match on any HTTP method.

module.exports = {
  "routes": {
    "adminIndexList": {
      "route": "/",
      "module": "admin",
      "controller": "index",
      "action": "list"
    },
    "adminFolderCreate": {
      "route": "/admin/folder/create",
      "module": "admin",
      "controller": "folder",
      "action": "create"
    },
    "adminFolderDelete": {
      "route": "/admin/folder/delete",
      "module": "admin",
      "controller": "folder",
      "action": "delete"
    },
    "adminFolderUpdate": {
      "route": "/admin/folder/update",
      "module": "admin",
      "controller": "rest/folder-update",
      "action": "rest"
    },
    "adminFileDelete": {
      "route": "/admin/file/delete",
      "module": "admin",
      "controller": "file",
      "action": "delete"
    },
    "adminFileStar": {
      "route": "/admin/file/star",
      "module": "admin",
      "controller": "file",
      "action": "star"
    },

    "adminFileUpload": {
      "route": "/admin/file/upload",
      "module": "admin",
      "controller": "rest/file-upload",
      "action": "rest"
    },
    "adminFileUpdate": {
      "route": "/admin/file/update",
      "module": "admin",
      "controller": "rest/file-update",
      "action": "rest"
    },
    "adminFilePermissions": {
      "route": "/admin/file/permissions/:id",
      "module": "admin",
      "controller": "rest/file-permissions",
      "action": "rest"
    },

    "adminFileShare": {
      "route": "/admin/file/share",
      "module": "admin",
      "controller": "rest/file-share",
      "action": "rest"
    },
    "adminFileUnshare": {
      "route": "/admin/file/unshare",
      "module": "admin",
      "controller": "rest/file-share",
      "action": "rest"
    },

    "adminFileLinkCreate": {
      "route": "/admin/file/link/create",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "rest"
    },
    "adminFileLinkRevoke": {
      "route": "/admin/file/link/revoke",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "rest"
    },
    "adminFileLinkCopy": {
      "route": "/admin/file/link/copy",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "rest"
    },

    "publicFileLink": {
      "route": "/s/:token",
      "module": "admin",
      "controller": "file",
      "action": "public-link"
    },
    "publicFileDownload": {
      "route": "/s/:token/download",
      "module": "admin",
      "controller": "file",
      "action": "public-download"
    }
  }
};
