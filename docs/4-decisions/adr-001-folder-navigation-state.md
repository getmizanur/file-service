# Decision: Use FolderStateHelper for Root Navigation (ADR 001)
Date: 2026-02-11
Status: Accepted

## Context
The application needs to provide "Home" and "My Drive" links in the sidebar that reliably navigate the user back to their Root Folder.
We have two options for determining the Target Folder ID for these links:
1.  **Query String**: Read it from the current URL parameters (e.g., `?id=...`).
2.  **Dataset**: Read it directly from the `folderTree` data passed to the view, which represents the user's actual folder hierarchy.

## Decision
We decided to usage the **`folderTree` dataset** (via a dedicated `FolderStateHelper`) to retrieve the Root Folder ID.

## Reasoning
1.  **Reliability**: The dataset represents the source of truth for the user's folder structure as returned by the server. The URL query string is transient, mutable, and may not always be present or correct.
2.  **Reset Behavior**: The "Home" link is intended to act as a "Reset" button, taking the user back to the root directory regardless of their current location/URL state. Relying on the URL `id` (via `params('id')`) would simply reload the *current* folder, failing to provide navigation *back* to the root from a subfolder.
3.  **Separation of Concerns**: The `FolderStateHelper` encapsulates the logic of "identifying the root folder", keeping the Nunjucks template clean and independent of low-level data parsing.

## Consequences
-   The View Template (`list.njk`) utilizes the helper: `{{ url('adminIndexList', { id: folderState(folderTree) }) }}`.
-   Navigation links remain robust even if the URL parameter is missing, incorrect, or manipulated by the user.
-   The `Params` helper (`params().fromQuery(...)`) remains available for other stateless tasks (like debugging or filtering) but is **not** used for defining the primary navigation structure.
