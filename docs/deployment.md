# Production Deployment Guide

## Current Deployment Split
- Frontend: Vercel
- Backend API: Railway

## Vercel Environment Variables
- `VITE_API_BASE_URL=https://your-railway-backend.up.railway.app`

## Railway Environment Variables
- `FRONTEND_URL=https://your-vercel-app.vercel.app`
- `SMTP_HOST=smtp.gmail.com`
- `SMTP_PORT=465`
- `SMTP_USER=your-email@example.com`
- `SMTP_PASS=your-email-app-password`
- `FROM_EMAIL=your-email@example.com`

## Important Auth Note
- If `SMTP_HOST`, `SMTP_USER`, or `SMTP_PASS` are missing in Railway, signup and forgot-password still work, but the app will show the OTP on screen instead of sending an email.
- For a final review/demo, configure the Railway SMTP variables so the reviewer receives the OTP in email.

## Gmail SMTP Setup
1. Turn on 2-Step Verification for the Gmail account you want to send from.
2. Generate a Google App Password.
3. Use that App Password as `SMTP_PASS`.
4. Keep `SMTP_HOST=smtp.gmail.com` and `SMTP_PORT=465`.

## Deploy Steps
1. Deploy the frontend to Vercel with `VITE_API_BASE_URL` pointing to Railway.
2. Deploy the backend to Railway and add the `FRONTEND_URL` and `SMTP_*` variables above.
3. Redeploy both services after changing environment variables.
4. Test signup with a fresh email address.
5. If an email was already used before, the app now redirects that user toward sign-in instead of failing the signup flow.
