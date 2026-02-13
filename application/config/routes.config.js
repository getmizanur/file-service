// Routes configuration for the application
// This file defines all the URL routes and their corresponding modules, controllers, and actions

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
      "controller": "file",
      "action": "upload",
      "method": "PUT"
    },
    "adminFolderUpdate": {
      "route": "/admin/folder/update",
      "module": "admin",
      "controller": "folder",
      "action": "update",
      "method": "POST"
    },
    "adminFileUpdate": {
      "route": "/admin/file/update",
      "module": "admin",
      "controller": "file",
      "action": "update",
      "method": "POST"
    }
  }
};
