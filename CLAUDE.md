# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Personal website / blog built with Create React App (CRA) and React 19, deployed to GitHub Pages at `https://wkchiuea.github.io/my-page`. Content is file-based: articles are authored as markdown files in the repo and turned into a fetchable manifest at build time.

## Commands

- `npm start` — run dev server (http://localhost:3000)
- `npm run build` — production build. `prebuild` automatically runs `generate-articles` first
- `npm test` — run tests in watch mode (CRA / Jest + React Testing Library)
- `npm test -- --watchAll=false` — run all tests once (CI mode)
- `npm test -- src/App.test.js` — run a single test file
- `npm run generate-articles` — regenerate `public/articles.json` and copy `.md` files to `public/articles/`. Run this after adding or editing any article so the dev server sees changes
- `npm run deploy` — build + postbuild + push to `gh-pages` branch via `gh-pages` CLI

Note: pushing to `main` also triggers `.github/workflows/deploy-pages.yml`, which builds and deploys to GitHub Pages independently of `npm run deploy`.

## Architecture

**Routing.** `src/App.js` defines all routes with `react-router-dom`. The `Router` uses `basename={process.env.PUBLIC_URL}` so paths work under the `/my-page` GitHub Pages subpath. `ScrollToTop` resets scroll on navigation. Layout is a two-column flex: routed page in `.left-column`, persistent `Sidebar` in `.right-column`. `SidebarContext` (`src/context/`) shares sidebar visibility globally.

**Article pipeline (build-time manifest + runtime fetch).** This is the core data flow:
1. Articles live as markdown with YAML frontmatter (`title`, `date`, `category`, `tag`, `image`) under `src/assets/articles/YYYY/MM/YYYYMMDD.md`. The filename (without `.md`) is the article `id`.
2. `scripts/generate-articles.js` scans that tree, parses frontmatter + a plain-text excerpt, writes `public/articles.json` (sorted by date desc), and copies each `.md` into `public/articles/{id}.md`.
3. At runtime, `src/api/articles.js` fetches `articles.json` for the list (`ArticleList`) and `articles/{id}.md` for a single article (`ArticlePage`).

`public/articles.json` and `public/articles/*.md` are **generated artifacts** — don't edit them by hand; edit the source `.md` under `src/assets/articles` and rerun `generate-articles`. Use `src/assets/template/ArticleTemplate.md` as the starting point for new articles.

Note: frontmatter parsing logic is duplicated in both `scripts/generate-articles.js` and `src/api/articles.js` (build vs. runtime). Keep them in sync if you change the frontmatter format. See `docs/articles-approach.md` for why this build-script approach was chosen over loader-based alternatives.

**Custom markdown rendering.** `ArticlePage.js` renders article bodies with a hand-written line-by-line parser (`formatContent` / `renderInlineMarkdown`) — not a markdown library. It supports `##`/`###` headings, `**bold**`, `*italic*`, fenced code blocks (highlighted via `react-syntax-highlighter` with the `vscDarkPlus` Prism theme), and paragraphs. Extending markdown support means editing this parser directly.

**Tools.** `src/components/page/tools/` holds standalone interactive tools (SpeedReader, Metronome, Timer, Timetable), each routed under `/tools/*`. `PlaceholderPage` backs not-yet-built routes (Projects, Category, Flash Number).

**Site config.** `src/config/config.json` holds non-article content: sidebar social links and the About page data (skills, certifications, languages). Edit here rather than hardcoding in components.

## GitHub Pages specifics

- `homepage` in `package.json` sets the base path; changing the repo name means updating it.
- `scripts/postbuild-gh-pages.js` copies `build/index.html` to `build/404.html` (so client-side routes resolve on refresh) and writes `build/.nojekyll` (so Pages serves `.md` files and doesn't run Jekyll). This must run after every build that gets deployed.

## Notes

- `docs/` is gitignored (local design notes) but useful background — `articles-approach.md`, `timetable-tool.md`, `about-page.md`, `github-pages-deploy.md`.
- Standard CRA setup; ESLint config is `react-app` / `react-app/jest` in `package.json`. No separate lint script — lint runs as part of `npm start` / `npm run build`.
