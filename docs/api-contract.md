# Career Compass AI - API Contract (Draft)

This document defines the backend API expected by the frontend. It is designed for a production-ready deployment with scalable services.

## Auth & Users

`POST /api/v1/auth/login`
- Body: `{ email, password }`
- Response: `{ token, refreshToken, user }`

`POST /api/v1/auth/otp`
- Body: `{ email }`
- Response: `{ otpSent: true }`

`POST /api/v1/auth/refresh`
- Body: `{ refreshToken }`
- Response: `{ token }`

`GET /api/v1/users/me`
- Response: `{ id, name, email, role, profileComplete }`

## Profiles & Resume

`GET /api/v1/profiles/me`
- Response: `{ id, name, course, year, cgpa, interests, skills, resumeUrl }`

`PUT /api/v1/profiles/me`
- Body: `{ name, course, year, cgpa, interests, skills }`
- Response: `{ updated: true }`

`POST /api/v1/resume/upload`
- Body: `multipart/form-data`
- Response: `{ resumeUrl, extractedSkills }`

`POST /api/v1/resume/analyze`
- Body: `{ resumeUrl, targetRole }`
- Response: `{ score, missingKeywords, atsRisk, suggestions }`

## Career Recommendations

`POST /api/v1/recommendations/generate`
- Body: `{ aptitudeResponses, interests, skills, cgpa }`
- Response: `{ recommendations: CareerRecommendation[] }`

`GET /api/v1/recommendations`
- Response: `{ recommendations: CareerRecommendation[] }`

## Roadmap & Tasks

`GET /api/v1/roadmaps/:careerId`
- Response: `{ milestones }`

`POST /api/v1/roadmaps/:careerId/complete`
- Body: `{ milestoneId }`
- Response: `{ updated: true }`

`GET /api/v1/tasks/weekly`
- Response: `{ tasks: Task[] }`

## Job Aggregation

`GET /api/v1/jobs/matches`
- Query: `role, location, skills`
- Response: `{ jobs: JobOpportunity[] }`

`POST /api/v1/jobs/sync`
- Response: `{ synced: true, newJobs }`

## AI Coach

`POST /api/v1/coach/chat`
- Body: `{ sessionId, message }`
- Response: `{ reply, actions, tasksSuggested }`

## Recruiter / Business

`GET /api/v1/recruiter/roles`
- Response: `{ roles }`

`POST /api/v1/recruiter/roles`
- Body: `{ title, skills, location, salaryRange }`
- Response: `{ roleId }`

`GET /api/v1/recruiter/candidates`
- Query: `roleId, minScore`
- Response: `{ candidates }`

## Notifications

`POST /api/v1/notifications/preferences`
- Body: `{ emailAlerts, pushAlerts }`
- Response: `{ updated: true }`

`POST /api/v1/notifications/send`
- Body: `{ userId, type, payload }`
- Response: `{ queued: true }`

## Event Streaming (Optional)

`GET /api/v1/events/stream`
- Server-Sent Events for live job feed and task updates
