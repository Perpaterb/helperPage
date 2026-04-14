# HelperPage

A self-hosted browser start page that replaces bookmarks, sticky notes and task lists with a single drag-and-drop board. A static React app — no backend, no accounts, everything lives in your browser's localStorage.

Live at: **https://perpaterb.github.io/helperPage/**

## Features

- **Slot-based grid** — items snap to a responsive grid that grows in groups of 3 slots (6–30) as the window widens. Each width remembers its own layout so resizing restores positions automatically.
- **Five item types**
  - **Button** — a coloured link tile that opens a URL in a new tab. Optional auto-favicon.
  - **To-do list** — a checklist with inline add/delete/toggle. In edit mode, drag entries to reorder.
  - **Notes** — a full Markdown editor with a formatting toolbar (headings, bold, italic, code blocks, tables, callouts, highlights) and a live GFM preview. Export any note as `.md`.
  - **Folder** — a see-through container whose header is draggable; items that sit within the folder body move along with it.
  - **Sketch** — a freehand SVG drawing pad with adjustable pen colour and size.
- **Tabs** — each tab has a completely separate board. Add, rename, colour, reorder (drag in the burger menu) and delete tabs. Move an item between tabs from its edit popup.
- **Edit mode** — long-press the margin (or any empty slot) to toggle. Drag items, corner-handle resize, and per-item edit/delete popups.
- **Per-theme colours** — every item and tab stores separate light and dark background colours. Colour picker (hue/saturation plane, hex input, swatch presets) is built into every edit popup.
- **Dark mode** — toggle via the sun/moon switch in the top bar. Colours auto-invert for items that haven't been customised in the current theme.
- **Search** — filters items in-place, repacking matches upward. To-do entries that don't match fade; Notes highlights matching text.
- **Mobile support** — touch drag and resize work on phones; slot size is automatically 30% smaller on touch-only devices.
- **Import / Export** — full JSON backup of every item, position, size, width-memory layout, tab and preference.

## Development

Requirements: Node 20+

```bash
git clone https://github.com/Perpaterb/helperPage.git
cd helperPage
npm install
npm run dev          # local dev server
npm run build        # production build in dist/
npm run preview      # preview the production build
```

## Deployment

Production is GitHub Pages. The workflow in `.github/workflows/deploy.yml` builds and deploys on every push to `main`. The Vite `base` path is set to `/helperPage/` for production via the `BASE_PATH` env var; it defaults to `/` for local dev.

To enable Pages for the first time: **Settings → Pages → Source → "GitHub Actions"**.

## Data

All data is stored in the browser's `localStorage` under the key `helperpage.state.v1`. Use the **Export** button in the burger menu to download a JSON backup, and **Import** to restore it. Exports include every item's content, colours, grid positions and sizes at each screen width, plus all tabs.
