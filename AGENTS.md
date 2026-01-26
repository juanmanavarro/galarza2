# Repository Guidelines

## Project Structure & Module Organization
- `app/` contains the Nuxt application entry (`app.vue`) and assets.
- `app/assets/css/tailwind.css` holds Tailwind base styles and custom utilities.
- `public/` is for static files served as-is (e.g., `public/favicon.ico`).
- `nuxt.config.ts` stores Nuxt configuration.
- `tailwind.config.cjs` and `postcss.config.cjs` configure styling tools.

## Build, Test, and Development Commands
- `npm install`: installs dependencies and runs `nuxt prepare` via `postinstall`.
- `npm run dev`: starts the Nuxt dev server at `http://localhost:3000`.
- `npm run build`: builds the app for production.
- `npm run preview`: serves the production build locally.
- `npm run generate`: generates a static build (if applicable to the app).

## Coding Style & Naming Conventions
- Indentation: 2 spaces in Vue and config files.
- Keep Vue SFCs organized as `<script>`, `<template>`, `<style>` when adding sections.
- Prefer descriptive, consistent file names (e.g., `HeroBanner.vue`, `primary-nav.vue`).
- Styling: prefer FlyonUI semantic classes first, then Tailwind utilities; add global styles in `app/assets/css/tailwind.css`.

## UI Components (FlyonUI)
- Use FlyonUI as the primary UI kit: https://deepwiki.com/themeselection/flyonui
- Favor semantic class patterns (e.g., `<button class="btn btn-primary">...</button>`) for readability.
- For interactive components (accordions, dropdowns, modals), ensure the required FlyonUI JS is included per the docs.
- Keep custom component variants minimal; prefer theme/token adjustments over ad-hoc CSS.

## Testing Guidelines
- No automated test framework is configured yet.
- If you add tests, document the framework, add scripts to `package.json`, and follow the tool's default naming (e.g., `*.spec.ts`).

## Commit & Pull Request Guidelines
- No existing Git history to infer conventions.
- Use clear, imperative commit subjects (e.g., "Add hero layout").
- PRs should include: a short summary, key changes, and screenshots for UI updates.

## Security & Configuration Tips
- Keep secrets out of the repo; use environment variables and `.env` files.
- Update `nuxt.config.ts` when adding modules or runtime config.
