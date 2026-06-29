# Spine 4.2 Viewer

Electron-based Windows viewer for Spine assets exported by current Cocos/Spine workflows.

## What it does

- Scans a fixed `spine` folder and groups `.png + .atlas + .skel` files by basename.
- Detects Spine versions directly from `.skel` headers.
- Plays supported `4.2.x` assets.
- Marks `3.8.x` assets as legacy and tells users to open them with the old viewer.
- Marks incomplete triples as broken with a missing-file message.

## Default scan path

- Development mode: `../spine/spine`
- Development fallback sample path: `../hero`
- Packaged app: `spine` folder next to the executable

## Commands

```bash
npm install
npm run dev
npm test
npm run build
npm run package
```

## Packaging output

- Portable EXE: `release/Spine 4.2 Viewer 0.1.0.exe`
- Unpacked app: `release/win-unpacked/`

When using the packaged app, place the resource folder as:

```text
<viewer-folder>/
  Spine 4.2 Viewer.exe
  spine/
    act_1001.png
    act_1001.atlas
    act_1001.skel
```
