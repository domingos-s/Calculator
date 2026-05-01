# Calculator Notes PWA

A lightweight Android-style calculator clone that secretly opens a notes app when the exact calculation `1+7+2+9` is entered and `=` is pressed.

## Files
- `index.html` — main app shell
- `styles.css` — styling
- `app.js` — calculator logic, hidden trigger, notes CRUD, local storage
- `manifest.json` — PWA manifest
- `sw.js` — service worker for offline support
- `callogo.png` — placeholder icon to replace with your final logo

## Use
1. Serve the folder from any static web server.
2. Open in Chrome on Android.
3. Install to home screen.
4. Enter `1+7+2+9` and tap `=` to open notes mode.

## Notes
- Notes are stored in `localStorage`.
- Replace `callogo.png` with your real icon before shipping.
