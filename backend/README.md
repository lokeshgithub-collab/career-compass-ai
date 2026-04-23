# Career Compass Backend (minimal scaffold)

This is a minimal Express + TypeScript scaffold to receive frontend requests for roadmap generation and resume analysis. It is intentionally small so you can iterate quickly.

Run locally:

```bash
cd backend
npm install
npm run dev
```

Health: `GET /health`
Mock endpoints:
- `POST /api/roadmap` { role }
- `POST /api/resume/analyze` { text }

Additional endpoints (prototype):
- `GET /api/jobs` optional `?role=` filter returns recent job matches
- `GET /api/jobs/stream` Server-Sent Events stream of `job:new` events
- `POST /api/jobs/create` create a mock job and broadcast it (for testing)
- `POST /api/notify` send email via SMTP (requires SMTP env vars)

Environment variables (backend):
- `PORT` (default 4000)
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `FROM_EMAIL` (for `POST /api/notify`)
- `OPENAI_API_KEY` (future: used to enable LLM-powered roadmap/resume analysis)

Notes:
- This backend is a minimal prototype: job aggregation is mocked and held in-memory. For production, persist jobs to a DB and implement polite scraping or use official job APIs.
- The SSE stream provided by `/api/jobs/stream` can be consumed by the frontend to receive real-time job notifications.
