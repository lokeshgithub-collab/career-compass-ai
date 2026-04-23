# Production Deployment Guide

## Architecture Overview
- Frontend: Vite + React + Tailwind
- Backend (recommended): Node.js (NestJS or Express) + PostgreSQL + Redis
- AI: LLM provider for resume analysis and coach
- Jobs: Aggregation service with scheduled syncs
- Notifications: Email (SendGrid or SES) + optional push

## Environment Variables (Frontend)
- `VITE_API_BASE_URL` - base URL for backend

## Environment Variables (Backend)
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `EMAIL_PROVIDER_API_KEY`
- `LLM_API_KEY`
- `JOB_FEED_API_KEY` (if using partners)

## Deploy Steps (Recommended)
1. Build frontend: `npm run build`
2. Deploy static output from `dist/` to your hosting (Netlify, Vercel, S3).
3. Deploy backend API with Docker on a VM or PaaS.
4. Configure DNS and SSL certificates.
5. Enable cron jobs for job sync + email digests.
6. Turn on observability (logging + metrics + alerts).

## Security Notes
- Use HTTPS everywhere
- Encrypt PII and resumes
- Role-based access for recruiter/admin
- Audit logs for job feed ingestion

## Scaling Notes
- Cache job feeds in Redis
- Async queues for resume analysis + emails
- Rate limit AI endpoints
