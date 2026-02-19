// Routes configuration for the application
// This file defines all the URL routes and their corresponding modules, controllers, and actions
// Note: The 'method' property is sometimes used for documentation but is NOT enforced by the router logic. All routes match on any HTTP method.

module.exports = {
  "routes": {
    "adminLoginIndex": {
      "route": "/admin/login",
      "module": "admin",
      "controller": "login",
      "action": "index"
    },
    "adminLoginLogout": {
      "route": "/admin/logout",
      "module": "admin",
      "controller": "login",
      "action": "logout"
    },
    "adminUserSearch": {
      "route": "/admin/user/search",
      "module": "admin",
      "controller": "rest/user-search",
      "action": "rest"
    },

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
    "adminFolderDownload": {
      "route": "/admin/folder/download",
      "module": "admin",
      "controller": "folder",
      "action": "download"
    },
    "adminFolderUpdate": {
      "route": "/admin/folder/update",
      "module": "admin",
      "controller": "rest/folder-update",
      "action": "rest"
    },
    "adminFolderStateToggle": {
      "route": "/admin/folder/state/toggle",
      "module": "admin",
      "controller": "rest/folder-state",
      "action": "rest"
    },
    "adminFolderListJson": {
      "route": "/admin/folder/list/json",
      "module": "admin",
      "controller": "rest/folder-list",
      "action": "rest"
    },
    "adminFolderStarToggle": {
      "route": "/admin/folder/star/toggle",
      "module": "admin",
      "controller": "rest/folder-star",
      "action": "toggle"
    },
    "adminFileDelete": {
      "route": "/admin/file/delete",
      "module": "admin",
      "controller": "file",
      "action": "delete"
    },
    "adminFileMove": {
      "route": "/admin/file/move",
      "module": "admin",
      "controller": "file",
      "action": "move"
    },
    "adminFileStar": {
      "route": "/admin/file/star",
      "module": "admin",
      "controller": "file",
      "action": "star"
    },
    "adminFileDownload": {
      "route": "/admin/file/download",
      "module": "admin",
      "controller": "file",
      "action": "download"
    },
    "adminFileView": {
      "route": "/admin/file/view",
      "module": "admin",
      "controller": "file",
      "action": "view"
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
    "adminFileLinkPublicCopy": {
      "route": "/admin/file/link/public-copy",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "copy"
    },
    "adminFileLinkTogglePublic": {
      "route": "/admin/file/link/toggle-public",
      "module": "admin",
      "controller": "rest/file-link",
      "action": "toggle"
    },


    "publicFileServe": {
      "route": "/p/:public_key",
      "module": "admin",
      "controller": "file",
      "action": "public-serve"
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
