# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Map Admin: Interactive Location Builder** is a client-side React/TypeScript application for creating interactive map-based tours with rich media and quizzes. Users can click on a Leaflet map to add location pins, enrich them with descriptions, media URLs, and quiz questions, then export/import the data as JSON. All data is stored in browser localStorage.

## Commands

### Development
```bash
pnpm dev              # Start development server on http://localhost:3000
pnpm build            # Build for production
pnpm preview          # Preview production build
```

## Environment Variables

The application requires a Google Gemini API key for AI-powered description generation:
- Create a `.env` file in the project root
- Add: `GEMINI_API_KEY=your_api_key_here`
- The Vite config exposes this as `process.env.API_KEY` and `process.env.GEMINI_API_KEY`

## Architecture

### Core Data Flow

1. **State Management**: Main app state lives in `App.tsx` with locations stored in `useState` and synced to localStorage
2. **Location Creation**: User clicks map → reverse geocoding fetches country → form filled → location saved to state and localStorage
3. **Data Persistence**: All locations are validated via `validateLocationsData()` before save/load to prevent corruption

### Key Components

- **App.tsx**: Central state container managing locations array, map view state, editing mode, and all data operations (CRUD, import/export)
- **MapComponent**: Leaflet map wrapper displaying location markers and handling click events
- **LocationForm**: Complex form with Quill.js rich text editor for descriptions, media URL inputs, and dynamic quiz builder. Uses Google Gemini API for AI description generation
- **LocationsList**: Drag-and-drop sortable list using `@dnd-kit` for reordering locations
- **MapSearchControl**: Nominatim search with autocomplete suggestions

### Context & Internationalization

**LanguageContext** (`contexts/LanguageContext.tsx`):
- Manages `en`/`ar` language toggle stored in localStorage
- Provides `t()` function for translations with placeholder replacement
- Controls document `dir` and `lang` attributes for RTL support
- Import via `useLanguage()` hook

### Types

**Location** (`types.ts`):
- Core data structure with `id`, `title`, `country`, `description`, `image`, optional `video`/`audio`, `coordinates` (LatLngTuple), optional `questions` array, optional `block_navigation`
- Questions have `id`, `text`, `type` (short_answer/true_false/multiple_choice), optional `options` array, and `answer`

### External Dependencies

- **Quill.js**: Loaded via CDN script tag in `index.html`, not npm package. Global `Quill` variable accessed via `declare const Quill: any`
- **Nominatim API**: Used for geocoding/reverse geocoding and search functionality
- **Google Gemini API**: AI description generation in LocationForm

### State Synchronization Pattern

When modifying locations array:
```typescript
setLocations(prevLocations => {
  const updatedLocations = /* modifications */;
  updateStoredLocations(updatedLocations); // Sync to localStorage
  return updatedLocations;
});
```

### Editing Flow

- Clicking edit on a location sets `editingLocation` state, populates form, centers map on location
- Form shows "Update Location" button instead of "Add Location"
- Cancel button clears editing state and form
- Map clicks during edit mode update the coordinates for the edited location

### Import/Export

- Export creates `locations.json` blob download
- Import validates entire JSON structure via `validateLocationsData()` before accepting
- Import confirmation dialog warns user that current data will be replaced
