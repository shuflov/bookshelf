# AGENTS.md

Agentic coding guidelines for the Book Identifier AI project.

## Project Overview

A React + TypeScript SPA that uses Google Gemini AI to identify books from images, and manages book collections via localStorage or Supabase cloud storage. Built with Vite, styled with Tailwind CSS (CDN), and deployed to GitHub Pages.

## Build / Lint / Test Commands

```bash
# Development server (http://localhost:5173)
npm run dev

# Production build (outputs to ./dist)
npm run build

# Preview production build locally
npm run preview
```

- **No test framework is configured.** Do not add tests unless explicitly requested.
- **No linting (ESLint) or formatting (Prettier) configuration exists.** Do not add them unless explicitly requested.
- TypeScript strictness is moderate (`skipLibCheck: true`, `noEmit: true`). Use `npm run build` (which runs `tsc`) to typecheck.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 (functional components, hooks) |
| Language | TypeScript 5 (ES2022 target) |
| Bundler | Vite 5 |
| Styling | Tailwind CSS 3 (loaded via CDN) |
| AI | Google Gemini (`@google/genai`, model: `gemini-2.5-flash`) |
| Storage | Supabase (`@supabase/supabase-js`) / browser localStorage |
| Deployment | GitHub Pages (GitHub Actions workflow in `.github/workflows/deploy.yml`) |

## Directory Structure

```
src/
  index.tsx          # React entry point
  App.tsx            # Root component, view routing, settings state
  types.ts           # Shared TypeScript interfaces and enums
  components/       # React UI components
    ActionButton.tsx
    CameraCapture.tsx
    ErrorDisplay.tsx
    FileUploader.tsx
    LibraryViewer.tsx
    Navigation.tsx
    ResultsDisplay.tsx
    Settings.tsx
    Spinner.tsx
    UploadView.tsx
  services/          # API / storage abstraction
    geminiService.ts
    localLibraryService.ts
    supabaseService.ts
  utils/
    csvHelper.ts     # CSV parsing and generation
```

## Code Style Guidelines

### Naming Conventions
- **Components**: PascalCase file and component function (e.g., `LibraryViewer.tsx`, `const LibraryViewer = ...`)
- **Services/Utils**: camelCase files and functions (e.g., `supabaseService.ts`, `uploadCsvToSupabase`)
- **Types/Interfaces**: PascalCase (e.g., `AppSettings`, `Book`)
- **Enums**: PascalCase name, SCREAMING_SNAKE_CASE members (e.g., `enum UploadState { IDLE, PROCESSING }`)
- **Variables and functions**: camelCase
- **CSS classes**: Tailwind utility classes in JSX (e.g., `className="px-4 py-2 bg-blue-600"`)

### Imports
- Always import React explicitly: `import React, { useState, useEffect } from 'react';`
- Use `import type { ... }` for type-only imports when appropriate
- Sort imports logically: React first, then third-party, then local (`'../types'`, `'./components/...'`)

### TypeScript Patterns
- Use interfaces for object shapes; use `type` for unions, primitives, and aliases
- Prefer `React.FC<Props>` for typed function components (consistent with existing codebase)
- Always annotate event handler types explicitly when needed (e.g., `React.ChangeEvent<HTMLInputElement>`)
- Use `Pick<T, K>` and `Partial<T>` utility types where appropriate
- Guard against `null` / `undefined` explicitly; avoid non-null assertions (`!`) unless certain

### React Patterns
- Use functional components with hooks throughout — class components are not used
- Memoize expensive computations with `useMemo`
- Memoize callbacks passed as props with `useCallback` when they are dependencies of other hooks
- Always specify dependencies arrays in `useEffect`, `useCallback`, and `useMemo`
- Use `React.forwardRef` for components that need to forward refs (see `ResultsDisplay.tsx`)

### Error Handling
- Wrap async operations in `try/catch` blocks
- Always extract error messages safely: `const msg = err instanceof Error ? err.message : "An unknown error occurred.";`
- Throw descriptive `Error` objects from service functions; let components catch and display them
- Never swallow errors silently — at minimum, log to `console.error`

### Tailwind CSS
- Tailwind is loaded via CDN in `index.html` — no PostCSS/Tailwind config files exist in the project root
- Use `dark` variant for dark theme elements: `bg-gray-900`, `text-gray-100`, `border-gray-700`
- Use `sm:`, `md:`, `lg:` breakpoints for responsive layouts
- Prefer Tailwind's built-in transitions: `transition-all duration-300`
- Use `focus:ring-*` for accessible focus states
- Use `disabled:opacity-50 disabled:cursor-not-allowed` for disabled states

### State Management
- Global state is minimal — `App.tsx` holds `settings` and `currentView`, passed as props
- Components own their local state via `useState`
- Use `key` prop tricks to force remounts when needed (e.g., `setLibraryRefreshKey` in `App.tsx`)

### API / Service Patterns
- Service functions are `async` and return typed results or throw `Error`
- Supabase service caches the client instance at module level (`supabaseInstance`) to avoid re-initialization
- Gemini service uses `responseSchema` for structured JSON output
- LocalStorage service wraps all access in `try/catch` and handles parse errors gracefully

### File Uploads
- Images are read as base64 via `FileReader.readAsDataURL`
- CSV files are read as text via `FileReader.readAsText`
- Accept `image/png`, `image/jpeg`, `image/webp`, `text/csv`, `text/plain` (and `.txt`)

## Adding New Features

1. New component: place in `src/components/`, export as default, import into parent
2. New service: place in `src/services/`, use `async/await`, throw typed errors
3. New utility: place in `src/utils/`, use pure functions
4. New type: add to `src/types.ts`
5. After adding dependencies, verify with `npm run build`

## CI/CD

- GitHub Actions workflow at `.github/workflows/deploy.yml` deploys to GitHub Pages on every push to `main`
- Workflow: checkout → setup Node 20 → `npm install` → `npm run build` → upload artifact → deploy
- Homepage URL: `https://shuflov.github.io/bookshelf`

## Supabase Storage

- Bucket name must be `library`
- Files are stored as CSV (one CSV per collection)
- Use `upsert: true` to create or overwrite collections
- Supabase anon key is safe to expose client-side

## Gemini API

- Model: `gemini-2.5-flash`
- Always enforce structured output via `responseMimeType: "application/json"` and `responseSchema`
- Enforce field constraints via `maxLength` on schema properties
- Use `systemInstruction` for critical rules (e.g., 5-word description limit)
- Post-process responses to enforce limits (e.g., truncate to 5 words)
- API key is stored in browser localStorage — never sent anywhere except Google's servers
