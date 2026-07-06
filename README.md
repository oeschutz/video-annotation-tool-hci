# Video Annotation Tool

A browser-based tool for annotating screen-recording videos with behavioral codes. Built as a replacement for a Google Sheets workflow.

## What it does

You load an MP4 video and watch it. When a behavioral segment ends, you press `E` (or click Mark End), fill in the annotation codes in the modal that appears, and move on. The next segment starts automatically from one second after the last end time. When you are done, you export a CSV in the same format used by the original sheets workflow.

Sessions are saved to the browser's IndexedDB as you work, so you can close the tab and resume later.

## Getting started

```bash
cd annotation-app
npm install
npm run dev
```

Then open `http://localhost:5173`.

To build for production:

```bash
npm run build
```

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| `E` | Edit Code (manually) |
| `A` | AI Autocomplete |
| `W` | Write Prompt |
| `B` | Backtrack Writing Prompt |
| `O` | Navigate AI Output |
| `P` | Navigate to Past Prompts |
| `F` | Navigate File Explorer |
| `C` | Navigate Code Editor |
| `I` | Interact With App |
| `V` | View App |
| `D` | Scroll Through Diffs |
| `Z` | Backtrack (Undo Changes) |
| `K` | Move Mouse Over AI Output |
| `H` | Move Mouse Over File Explorer |
| `J` | Move Mouse Over Code Editor |
| `L` | Resize Windows / Change Layout |
| `Y` | Accept AI Response |
| `N` | Nothing |
| `X` | Other/Review Later |
| `Space` | Play / pause |
| `←` / `→` | Step back / forward one frame |
| `Esc` | Close panels |

Quick-code keys (`E`–`X`) pause the video and immediately add an annotation. The next segment starts one frame after the previous segment ends.

## Annotation workflow

1. Drop an MP4 onto the video area, or click "Load Video".
2. Watch the video. When a segment ends, press the key for that behavior (e.g. `W` for Write Prompt, `E` for Edit Code manually).
3. The annotation is added instantly and the next segment begins from that end time.
4. Repeat until the video is fully coded.
5. Click "Export CSV" in the top bar and give the file a name.

## CSV format

```
Time Start,Time End,Code,Comment
0:00:00:00,0:00:10:00,Write Prompt,
```

Timestamps use `H:MM:SS:FF` format, where `FF` is the frame number within the second (0-based, at 30 fps).

Primary codes are stored as full label strings.

## Annotation scheme

The default scheme encodes 11 primary codes (VT, VC, VW, VA, VD, VR, WC, TC, IN, WP, ID) with secondary codes that vary by primary. Tasks run from Task 1 to Task 7.

You can replace this with your own scheme:

- Click the layers icon in the top bar to open the Scheme panel.
- Click "Build / Edit" to open the scheme builder, where you can add levels, define options, and set up dependencies between levels (e.g. secondary codes that vary by primary code).
- Or click "Load Scheme" to load a JSON file you prepared elsewhere.
- Click "Download Sample" to get an example JSON file showing the format.

A scheme JSON looks like this:

```json
{
  "name": "My Scheme",
  "version": "1.0",
  "description": "...",
  "hasComment": true,
  "levels": [
    {
      "id": "primaryCode",
      "label": "Primary Code",
      "type": "select",
      "required": true,
      "options": [
        { "value": "A", "label": "A (ACTION)" }
      ]
    },
    {
      "id": "secondaryCode",
      "label": "Secondary Code",
      "type": "select",
      "required": true,
      "dependsOn": "primaryCode",
      "optionsByParent": {
        "A": [
          { "value": "X", "label": "X (EXAMPLE)" }
        ]
      }
    }
  ]
}
```

Schemes are saved to `localStorage` and persist across sessions.

## Sessions

The database icon in the top bar opens the Sessions panel. From there you can:

- See all saved sessions with their video name, annotation count, and last modified time.
- Rename a session by clicking its name.
- Load a previous session (you will still need to re-load the video file).
- Delete sessions you no longer need.

## Importing a CSV

Click "Import CSV" to load an existing annotations file. The video will seek to the last annotated position so you can continue from where the file left off.

## Tech stack

- React 19 + Vite
- Custom CSS design system (light and dark mode via `data-theme`)
- Lucide React for icons
- IndexedDB for session persistence (no server required)
