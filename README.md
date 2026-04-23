# Career Compass AI

Career guidance platform with AI coaching, career matching, resume analysis, roadmap planning, and recruiter tools.

## Run Locally

```sh
# 1. Install dependencies
npm install

# 2. Start dev server
npm run dev
```

The app runs on `http://localhost:5173` by default.

## Build for Production

```sh
# Create production build
npm run build

# Preview production build
npm run preview
```

## Environment Variables

Create `.env` in the project root when connecting a real backend:

```sh
VITE_API_BASE_URL=http://localhost:4000
```

## Production Notes

See deployment guidance in `docs/deployment.md` and the API expectations in `docs/api-contract.md`.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Framer Motion animations

## Running frontend + backend (recommended)

This repository currently treats the project root as the frontend. A minimal backend scaffold lives in `backend/`.


From repo root (preferred):

```bash
# frontend (wrapper):
cd frontend
npm install
npm run dev

# in a new terminal: start backend
cd ../backend
npm install
npm run dev
```

Or from repo root (single-command installs):

```bash
# install frontend deps into frontend/
npm install --prefix frontend

# install backend deps into backend/
npm install --prefix backend

# run both (open two terminals):
npm run dev --prefix frontend
npm run dev --prefix backend
```

Point the frontend at the backend by creating a `.env` file in the frontend folder with:

```env
VITE_API_BASE_URL=http://localhost:4000
```

The frontend will call the mock endpoints at `POST /api/roadmap` and `POST /api/resume/analyze` on the backend.

Quick API test examples (from a terminal):

```bash
# Roadmap
curl -X POST http://localhost:4000/api/roadmap -H "Content-Type: application/json" -d '{"role":"Full Stack Developer"}'

# Resume analyze
curl -X POST http://localhost:4000/api/resume/analyze -H "Content-Type: application/json" -d '{"text":"My resume text..."}'

# Get recent jobs
curl http://localhost:4000/api/jobs

# Subscribe to SSE (simple):
curl http://localhost:4000/api/jobs/stream
```
