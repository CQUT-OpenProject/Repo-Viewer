# Repository Guidelines

## Project Structure & Module Organization

`src/` contains the application code. UI lives in `src/components/`, reusable logic in `src/hooks/`, GitHub data access in `src/services/github/`, shared helpers in `src/utils/`, and app-wide state in `src/contexts/` and `src/providers/`. Theme tokens and component styling live under `src/theme/`. Static assets and generated search index files are served from `public/`. Serverless handlers are in `api/`, while build-time generators such as `generateInitialContent.ts` and `generateDocfindIndex.ts` live in `scripts/`. Project docs and screenshots are kept in `docs/`.

## Build, Test, and Development Commands

This repo uses Vite+ (`vp`) instead of `npm run` scripts.

- `vp install` - install dependencies.
- `vp dev` - start the local development server.
- `vp build` - create a production build; also generates initial content and docfind artifacts.
- `vp check` - run the unified validation pipeline before opening a PR.
- `vp test` - run the Vitest suite.
- `vp run generate:index` - rebuild the static search index in `public/search-index/` when index-related code changes.

Copy `.env.example` to `.env` before local work.

## Coding Style & Naming Conventions

Follow `.editorconfig`: UTF-8, LF, spaces, and 2-space indentation. Keep JS/TS/TSX lines near the 100-character limit. Prefer TypeScript, functional React components, and small focused modules. Use `PascalCase` for components (`FilePreviewPage.tsx`), `camelCase` for hooks and utilities (`useRepoSearch.ts`, `hashUtils.ts`), and descriptive folder names grouped by feature. Keep comments brief and only where intent is not obvious.

## Testing Guidelines

Vitest is configured in `vite.config.ts` and currently discovers `src/**/*.test.ts` with a Node environment. Place tests next to the code they cover, mirroring the source name, for example `src/utils/sorting/contentSorting.test.ts`. Add tests for new parsing, caching, indexing, or data transformation logic; for UI-heavy changes, include manual verification notes in the PR if automated coverage is not practical.

## Commit & Pull Request Guidelines

Recent history uses short release-style subjects such as `2.0.0` and `1.4.1`. For normal contributions, prefer concise imperative commit messages and keep unrelated changes separate. Open PRs against `dev`, not `master`. Include a clear description, link related issues, list verification steps (for example `vp check` and `vp test`), and attach screenshots for visible UI changes.

## Configuration & Search Index Notes

Review `.env.example` before changing GitHub API, proxy, or search-index behavior. Search index output under `public/search-index/` is generated content; update it only when the indexing pipeline or indexed branches change.
