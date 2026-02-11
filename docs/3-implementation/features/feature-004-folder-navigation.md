# Feature 004 — Folder Navigation

## 🧭 Summary
This feature enables users to navigate through their folder hierarchy by clicking on folders in the sidebar or "My Drive". It updates the main file list to show the contents of the selected folder.

---

## 🎯 Objectives
- Enable deep navigation into subfolders.
- Update the URL to reflect the current folder state (`?id=...`).
- Provide a "Home" or "Root" link to easily return to the top level.
- Ensure the file list acts as the single source of truth for the current folder's content.

---

## 📐 Scope

### **In Scope**
- **URL Structure**: usage of query parameter `?id={folderId}` to maintain state.
- **Backend Logic**: `IndexController` reads the ID and fetches respective metadata.
- **View Helpers**: 
    -   `FolderStateHelper`: Determines the Root ID for "Home" links.
    -   `Params`: Accesses query parameters in views.
    -   `Url`: Generates dynamic links with query strings.
- **UI**: Sidebar folder names are clickable links; Caret icons remain as toggles for the tree view.

### **Out of Scope**
- Breadcrumb navigation (crumb trail) - *Planned for future feature*.
- History API (pushState) for navigation without full page reload.

---

## 🧩 Requirements

### **Functional Requirements**
- F-001: Clicking a folder name in the tree navigates to `/?id={folderId}`.
- F-002: Clicking "Home" or "My Drive" navigates to the Root Folder ID.
- F-003: The file list must update to show only files/folders with `parent_id` matching the current selection.
- F-004: If no ID is provided, it defaults to the Root Folder.

### **Non-Functional Requirements (NFRs)**
- **Stability**: Navigation links should work even if the folder tree is deep.
- **Separation**: Navigation (click) and Expansion (toggle) must be distinct actions to avoid UX confusion.

---

## 🏗️ Architecture & Design Notes

- **ADR 001**: Decision to usage `FolderStateHelper` to retrieve the Root ID from the dataset instead of relying on the current URL query string.
- **Helpers**:
    -   `Params`: Used to check current state.
    -   `Url`: Enhanced to append unused parameters as query strings.
- **Controller**:
    -   `IndexController::indexAction`:
        -   `$currentFolderId = $request->getQuery('id', $rootId);`
        -   Passes `$filesList` filtered by this ID to the view.
