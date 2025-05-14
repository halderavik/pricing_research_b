# API Documentation

## Project Management

### List Projects
- **Endpoint:** `api.projects.list`
- **Type:** Query
- **Description:** Returns all projects for the authenticated user.
- **Returns:** Array of project objects

### Create Project
- **Endpoint:** `api.projects.create`
- **Type:** Mutation
- **Args:**
  - `name` (string): Project name
  - `description` (string): Project description
  - `analysisType` (string): Analysis type (e.g., 'van_westendorp', 'gabor_granger')
- **Returns:** Project ID

### Delete Project
- **Endpoint:** `api.projects.remove`
- **Type:** Mutation
- **Args:**
  - `projectId` (Id<'projects'>): The ID of the project to delete
- **Returns:** `true` on success
- **Authorization:** Only the project owner can delete

### Get Project
- **Endpoint:** `api.projects.get`
- **Type:** Query
- **Args:**
  - `projectId` (Id<'projects'>): The ID of the project
- **Returns:** Project object or null

## Analysis Results (Van Westendorp)
- **Endpoint:** `api.analysis.saveVanWestendorpResults`
- **Type:** Mutation
- **Args:**
  - `projectId` (Id<'projects'>): Project ID
  - `data`: Array of price sensitivity curve points
  - `metrics`: Object with OPP, IDP, PMC, IPD
  - `range`: Acceptable price range (array of two numbers)
- **Note:**
  - The backend sets the `optimal` field (OPP) automatically.
  - Any extra fields not defined in the schema will be rejected.

## Notes
- All endpoints require authentication.
- Real-time updates are provided via Convex queries. 