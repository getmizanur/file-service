# Feature 001 — Google Drive UI

## 🧭 Summary
This feature implements a responsive, premium user interface that mimics the visual style and layout of Google Drive. It provides a familiar and intuitive environment for users to manage their files and folders, featuring a sidebar for navigation and a main content area for file listing.

---

## 🎯 Objectives
- Provide a clean, modern, and professional look and feel.
- Ensure responsive design that works across different screen sizes.
- Implement a layout with a collapsible sidebar and a main content area.
- Use Scalable Vector Graphics (SVG) for high-quality icons.

---

## 📐 Scope

### **In Scope**
- **Layout**: Master layout (`master.njk`) with specific CSS for the Admin module.
- **Styling**: Custom CSS (`admin.css`) implementing the Google Drive aesthetic (colors, spacing, typography).
- **Icons**: Replacement of FontAwesome with inline SVGs for better performance and visual fidelity.
- **Components**:
    -   Sidebar with "New" button and navigation links.
    -   Search bar in the header.
    -   "Suggested files" cards.
    -   File list table.

### **Out of Scope**
- Dark mode implementation (for now).
- Drag-and-drop file upload (UI only initially).
- Context menus (right-click actions).

---

## 🧩 Requirements

### **Functional Requirements**
- F-001: The interface must display a sidebar on the left and a main content area on the right.
- F-002: The sidebar must contain navigation links for "Home", "My Drive", "Computers", etc.
- F-003: The main area must show a list of files with details (Name, Owner, Date, Size).
- F-004: A "New" button must be prominent in the sidebar.

### **Non-Functional Requirements (NFRs)**
- **UI/UX**: Must closely resemble Google Drive's material design (light gray backgrounds, rounded corners, specific font pairings).
- **Performance**: minimal CSS footprint; usage of inline SVGs prevents extra network requests for icon fonts.

---

## 🏗️ Architecture & Design Notes

- **CSS Strategy**: Uses a dedicated `admin.css` loaded on-demand via `onDemandCss` helper to avoid bloating the global stylesheet.
- **View Structure**: Nunjucks templates `master.njk` (layout) and `list.njk` (view) separate structural concerns.
- **Assets**: SVGs are embedded directly in templates or helpers to ensure immediate rendering without FOUC (Flash of Unstyled Content).
