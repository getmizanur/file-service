# Feature 003 — Sidebar Toggle

## 🧭 Summary
This feature allows users to collapse the left sidebar to maximize the screen real estate for the main file list. It improves usability on smaller screens or when focusing on file management tasks.

---

## 🎯 Objectives
- Allow users to toggle the visibility of the sidebar text labels.
- Reduce the sidebar width significantly when collapsed.
- Maintain access to top-level navigation via icons even when collapsed.
- Persist the state (optional/future) or at least provide smooth transition.

---

## 📐 Scope

### **In Scope**
- **UI Element**: A toggle button (chevron icon) at the bottom of the sidebar.
- **CSS State**: `.sidebar-collapsed` class on the `<body>` or sidebar element.
- **Transitions**: Smooth CSS transitions for width and opacity.
- **JavaScript**: toggle logic in `admin.js`.

### **Out of Scope**
- Persistence of state across page reloads (using LocalStorage/Cookies) - *Planned for future optimization*.
- Completely hiding the sidebar (it remains as an icon rail).

---

## 🧩 Requirements

### **Functional Requirements**
- F-001: Clicking the toggle button must shrink the sidebar.
- F-002: In collapsed state, text labels must be hidden, showing only icons.
- F-003: The "New" button must adapt its layout (e.g., become a smaller square or icon-only).
- F-004: Clicking the toggle button again restores the full width.

### **Non-Functional Requirements (NFRs)**
- **Responsiveness**: The collapse action should not break the layout of the main content area (it should expand to fill the space).
- **Accessibility**: The toggle button should be keyboard accessible.

---

## 🏗️ Architecture & Design Notes

- **CSS Classes**:
    -   `.sidebar`: Default state (width ~250px).
    -   `.sidebar-collapsed`: Collapsed state (width ~60px).
    -   `.sidebar-collapsed .nav-link span`: Hidden (`display: none` or `opacity: 0`).
- **JavaScript**:
    -   Event listener on `#sidebarToggle`.
    -   Toggles class on the sidebar container.
    -   Example: `sidebar.classList.toggle('sidebar-collapsed')`.
