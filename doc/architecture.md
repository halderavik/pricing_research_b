# Architecture Overview

## System Diagram

```mermaid
flowchart TD
    subgraph Frontend [Frontend (React + Vite)]
        A[App.tsx / Landing Page]
        B[ProjectList.tsx]
        C[ProjectWizard.tsx]
        D[Results.tsx]
    end
    subgraph Backend [Backend (Convex)]
        E[projects.ts\n(CRUD, remove)]
        F[analysis.ts\n(Analysis logic)]
        G[schema.ts\n(DB Schema)]
    end
    subgraph Database
        H[(Convex Database)]
    end

    A --> B
    A --> C
    C --> D
    B <--> |"api.projects.list, remove"| E
    C <--> |"api.projects.create"| E
    D <--> |"api.analysis.getResults"| F
    E <--> |"projects table"| H
    F <--> |"analysis tables"| H
    G -.-> H
```

## Project Structure

- **Frontend**: React (Vite)
  - `src/components/ProjectList.tsx`: Displays all projects for the logged-in user, allows deletion, and shows project metadata.
  - `src/components/ProjectWizard.tsx`: Handles project creation and onboarding flow.
  - `src/components/Results.tsx`: Displays analysis results and export options.
- **Backend**: Convex
  - `convex/projects.ts`: Handles project CRUD operations (create, list, get, delete).
  - `convex/analysis.ts`: Runs pricing analyses and stores results.
  - `convex/schema.ts`: Defines database schema for projects, files, and analysis settings.

## ProjectList Component
- Fetches the user's projects using `api.projects.list` (Convex query).
- Renders each project in a card with name, description, date, and analysis type.
- Provides a "Delete" button for each project, which:
  - Shows a confirmation dialog
  - Calls the `api.projects.remove` mutation
  - Refreshes the list on success
- Uses `toast` notifications for user feedback.

## Data Flow
1. User logs in and lands on the dashboard.
2. `ProjectList` fetches and displays all projects for the user.
3. User can delete a project, which updates the backend and UI in real time.

## Security
- Only the project owner can delete their projects (enforced in backend mutation).
- All project queries and mutations require authentication.

## Extensibility
- The ProjectList can be extended to support project editing, archiving, or sharing.
- The backend is modular, with each resource (projects, analysis, files) in its own file. 