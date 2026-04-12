# HelperPage

A self-hosted browser start page that replaces bookmarks, sticky notes and task lists with a single drag-and-drop board. Runs as a Docker container serving a static React app — no backend, no accounts, everything lives in your browser's localStorage.

## Features

- **Slot-based grid** — items snap to a responsive grid that adapts from 3 columns on mobile to 30 on a 4K display. Each width remembers its own layout so resizing the window restores positions automatically.
- **Three item types**
  - **Button** — a coloured link tile that opens a URL in a new tab.
  - **To-do list** — a checklist with inline add/delete/toggle. Works outside edit mode.
  - **Notes** — a full Markdown editor with a formatting toolbar (headings, bold, italic, code blocks, tables, callouts, highlights) and a live GFM preview.
- **Edit mode** — long-press an empty slot to enter edit mode and place a new item, or long-press the margin to toggle. Drag items to reposition, corner-handle resize, and per-item edit/delete via popup modals.
- **Per-theme colours** — every item stores separate light and dark background colours. A full colour picker (hue/saturation plane, hex input, swatch presets) is built into every edit popup.
- **Dark mode** — toggle via the sun/moon switch in the top bar. Colours auto-invert for items that haven't been customised in the current theme.
- **Search** — filters items in-place, repacking matches upward. To-do entries that don't match fade to 20% opacity; Notes highlights matching text in orange.
- **Import / Export** — full JSON backup of every item, position, size, width-memory layout and preference. Restore on any browser or machine.

## Requirements

- Docker (with Compose v2)

## Quick start

```bash
git clone https://github.com/Perpaterb/helperPage.git
cd helperPage
./start.sh
```

`start.sh` finds the first available port starting at 8000, builds the Docker image and starts the container. The URL is printed when ready.

## Manual start on a specific port

```bash
HP_PORT=8080 docker compose up -d --build
```

## Stop

```bash
docker compose down
```

## Data

All data is stored in the browser's `localStorage` under the key `helperpage.state.v1`. Use the **Export** button in the burger menu to download a JSON backup, and **Import** to restore it. The export includes every item's content, colours, grid positions and sizes at each screen width.
