# Algorithm Details

## Project Listing
1. On page load, fetch all projects for the authenticated user using the `api.projects.list` query.
2. Render each project as a card with metadata (name, description, date, analysis type).

## Project Deletion
1. User clicks the "Delete" button on a project card.
2. Show a confirmation dialog to prevent accidental deletion.
3. If confirmed, call the `api.projects.remove` mutation with the project ID.
4. Backend mutation checks:
   - User is authenticated
   - User is the owner of the project
   - If checks pass, deletes the project from the database
5. On success, show a toast notification and refresh the project list.

## Backend Mutation Logic (Convex)
- Mutation: `remove`
  - Args: `{ projectId }`
  - Checks authentication and ownership
  - Calls `ctx.db.delete(projectId)` to remove the project
  - Returns `true` on success

## Real-Time Updates
- The frontend uses Convex's real-time queries, so the project list updates automatically after deletion without manual refresh.

---

## Pricing Methodologies

### Van Westendorp Price Sensitivity Meter
- **Purpose:** Identify optimal price points and acceptable price ranges based on customer perceptions.
- **Algorithm Steps:**
  1. Collect responses to four price perception questions: Too Cheap, Cheap, Expensive, Too Expensive.
  2. For each price point, calculate cumulative frequencies for each response type.
  3. Plot the cumulative curves for each response.
  4. Compute intersections:
     - **OPP (Optimal Price Point):** Intersection of "Too Cheap" and "Too Expensive" curves.
     - **IDP (Indifference Price Point):** Intersection of "Cheap" and "Expensive" curves.
     - **Acceptable Price Range:** Range between PMC and IPD points.
  5. Use these points to recommend pricing strategies.

### Gabor-Granger Technique
- **Purpose:** Estimate demand and revenue at different price points to find the revenue-maximizing price.
- **Algorithm Steps:**
  1. Present respondents with a series of price points and ask for purchase intent at each.
  2. For each price, calculate the proportion of respondents willing to buy (purchase intent).
  3. Compute expected revenue for each price: `revenue = price * purchase intent`.
  4. Identify the price point with the highest expected revenue (optimal price).
  5. Analyze purchase intent and revenue curves to inform pricing decisions. 