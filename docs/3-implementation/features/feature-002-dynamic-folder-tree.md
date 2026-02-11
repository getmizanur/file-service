# Feature 002 — Dynamic Folder Tree

## 🧭 Summary
This feature enables the dynamic rendering of the user's folder structure in the sidebar. It transforms a flat list of folder entities into a nested, hierarchical tree view, allowing users to navigate through their directory structure intuitively.

---

## 🎯 Objectives
- Visualise the hierarchical relationship between folders.
- Support infinite nesting depth (recursively).
- Efficiently fetch and build the tree from the database.
- Maintain the "Google Drive" look with expandable/collapsible sections.

---

## 📐 Scope

### **In Scope**
- **Data Fetching**: `IndexController` fetching folders for the logged-in user.
- **Tree Building**: Logic to convert flat database records (with `parent_id`) into a nested JSON tree.
- **Rendering**: `RenderFolderTreeHelper` to recursively generate the HTML for the sidebar menu.
- **UI**: Indentation logic to visually represent depth.

### **Out of Scope**
- Drag-and-drop reordering of folders.
- Async loading of subfolders (currently loads full tree).
- Context menus on folder tree items.

---

## 🧩 Requirements

### **Functional Requirements**
- F-001: The sidebar must display the "My Drive" folder as the root.
- F-002: Subfolders must be indented relative to their parents.
- F-003: Folders with children must have toggle capability (expand/collapse).
- F-004: Clicking a folder name should navigate to that folder (see Feature 004).

### **Non-Functional Requirements (NFRs)**
- **Performance**: Tree building must be efficient (O(n)) to handle large numbers of folders.
- **Reliability**: Broken parent references should not crash the view; orphans are handled or ignored safely.

---

## 🏗️ Architecture & Design Notes

- **Tree Builder Pattern**:
    -   Raw data is fetched via `FolderTable`.
    -   A `buildTree` function maps items by ID and assigns them to their parents' `children` array.
- **View Helper**:
    -   `RenderFolderTreeHelper` (recursive) replaces complex logic within Nunjucks macros.
    -   It handles indentation (`padding-left`) calculation based on depth.
- **Data Model**:
    -   `FolderEntity` maps to `file_service_folder` table.
    -   Key fields: `folder_id`, `parent_id`, `name`.
