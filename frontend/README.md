# Frontend wrapper

This folder is a small wrapper so you can run the existing frontend from a `frontend/` working directory.

Commands (from repo root or from inside `frontend`):

```bash
# enter wrapper
cd frontend

# install the frontend dependencies locally to frontend/node_modules
npm install

# run the dev server (this runs Vite with the parent folder as the project root)
npm run dev
```

Notes:
- The wrapper runs `vite --root ..` so the actual source files remain in the repository root (`index.html`, `src/`, `public/`, etc.).
- Build output (when using the wrapper build script) is written to `dist-frontend` in the repo root.
