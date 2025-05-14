# Pricing Analysis Tool

A comprehensive pricing analysis application that helps businesses determine optimal pricing strategies using Van Westendorp and Gabor-Granger methodologies.

## Features

### Van Westendorp Price Sensitivity Analysis
- Determine optimal price points through customer price sensitivity
- Calculate key metrics:
  - Optimal Price Point (OPP)
  - Indifference Price Point (IDP)
  - Price Marginal Cheapness (PMC)
  - Acceptable Price Range
- Visualize price sensitivity curves
- Segment analysis by customer demographics

### Gabor-Granger Analysis
- Revenue optimization through purchase intent analysis
- Key metrics:
  - Revenue-maximizing price point
  - Purchase intent at different price levels
  - Price sensitivity range
  - Maximum revenue potential
- Segment-specific insights
- Revenue forecasting capabilities

### Data Export & Visualization
- Export results in multiple formats:
  - CSV for raw data analysis
  - PNG for chart images
  - PPTX for presentations
- Interactive charts and graphs
- Comprehensive insight cards with actionable metrics

## Technical Stack

- Frontend: React + Vite
- Backend: Convex
- Authentication: Convex Auth
- Data Visualization: Chart.js
- Presentation Export: PptxGenJS

## Getting Started

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at http://localhost:5173

## Project Structure

- `src/` - Frontend React application
  - `components/` - React components
  - `pages/` - Application pages
- `convex/` - Backend Convex functions and schema
  - `schema.ts` - Database schema
  - `analysis.ts` - Analysis functions
  - `projects.ts` - Project management

## Development

The application uses Convex for real-time data management and authentication. Key development files:

- `convex/schema.ts` - Define your data models
- `convex/analysis.ts` - Implement analysis logic
- `src/components/` - Build and modify UI components

## Deployment

The application is configured for easy deployment through Convex. The current deployment is connected to [`limitless-caiman-218`](https://dashboard.convex.dev/d/limitless-caiman-218).

For deployment instructions, refer to the [Convex Deployment Documentation](https://docs.convex.dev/production/).

## Backend Data Model & Analysis Logic
- The backend (Convex) strictly enforces schema validation for all analysis results.
- Van Westendorp analysis results include:
  - `data`: Price sensitivity curve data
  - `metrics`: Key points (OPP, IDP, PMC, IPD)
  - `range`: Acceptable price range
  - `optimal`: The optimal price point (OPP)
- Any extra fields not defined in the schema will be rejected by the backend.
- Gabor-Granger analysis is unchanged.
