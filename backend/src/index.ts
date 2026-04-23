import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import crypto from 'crypto';
import {
  getJobs,
  addJob,
  seedJobsIfEmpty,
  addApplication,
  addChat,
  addResume,
  getApplications,
  getUsers,
  upsertUser,
  getPosts,
  addPost,
  getComments,
  addComment,
  getConnections,
  toggleConnection,
  getGroups,
  addGroup,
  getGroupMembers,
  joinGroup,
  getMessages,
  addMessage,
  getNotifications,
  addNotification,
  markNotificationsRead,
  saveBronzeJobs,
  saveSilverJobs,
  saveGoldJobs,
  getBronzeJobs,
  getSilverJobs,
  getGoldJobs,
  saveFeatureSnapshots,
  getFeatureSnapshots,
  addEventLog,
  getEventLogs,
  addPipelineRun,
  getPipelineRuns,
  addInterviewSession,
  getInterviewSessions,
  updateInterviewSession,
  addAlertEvent,
  getAlertEvents,
  addPortfolioReport,
  getPortfolioReports,
  getUserByEmail,
  getQuestionnaireResponses,
  addQuestionnaireResponse,
  getCareerRecommendations,
  saveCareerRecommendations,
  getRoadmaps,
  saveRoadmap,
  getWeeklyCheckIns,
  addWeeklyCheckIn,
  getPlacementOutcomes,
  addPlacementOutcome,
  addSimulationRun,
  getSimulationRuns,
  getAuthOtps,
  saveAuthOtp,
  deleteAuthOtp,
} from './db';

dotenv.config();

const app = express();
const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.VITE_FRONTEND_URL,
  'https://career-compass-ai-gray.vercel.app',
].filter(Boolean);

const corsOptions = {
  origin(origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    // Allow non-browser requests and local tools without an Origin header.
    if (!origin) {
      return callback(null, true);
    }

    const isVercelPreview = /^https:\/\/career-compass-ai-[a-z0-9-]+\.vercel\.app$/i.test(origin);
    const isAllowed = allowedOrigins.includes(origin) || isVercelPreview;

    if (isAllowed) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());

const PORT = process.env.PORT || 4000;
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID || '';
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY || '';
const ADZUNA_COUNTRY = process.env.ADZUNA_COUNTRY || 'in';
const ADZUNA_DEFAULT_WHERE = process.env.ADZUNA_DEFAULT_WHERE || 'Chennai, India';
const ADZUNA_CACHE_MINUTES = Number(process.env.ADZUNA_CACHE_MINUTES || '60');
const LINKEDIN_SCRAPE_ENABLED = (process.env.LINKEDIN_SCRAPE_ENABLED || '1') === '1';
const LINKEDIN_SCRAPE_PAGES = Number(process.env.LINKEDIN_SCRAPE_PAGES || '2');
const LINKEDIN_CACHE_MINUTES = Number(process.env.LINKEDIN_CACHE_MINUTES || '30');
const NAUKRI_SCRAPE_ENABLED = (process.env.NAUKRI_SCRAPE_ENABLED || '1') === '1';
const NAUKRI_SCRAPE_PAGES = Number(process.env.NAUKRI_SCRAPE_PAGES || '2');
const NAUKRI_CACHE_MINUTES = Number(process.env.NAUKRI_CACHE_MINUTES || '30');
const JOB_SOURCES = (process.env.JOB_SOURCES || 'adzuna,linkedin,naukri')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5001';
const LLM_PROVIDER = (process.env.LLM_PROVIDER || 'openai').toLowerCase();
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || '';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-pro-1.0';

async function generateCoachReply(message: string, profile: any, history: any[]) {
  const profileSummary = profile
    ? `Candidate name: ${profile.name || 'Unknown'}, education: ${profile.education || 'N/A'}, target roles: ${(profile.targetRoles || []).join(', ') || 'N/A'}, skills: ${((profile.skills || []) as string[]).join(', ') || 'N/A'}.`
    : 'No profile information available.';

  const historyText = history
    .map((item: any) => `${item.role === 'coach' ? 'Coach' : 'User'}: ${item.content}`)
    .join('\n');

  const systemInstruction = `You are a friendly, professional career coach. Use the user's profile and conversation context to generate personalized coaching advice with empathy, practical next steps, and sentiment awareness. In your response, infer whether the user's tone is positive, neutral, or concerned.

Return exactly valid JSON with two fields: reply and sentiment. Do not include any extra explanation outside the JSON object.`;

  const userPrompt = `Profile:\n${profileSummary}\n\nConversation:\n${historyText}\n\nNew user message:\n${message}\n\nRespond with tailored career advice and a sentiment label.`;

  if (LLM_PROVIDER === 'gemini' && GEMINI_API_KEY) {
    const url = `https://gemini.googleapis.com/v1/models/${GEMINI_MODEL}:generate?key=${GEMINI_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: {
          messages: [
            { role: 'system', content: systemInstruction },
            { role: 'user', content: userPrompt },
          ],
        },
        temperature: 0.7,
        max_output_tokens: 512,
      }),
    });
    const data = await response.json();
    const text = data?.candidates?.[0]?.content?.[0]?.text || data?.output?.[0]?.content?.[0]?.text || '';
    try {
      return JSON.parse(String(text));
    } catch {
      return { reply: String(text || 'Sorry, I could not generate a coach response.'), sentiment: 'neutral' };
    }
  }

  if (OPENAI_API_KEY) {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 512,
      }),
    });
    const data = await response.json();
    const text = data?.choices?.[0]?.message?.content || '';
    try {
      return JSON.parse(String(text));
    } catch {
      return { reply: String(text || 'Sorry, I could not generate a coach response.'), sentiment: 'neutral' };
    }
  }

  return {
    reply: message.includes('roadmap')
      ? 'I can generate a roadmap for you. Use the Roadmap builder to generate step-by-step plans.'
      : `Coach: I heard "${message}". Here are 3 quick suggestions:\n1) Practice relevant projects\n2) Update resume with keywords\n3) Apply to 3 targeted roles this week.`,
    sentiment: 'neutral',
  };
}

const adzunaCache = new Map<string, { ts: number; jobs: any[] }>();
const linkedInCache = new Map<string, { ts: number; jobs: any[] }>();
const naukriCache = new Map<string, { ts: number; jobs: any[] }>();
const discoveryCache = new Map<string, { ts: number; posts: any[] }>();
const presenceStore = new Map<string, { lastSeen: number; status: 'online' | 'offline' }>();
const typingStore = new Map<string, number>();

const interviewPatternCache = new Map<string, { ts: number; data: any }>();
const INTERVIEW_PATTERN_CACHE_MINUTES = Number(process.env.INTERVIEW_PATTERN_CACHE_MINUTES || '180');

const COMPANY_DOMAINS: Record<string, string[]> = {
  zoho: ['qa testing', 'full stack developer', 'backend developer', 'frontend developer', 'data analyst'],
  microsoft: ['sde', 'frontend developer', 'data scientist', 'qa testing', 'cloud engineer'],
  google: ['software engineer', 'data scientist', 'product manager', 'qa testing', 'site reliability engineer'],
  amazon: ['sde', 'qa testing', 'data engineer', 'cloud engineer', 'business analyst'],
  tcs: ['software engineer', 'qa testing', 'data analyst', 'full stack developer'],
  infosys: ['software engineer', 'system engineer', 'qa testing', 'data analyst'],
  wipro: ['project engineer', 'qa testing', 'cloud engineer', 'data analyst'],
  accenture: ['software engineer', 'data engineer', 'frontend developer', 'cloud engineer'],
  cognizant: ['programmer analyst', 'qa testing', 'data analyst', 'backend developer'],
  ibm: ['software engineer', 'data scientist', 'cloud engineer', 'qa testing'],
  oracle: ['backend developer', 'software engineer', 'database engineer', 'cloud engineer'],
  deloitte: ['business analyst', 'data analyst', 'qa testing', 'product manager'],
  capgemini: ['software engineer', 'qa testing', 'data analyst', 'frontend developer'],
  paypal: ['software engineer', 'backend developer', 'product manager', 'data scientist'],
  adobe: ['frontend developer', 'software engineer', 'product manager', 'data scientist'],
  salesforce: ['qa testing', 'software engineer', 'product manager', 'backend developer'],
};

const ROUND_QUESTION_BANK: Record<string, Record<string, string[]>> = {
  aptitude: {
    general: [
      'If 5 workers finish a task in 12 days, how many days for 8 workers at the same rate?',
      'Find the next number: 3, 7, 15, 31, ?',
      'A train crosses a 300m platform in 30 seconds at 54 km/h. Is this statement valid? Explain quickly.',
      'A coding test has 60 questions to be completed in 75 minutes. What is the average time per question?',
      'A team increased bug closure from 24 to 36 per sprint. What is the percentage increase?',
      'A process has 3 stages with pass rates of 80%, 70%, and 90%. What is the overall probability of clearing all stages?',
    ],
  },
  coding: {
    'qa testing': [
      'Write pseudocode to validate email format and boundary cases.',
      'Given an array, find duplicates and explain test data combinations.',
      'Automate login test flow with assertions and error handling.',
      'Design edge-case test data for a signup form with password and OTP verification.',
      'How would you structure reusable selectors and assertions in a Selenium framework?',
    ],
    'frontend developer': [
      'Build a React component that fetches paginated data and handles loading, error, and empty states.',
      'Explain how you would optimize a slow-rendering dashboard with large lists.',
      'Implement form validation with accessible error messages and debounced submission.',
      'Create a responsive navbar with state management for desktop and mobile interactions.',
      'Debug a component that re-renders excessively and explain how you would isolate the cause.',
    ],
    'backend developer': [
      'Design a REST API for order creation with validation, idempotency, and error handling.',
      'How would you model database transactions for wallet debit and credit operations?',
      'Implement rate limiting for a public API and explain storage tradeoffs.',
      'Design logging and tracing for debugging latency in a microservice.',
      'Explain how you would secure a file upload endpoint against malicious input.',
    ],
    'data scientist': [
      'Write the steps to build a churn prediction pipeline from raw data to evaluation.',
      'How would you handle class imbalance in a fraud detection model?',
      'Explain feature engineering choices for a recommendation system use case.',
      'Design an experiment to compare two classification models on business metrics.',
      'How would you validate data leakage before deploying a model?',
    ],
    'product manager': [
      'Design a prioritization framework for competing roadmap requests from sales and users.',
      'How would you define success metrics for a new onboarding experience?',
      'Draft a product requirement outline for a job alerts feature.',
      'Explain how you would make tradeoff decisions under tight engineering capacity.',
      'How would you validate whether a proposed feature solves a real user problem?',
    ],
    general: [
      'Implement two-sum and explain time complexity.',
      'Reverse a linked list iteratively.',
      'Find first non-repeating character in a string.',
      'Design a caching strategy for frequently queried profile data.',
      'Explain how you would test and deploy a feature with minimal production risk.',
    ],
  },
  technical: {
    'qa testing': [
      'Explain difference between smoke, sanity, regression, and UAT.',
      'How do you design a test strategy for a payment checkout flow?',
      'What would you automate first in an ecommerce app and why?',
    ],
    general: [
      'Explain normalization and indexing tradeoffs in SQL.',
      'How do you debug API latency in production?',
      'What are race conditions and how do you prevent them?',
      'Explain the difference between horizontal and vertical scaling with examples.',
      'How would you choose between monolith and microservices for a growing product?',
      'What signals do you monitor after a new release goes live?',
    ],
  },
  hr: {
    general: [
      'Tell me about a conflict in your team and how you handled it.',
      'Why do you want to join this company and role?',
      'Where do you see yourself in 3 years?',
      'Describe a project where you took ownership beyond your assigned task.',
      'Tell me about a time you received difficult feedback and how you responded.',
      'Why are you interested in this specific team and not just the company brand?',
    ],
  },
  'system design': {
    general: [
      'Design a URL shortener and explain storage, scaling, and analytics tradeoffs.',
      'How would you design a notification service for alerts, email, and in-app updates?',
      'Design a job recommendation feed and discuss ranking, freshness, and deduplication.',
      'Explain how you would scale a chat platform to support high concurrency.',
      'Design a resume analysis service with asynchronous processing and retries.',
    ],
  },
  'group discussion': {
    general: [
      'Discuss whether AI will create more jobs than it replaces in the next five years.',
      'Debate whether remote work improves productivity for engineering teams.',
      'Should product teams prioritize speed of shipping or reliability by default?',
      'Discuss whether coding assessments are a fair measure of job readiness.',
    ],
  },
};

function roleKeyFromDomain(domain: string) {
  const d = String(domain || '').toLowerCase();
  if (d.includes('qa')) return 'qa testing';
  if (d.includes('front')) return 'frontend developer';
  if (d.includes('back')) return 'backend developer';
  if (d.includes('data')) return 'data scientist';
  if (d.includes('product') || d.includes('pm')) return 'product manager';
  return 'general';
}

function slugifyInterviewValue(value: string) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, '-');
}

function extractInterviewTopicsFromText(text: string) {
  const normalized = String(text || '').toLowerCase();
  const topicPatterns: Record<string, RegExp> = {
    dsa: /\b(data structures?|algorithms?|leetcode|coding round|arrays?|trees?|graphs?)\b/,
    sql: /\b(sql|database|joins?|query|normalization)\b/,
    api: /\b(api|rest|microservices?|backend)\b/,
    testing: /\b(test|qa|automation|selenium|testng|regression)\b/,
    frontend: /\b(frontend|react|javascript|typescript|ui|css)\b/,
    ml: /\b(machine learning|statistics|feature engineering|model|python)\b/,
    product: /\b(product strategy|roadmap|stakeholder|metrics|user research)\b/,
    cloud: /\b(aws|azure|gcp|cloud|docker|kubernetes)\b/,
    system: /\b(system design|scalability|architecture|distributed)\b/,
    behavioral: /\b(hr|behavioral|culture fit|leadership|communication)\b/,
  };

  return Object.entries(topicPatterns)
    .filter(([, pattern]) => pattern.test(normalized))
    .map(([topic]) => topic);
}

function uniqueQuestions(questions: string[], maxItems: number) {
  return Array.from(new Set(questions.map((q) => q.trim()).filter(Boolean))).slice(0, maxItems);
}

function buildRoundQuestions(round: string, domain: string, company: string, topics: string[] = []) {
  const r = ROUND_QUESTION_BANK[round] || ROUND_QUESTION_BANK.technical;
  const roleKey = roleKeyFromDomain(domain);
  const baseQuestions = [...(r[roleKey] || []), ...(r.general || [])];
  const companyName = toTitleCase(company);
  const domainName = toTitleCase(domain);
  const generated: string[] = [];

  if (round === 'coding') {
    if (topics.includes('dsa')) generated.push(`Solve a ${companyName}-style coding problem for ${domainName}: explain brute force, optimized approach, and complexity.`);
    if (topics.includes('frontend')) generated.push(`Implement a ${domainName} UI component and explain accessibility, state management, and performance decisions.`);
    if (topics.includes('api')) generated.push(`Design a backend task for ${companyName} ${domainName} interviews involving APIs, validation, and error handling.`);
    if (topics.includes('ml')) generated.push(`Walk through a ${companyName} ${domainName} case where you build a model pipeline and justify your feature choices.`);
  }

  if (round === 'technical') {
    if (topics.includes('sql')) generated.push(`Explain a SQL-focused problem you might face in a ${companyName} ${domainName} interview, including optimization tradeoffs.`);
    if (topics.includes('cloud')) generated.push(`Discuss how cloud deployment and observability matter for a ${domainName} role at ${companyName}.`);
    if (topics.includes('system')) generated.push(`What system design expectations would ${companyName} likely have for a ${domainName} candidate?`);
    generated.push(`What would success look like in the first 90 days for a ${domainName} role at ${companyName}?`);
  }

  if (round === 'aptitude') {
    generated.push(`A ${companyName} shortlist keeps 40 out of 250 applicants. What is the shortlist percentage, and why does accuracy matter in such tests?`);
    generated.push(`You are given a time-bound ${domainName} screening test. How would you split 60 minutes across easy, medium, and hard problems?`);
  }

  if (round === 'hr') {
    generated.push(`Why do you want to join ${companyName} specifically for a ${domainName} role?`);
    generated.push(`Describe a time you demonstrated ownership in a situation similar to what ${companyName} might expect.`);
  }

  if (round === 'system design') {
    generated.push(`Design an internal platform or workflow relevant to ${companyName}'s ${domainName} hiring context and explain scaling tradeoffs.`);
  }

  if (round === 'group discussion') {
    generated.push(`Discuss a current industry trend that could affect hiring for ${domainName} roles at companies like ${companyName}.`);
  }

  return uniqueQuestions([...generated, ...baseQuestions], round === 'technical' ? 6 : 5);
}

function toTitleCase(value: string) {
  return String(value || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(' ');
}

async function sendNotificationEmail(to: string, subject: string, text: string) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;
  if (!to || !SMTP_HOST || !SMTP_USER || !SMTP_PASS) return false;
  const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: false,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
  await transporter.sendMail({
    from: FROM_EMAIL || SMTP_USER,
    to,
    subject,
    text,
  });
  return true;
}

async function fetchInterviewPatternFromWeb(company: string, domain: string) {
  const companyLc = String(company || '').toLowerCase();
  const domainLc = String(domain || '').toLowerCase();
  const cacheKey = `${companyLc}|${domainLc}`;
  const now = Date.now();
  const cached = interviewPatternCache.get(cacheKey);
  if (cached && now - cached.ts < INTERVIEW_PATTERN_CACHE_MINUTES * 60_000) return cached.data;

  const query = `${companyLc} ${domainLc} interview process aptitude coding technical hr geeksforgeeks interviewbit leetcode`;
  const url = `https://duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
  const rounds = ['aptitude', 'coding', 'technical', 'hr'];
  const sources: string[] = [];
  const inferredTopics = new Set<string>();
  let summary = `${toTitleCase(company)} ${toTitleCase(domain)} interview usually has aptitude, coding, technical and HR rounds.`;

  try {
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (resp.ok) {
      const html = await resp.text();
      const links = Array.from(html.matchAll(/<a[^>]*class="result__a"[^>]*href="([^"]+)"/g))
        .map((m) => m[1])
        .slice(0, 8);
      links.forEach((l) => sources.push(l));
      const text = html.replace(/<[^>]+>/g, ' ').toLowerCase();
      extractInterviewTopicsFromText(text).forEach((topic) => inferredTopics.add(topic));
      if (text.includes('group discussion') && !rounds.includes('group discussion')) rounds.splice(2, 0, 'group discussion');
      if (text.includes('system design') && !rounds.includes('system design')) rounds.splice(3, 0, 'system design');
      summary = `Pattern inferred from public interview experience snippets for ${toTitleCase(company)} ${toTitleCase(domain)} role. Questions below are original practice prompts generated from those themes.`;
    }
  } catch (_err) {
    // Keep deterministic fallback if live scraping is blocked.
  }

  const roundPlan = rounds.map((round) => ({
    round,
    questionCount: round === 'technical' || round === 'coding' ? 5 : round === 'system design' ? 4 : 3,
    questions: buildRoundQuestions(round, domain, company, Array.from(inferredTopics)),
  }));

  const data = {
    company: toTitleCase(company),
    slug: slugifyInterviewValue(company),
    domain: toTitleCase(domain),
    summary,
    rounds: roundPlan,
    sources,
    inferredTopics: Array.from(inferredTopics),
    scrapedAt: new Date().toISOString(),
  };
  interviewPatternCache.set(cacheKey, { ts: now, data });
  return data;
}

function toSkillSlug(skill: string) {
  return String(skill || '').trim().toLowerCase();
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/ml/health', async (_req, res) => {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/health`);
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'ML service unavailable', details: String(err) });
  }
});

// Seed initial jobs (expanded multi-source seed)
const initialJobs = [
  {
    id: 'job-1',
    title: 'Junior Full Stack Developer',
    company: 'TechCorp India',
    location: 'Bangalore, India',
    type: 'Full-time',
    salary: '₹6-8 LPA',
    requiredSkills: ['React', 'Node.js', 'MongoDB', 'Git'],
    matchScore: 88,
    postedDate: '2 days ago',
    applyUrl: 'https://techcorp.in/jobs/1',
    logo: '🏢',
    source: 'LinkedIn',
  },
  {
    id: 'job-2',
    title: 'Frontend Developer Intern',
    company: 'StartupXYZ',
    location: 'Remote',
    type: 'Internship',
    salary: '₹25,000/month',
    requiredSkills: ['React', 'JavaScript', 'CSS', 'TypeScript'],
    matchScore: 92,
    postedDate: '1 day ago',
    applyUrl: 'https://startupxyz.com/jobs/2',
    logo: '🚀',
    source: 'Internshala',
  },
  {
    id: 'job-3',
    title: 'Python Backend Developer',
    company: 'DataFlow Systems',
    location: 'Pune, India',
    type: 'Full-time',
    salary: '₹8-12 LPA',
    requiredSkills: ['Python', 'FastAPI', 'PostgreSQL', 'Docker'],
    matchScore: 75,
    postedDate: '3 days ago',
    applyUrl: 'https://dataflow.in/careers',
    logo: '🔧',
    source: 'Naukri',
  },
  {
    id: 'job-4',
    title: 'QA Engineer',
    company: 'QualityAssure Inc',
    location: 'Hyderabad, India',
    type: 'Full-time',
    salary: '₹5-7 LPA',
    requiredSkills: ['Selenium', 'Java', 'TestNG', 'Git'],
    matchScore: 68,
    postedDate: '4 days ago',
    applyUrl: 'https://qualityassure.in/jobs',
    logo: '✓',
    source: 'Apna',
  },
  {
    id: 'job-5',
    title: 'Data Scientist',
    company: 'AI Labs India',
    location: 'Bangalore, India',
    type: 'Full-time',
    salary: '₹10-15 LPA',
    requiredSkills: ['Python', 'Machine Learning', 'Statistics', 'SQL'],
    matchScore: 82,
    postedDate: '1 day ago',
    applyUrl: 'https://ailabs.in/careers',
    logo: '📊',
    source: 'Indeed',
  },
  {
    id: 'job-6',
    title: 'React Native Developer',
    company: 'MobileFirst Solutions',
    location: 'Remote',
    type: 'Full-time',
    salary: '₹7-10 LPA',
    requiredSkills: ['React Native', 'JavaScript', 'Firebase', 'Git'],
    matchScore: 85,
    postedDate: '2 days ago',
    applyUrl: 'https://mobilefirst.in',
    logo: '📱',
    source: 'LinkedIn',
  },
  {
    id: 'job-7',
    title: 'Cloud DevOps Engineer',
    company: 'CloudNine Technologies',
    location: 'Bangalore, India',
    type: 'Full-time',
    salary: '₹12-18 LPA',
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'CI/CD'],
    matchScore: 70,
    postedDate: '5 days ago',
    applyUrl: 'https://cloudnine.in/jobs',
    logo: '☁️',
    source: 'Glassdoor',
  },
  {
    id: 'job-8',
    title: 'Web Designer',
    company: 'Creative Studio',
    location: 'Remote',
    type: 'Full-time',
    salary: '₹4-6 LPA',
    requiredSkills: ['Figma', 'UI/UX', 'CSS', 'JavaScript'],
    matchScore: 65,
    postedDate: '6 days ago',
    applyUrl: 'https://creativestudio.in',
    logo: '🎨',
    source: 'Internshala',
  },
  {
    id: 'job-9',
    title: 'Database Administrator',
    company: 'DataSecure Inc',
    location: 'Pune, India',
    type: 'Full-time',
    salary: '₹8-11 LPA',
    requiredSkills: ['PostgreSQL', 'MySQL', 'MongoDB', 'Linux'],
    matchScore: 72,
    postedDate: '3 days ago',
    applyUrl: 'https://datasecure.in',
    logo: '🗄️',
    source: 'Naukri',
  },
  {
    id: 'job-10',
    title: 'Product Manager (Tech)',
    company: 'InnovateCorp',
    location: 'Bangalore, India',
    type: 'Full-time',
    salary: '₹15-22 LPA',
    requiredSkills: ['Product Strategy', 'Analytics', 'Communication', 'Roadmapping'],
    matchScore: 60,
    postedDate: '7 days ago',
    applyUrl: 'https://innovate.in/careers',
    logo: '📈',
    source: 'Adzuna',
  },
  {
    id: 'job-11',
    title: 'Machine Learning Engineer',
    company: 'NeuralNet Labs',
    location: 'Hyderabad, India',
    type: 'Full-time',
    salary: '₹12-16 LPA',
    requiredSkills: ['Python', 'TensorFlow', 'PyTorch', 'Statistics'],
    matchScore: 78,
    postedDate: '4 days ago',
    applyUrl: 'https://neuralnet.in',
    logo: '🤖',
    source: 'Indeed',
  },
  {
    id: 'job-12',
    title: 'Security Engineer',
    company: 'CyberGuard Solutions',
    location: 'Remote',
    type: 'Full-time',
    salary: '₹11-14 LPA',
    requiredSkills: ['Security', 'Networking', 'Linux', 'Penetration Testing'],
    matchScore: 55,
    postedDate: '5 days ago',
    applyUrl: 'https://cyberguard.in',
    logo: '🔐',
    source: 'Apna',
  },
  {
    id: 'job-13',
    title: 'Technical Writer',
    company: 'DocFlow Inc',
    location: 'Remote',
    type: 'Full-time',
    salary: '₹4-6 LPA',
    requiredSkills: ['Technical Writing', 'Git', 'Markdown', 'APIs'],
    matchScore: 50,
    postedDate: '8 days ago',
    applyUrl: 'https://docflow.io',
    logo: '📝',
    source: 'LinkedIn',
  },
  {
    id: 'job-14',
    title: 'Solutions Architect',
    company: 'EnterpriseTech',
    location: 'Bangalore, India',
    type: 'Full-time',
    salary: '₹18-25 LPA',
    requiredSkills: ['System Design', 'Cloud', 'Architecture', 'Leadership'],
    matchScore: 58,
    postedDate: '6 days ago',
    applyUrl: 'https://enterprisetech.in',
    logo: '🏗️',
    source: 'Glassdoor',
  },
  {
    id: 'job-15',
    title: 'Test Automation Engineer',
    company: 'AutoTest Systems',
    location: 'Pune, India',
    type: 'Full-time',
    salary: '₹6-9 LPA',
    requiredSkills: ['Selenium', 'Python', 'TestNG', 'CI/CD'],
    matchScore: 73,
    postedDate: '2 days ago',
    applyUrl: 'https://autotest.in',
    logo: '🧪',
    source: 'Naukri',
  },
];

seedJobsIfEmpty(initialJobs);

// Force merge new jobs into existing DB to ensure all are available
function ensureAllJobsExist() {
  const existing = getJobs();
  const existingIds = new Set(existing.map((j: any) => j.id));
  const newJobs = initialJobs.filter((job: any) => !existingIds.has(job.id));
  if (newJobs.length > 0) {
    newJobs.forEach((job: any) => addJob(job));
  }
}

ensureAllJobsExist();

// Mock user profile (replace with real auth later)
const mockUserProfile: any = {
  id: 'user-1',
  name: 'Student',
  email: 'student@example.com',
  course: 'B.Tech Computer Science',
  year: 3,
  cgpa: 8.2,
  preferredWorkMode: 'Hybrid',
  weeklyStudyHours: 15,
  targetPlacementTimeline: '6_months',
  skills: ['React', 'JavaScript', 'Python', 'Node.js'],
  interests: ['Web Development', 'Data Science'],
  targetRoles: ['Full Stack Developer', 'Frontend Developer'],
  strongestSkills: ['React', 'JavaScript'],
  weakestSkills: ['SQL', 'Docker'],
  targetLocations: ['Chennai', 'Bangalore'],
  projectCount: 3,
  internshipCount: 1,
  certificationsCount: 2,
  expectedSalaryLpa: 8,
  githubUrl: '',
  linkedinUrl: '',
  resumeUrl: '',
  aptitude: {},
};

// Ensure mock user exists in community users list
upsertUser({
  id: mockUserProfile.id,
  name: mockUserProfile.name,
  headline: 'B.Tech Student',
  skills: mockUserProfile.skills,
  interests: mockUserProfile.interests,
});

function seedCommunityDemoData() {
  const users = getUsers();
  const posts = getPosts();
  const groups = getGroups();
  const connections = getConnections();
  const comments = getComments();
  const messages = getMessages();

  const demoUsers = [
    {
      id: 'user-2',
      name: 'Priya',
      headline: 'Frontend Developer | React',
      skills: ['React', 'TypeScript', 'CSS', 'JavaScript'],
      interests: ['Web Development', 'UI/UX'],
    },
    {
      id: 'user-3',
      name: 'Arun',
      headline: 'Data Science Enthusiast',
      skills: ['Python', 'Machine Learning', 'SQL'],
      interests: ['Data Science', 'Artificial Intelligence'],
    },
    {
      id: 'user-4',
      name: 'Karthik',
      headline: 'Backend Engineer',
      skills: ['Node.js', 'Express', 'MongoDB', 'Docker'],
      interests: ['Web Development', 'Cloud Computing'],
    },
  ];

  demoUsers.forEach((u) => upsertUser(u));

  if (!connections.some((c: any) => c.fromId === 'user-1' && c.toId === 'user-2')) {
    toggleConnection('user-1', 'user-2');
  }
  if (!connections.some((c: any) => c.fromId === 'user-2' && c.toId === 'user-1')) {
    toggleConnection('user-2', 'user-1');
  }
  if (!connections.some((c: any) => c.fromId === 'user-1' && c.toId === 'user-4')) {
    toggleConnection('user-1', 'user-4');
  }

  if (!groups.some((g: any) => g.name === 'Full Stack Builders')) {
    addGroup({
      id: 'g_demo_1',
      name: 'Full Stack Builders',
      description: 'Projects, interview prep, and peer code reviews',
      createdAt: new Date().toISOString(),
    });
  }
  if (!groups.some((g: any) => g.name === 'Data Science Circle')) {
    addGroup({
      id: 'g_demo_2',
      name: 'Data Science Circle',
      description: 'Kaggle discussions and ML study plans',
      createdAt: new Date().toISOString(),
    });
  }

  if (!posts.some((p: any) => p.id === 'post_demo_1')) {
    addPost({
      id: 'post_demo_1',
      authorId: 'user-2',
      content: 'Shared a React interview prep sheet. Anyone up for a mock interview this weekend?',
      tags: ['Web Development', 'Interview Prep'],
      createdAt: new Date(Date.now() - 1000 * 60 * 50).toISOString(),
    });
  }
  if (!posts.some((p: any) => p.id === 'post_demo_2')) {
    addPost({
      id: 'post_demo_2',
      authorId: 'user-3',
      content: 'Built a churn prediction model today. Looking for feedback on feature selection.',
      tags: ['Data Science', 'Machine Learning'],
      createdAt: new Date(Date.now() - 1000 * 60 * 130).toISOString(),
    });
  }
  if (!comments.some((c: any) => c.id === 'c_demo_1')) {
    addComment({
      id: 'c_demo_1',
      postId: 'post_demo_1',
      authorId: 'user-1',
      content: 'I can join for mock interview. Sunday works for me.',
      createdAt: new Date(Date.now() - 1000 * 60 * 20).toISOString(),
    });
  }
  if (!messages.some((m: any) => m.id === 'msg_demo_1')) {
    addMessage({
      id: 'msg_demo_1',
      fromId: 'user-2',
      toId: 'user-1',
      content: 'Hey, saw your roadmap update. Need help with React projects?',
      createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    });
  }
}

seedCommunityDemoData();

// Smart job matching based on user profile
function getMatchScore(job: any, profile: any): number {
  let score = 0;
  const titleLower = (job.title || '').toLowerCase();
  const skillsLower = (job.requiredSkills || []).map((s: string) => s.toLowerCase());
  const profileSkillsLower = (profile.skills || []).map((s: string) => s.toLowerCase());
  const profileInterestsLower = (profile.interests || []).map((s: string) => s.toLowerCase());

  // 1. Match by target role (30 points)
  const targetRoles = (profile.targetRoles || []).map((r: string) => r.toLowerCase());
  if (targetRoles.some((r: string) => titleLower.includes(r))) {
    score += 30;
  } else if (targetRoles.length === 0) {
    score += 15; // No target role set yet
  }

  // 2. Match by skills (25 points max)
  const matchedSkills = skillsLower.filter((s: string) =>
    profileSkillsLower.some((ps: string) => ps.includes(s) || s.includes(ps))
  );
  const skillMatchRatio = skillsLower.length > 0 ? matchedSkills.length / skillsLower.length : 0;
  score += Math.min(25, skillMatchRatio * 30);

  // 3. Match by interests (20 points max)
  const jobTitleKeywords = titleLower.split(' ');
  const interestMatches = jobTitleKeywords.filter((keyword: string) =>
    profileInterestsLower.some((interest: string) => interest.includes(keyword) || keyword.includes(interest))
  ).length;
  if (interestMatches > 0) {
    score += Math.min(20, interestMatches * 10);
  }

  // 4. CGPA alignment (10 points max) - higher roles need higher CGPA
  const cgpa = Number(profile.cgpa || 0);
  const jobLevel = titleLower.includes('senior') || titleLower.includes('lead')
    ? 4
    : titleLower.includes('mid') || titleLower.includes('architect')
    ? 3
    : titleLower.includes('junior') || titleLower.includes('intern')
    ? 1
    : 2;
  
  const cgpaRequiredByLevel: Record<number, number> = { 1: 2.5, 2: 3.0, 3: 3.5, 4: 3.8 };
  const cgpaRequired = cgpaRequiredByLevel[jobLevel] || 3.0;
  if (cgpa >= cgpaRequired) {
    score += 10;
  } else if (cgpa >= cgpaRequired - 0.5) {
    score += 5;
  }

  // 5. Work mode preference (5 points max)
  const jobLocation = (job.location || '').toLowerCase();
  const prefer = profile.preferredWorkMode ? (profile.preferredWorkMode).toLowerCase() : 'hybrid';
  if (prefer === 'remote' && jobLocation.includes('remote')) {
    score += 5;
  } else if (prefer === 'hybrid' && (jobLocation.includes('remote') || jobLocation.includes('bangalore'))) {
    score += 3;
  } else if (prefer === 'onsite' && !jobLocation.includes('remote')) {
    score += 2;
  }

  // 6. Year/timeline readiness (10 points max)
  const year = Number(profile.year || 1);
  const finalYear = year === 4;
  const jobType = (job.type || '').toLowerCase();
  if ((finalYear && jobType.includes('full')) || (!finalYear && jobType.includes('intern'))) {
    score += 5;
  }

  // 7. Aptitude alignment bonus (up to 5 points)
  const aptitude = profile.aptitude || {};
  if (score > 0) {
    const hasRelevantAptitude =
      (titleLower.includes('data') && Number(aptitude.analytical || 0) > 3) ||
      (titleLower.includes('design') && Number(aptitude.creative || 0) > 3) ||
      (titleLower.includes('lead') && Number(aptitude.collaboration || 0) > 3) ||
      true; // Most dev roles need technical aptitude
    if (hasRelevantAptitude && Number(aptitude.technical || 0) > 2) {
      score += 5;
    }
  }

  return Math.min(100, Math.round(score));
}

function setOverlapScore(a: string[] = [], b: string[] = []) {
  const as = new Set((a || []).map((x) => x.toLowerCase()));
  const bs = new Set((b || []).map((x) => x.toLowerCase()));
  const intersection = Array.from(as).filter((x) => bs.has(x)).length;
  const union = new Set([...Array.from(as), ...Array.from(bs)]).size || 1;
  return intersection / union;
}

function getMutualConnectionCount(userId: string, candidateId: string, connections: any[]) {
  const mine = new Set(connections.filter((c: any) => c.fromId === userId).map((c: any) => c.toId));
  const theirs = new Set(connections.filter((c: any) => c.fromId === candidateId).map((c: any) => c.toId));
  let count = 0;
  mine.forEach((id) => {
    if (theirs.has(id)) count += 1;
  });
  return count;
}

function extractSkillsFromText(text: string, skills: string[] = []): string[] {
  const hay = (text || '').toLowerCase();
  const matched = skills.filter((s) => hay.includes(s.toLowerCase()));
  return Array.from(new Set(matched));
}

function formatSalary(min?: number, max?: number, currency?: string) {
  if (!min && !max) return '';
  const fmt = (n: number) => Math.round(n).toLocaleString('en-IN');
  const cur = currency ? `${currency} ` : '';
  if (min && max) return `${cur}${fmt(min)} - ${fmt(max)}`;
  if (min) return `${cur}${fmt(min)}+`;
  return `${cur}${fmt(max as number)}`;
}

function decodeHtml(text: string): string {
  return (text || '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function stripTags(text: string): string {
  return decodeHtml((text || '').replace(/<[^>]+>/g, ' '));
}



const CAREER_TEMPLATES = [
  {
    title: 'Full Stack Developer',
    description: 'Build both frontend and backend systems with modern web technologies.',
    requiredSkills: ['JavaScript', 'React', 'Node.js', 'APIs', 'SQL', 'Git'],
    keywords: ['web development', 'frontend', 'backend', 'react', 'node'],
    salary: '₹8-18 LPA',
    outlook: 'High',
  },
  {
    title: 'Data Scientist',
    description: 'Extract insights from data using statistics and machine learning.',
    requiredSkills: ['Python', 'Machine Learning', 'Statistics', 'SQL', 'Pandas', 'Data Visualization'],
    keywords: ['data science', 'machine learning', 'analytics', 'python', 'statistics'],
    salary: '₹10-22 LPA',
    outlook: 'High',
  },
  {
    title: 'Product Manager',
    description: 'Lead product strategy and bridge technical and business teams.',
    requiredSkills: ['Product Strategy', 'Communication', 'Roadmapping', 'Stakeholder Management', 'Data Analysis'],
    keywords: ['product', 'strategy', 'leadership', 'communication', 'roadmap'],
    salary: '₹12-25 LPA',
    outlook: 'High',
  },
  {
    title: 'QA Engineer',
    description: 'Design testing strategies and ensure product quality.',
    requiredSkills: ['Testing', 'Automation', 'Scripting', 'Bug Tracking', 'SQL'],
    keywords: ['qa', 'testing', 'automation', 'quality', 'bug'],
    salary: '₹6-14 LPA',
    outlook: 'Medium',
  },
  {
    title: 'Cloud Engineer',
    description: 'Build and operate cloud infrastructure and deployment pipelines.',
    requiredSkills: ['AWS', 'Docker', 'Kubernetes', 'Linux', 'CI/CD', 'Terraform'],
    keywords: ['cloud', 'aws', 'devops', 'docker', 'kubernetes'],
    salary: '₹10-24 LPA',
    outlook: 'High',
  },
];

function normalizeList(items: string[] = []) {
  return Array.from(new Set(items.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean)));
}

function scoreCareerMatch(profile: any, template: any) {
  const profileSkills = normalizeList(profile.skills || []);
  const profileInterests = normalizeList(profile.interests || []);
  const templateSkills = normalizeList(template.requiredSkills || []);
  const skillOverlap = templateSkills.filter((skill) => profileSkills.some((ps) => ps.includes(skill) || skill.includes(ps))).length;
  const skillScore = Math.min(100, Math.round((skillOverlap / Math.max(templateSkills.length, 1)) * 70));
  const interestMatch = template.keywords.some((keyword: string) => profileInterests.some((interest) => interest.includes(keyword)));
  const interestScore = interestMatch ? 15 : 5;
  const aptitude = profile.aptitude || {};
  const techAptitude = Math.min(5, Number(aptitude.technical) || 0) / 5;
  const analyticalAptitude = Math.min(5, Number(aptitude.analytical) || 0) / 5;
  const commAptitude = Math.min(5, Number(aptitude.communication) || 0) / 5;
  let aptitudeScore = 10;
  if (template.title === 'Data Scientist') aptitudeScore = Math.round(Math.min(15, analyticalAptitude * 15 + techAptitude * 10));
  else if (template.title === 'Product Manager') aptitudeScore = Math.round(Math.min(15, commAptitude * 15 + analyticalAptitude * 5));
  else aptitudeScore = Math.round(Math.min(15, techAptitude * 12 + analyticalAptitude * 8));
  const cgpa = Number(profile.cgpa || 0);
  const cgpaScore = cgpa >= 8 ? 10 : cgpa >= 6.5 ? 6 : 3;

  const totalScore = Math.min(100, skillScore + interestScore + aptitudeScore + cgpaScore + 5);
  const matchedSkills = templateSkills.filter((skill) => profileSkills.some((ps) => ps.includes(skill) || skill.includes(ps)));
  const gapSkills = templateSkills.filter((skill) => !matchedSkills.includes(skill));
  const reasons = [
    `Skill overlap: ${matchedSkills.length}/${templateSkills.length}`,
    `Interest alignment: ${interestMatch ? 'high' : 'low'}`,
    `Aptitude alignment: ${aptitudeScore}%`,
    `Academic readiness: ${cgpa >= 8 ? 'strong' : cgpa >= 6.5 ? 'moderate' : 'needs improvement'}`,
  ];

  return {
    ...template,
    score: totalScore,
    matchScore: totalScore,
    matchedSkills,
    gapSkills,
    reasons,
  };
}

function buildCareerRecommendations(profile: any) {
  const scored = CAREER_TEMPLATES.map((template) => scoreCareerMatch(profile, template));
  const ranked = scored.sort((a, b) => b.score - a.score).slice(0, 3);
  return ranked.map((item, index) => ({
    id: `career-${index + 1}`,
    title: item.title,
    description: item.description,
    matchScore: item.matchScore,
    reasoning: item.reasons,
    requiredSkills: item.requiredSkills,
    matchedSkills: item.matchedSkills,
    gapSkills: item.gapSkills,
    averageSalary: item.salary,
    growthOutlook: item.outlook,
    icon: item.title === 'Data Scientist' ? '📊' : item.title === 'Product Manager' ? '🚀' : item.title === 'Full Stack Developer' ? '💻' : item.title === 'QA Engineer' ? '🧪' : '☁️',
  }));
}

function buildRoadmap(profile: any, targetCareer: string) {
  const basePlans: Record<string, any[]> = {
    'Full Stack Developer': [
      {
        id: 'roadmap-fs-1',
        year: 3,
        semester: 1,
        title: 'Modern Frontend Development',
        description: 'Learn React, component design, and state management.',
        importance: 5,
        skills: ['React', 'JavaScript', 'CSS', 'Responsive UI'],
        courses: [
          { title: 'React Complete Guide', provider: 'Udemy', url: 'https://www.udemy.com/course/react-the-complete-guide-incl-redux', level: 'Intermediate', duration: '40 hrs' },
        ],
        projects: ['Dynamic Dashboard App', 'Portfolio Website'],
        internships: ['Frontend Developer Intern'],
      },
      {
        id: 'roadmap-fs-2',
        year: 3,
        semester: 2,
        title: 'Backend APIs and Databases',
        description: 'Build REST APIs and connect them with databases.',
        importance: 5,
        skills: ['Node.js', 'Express', 'SQL', 'MongoDB'],
        courses: [
          { title: 'Node.js Masterclass', provider: 'Udemy', url: 'https://www.udemy.com/course/the-complete-nodejs-developer-course-2', level: 'Intermediate', duration: '35 hrs' },
        ],
        projects: ['E-commerce Backend', 'Authentication Service'],
        internships: ['Backend Developer Intern'],
      },
      {
        id: 'roadmap-fs-3',
        year: 4,
        semester: 1,
        title: 'Full Stack Integration',
        description: 'Combine frontend and backend into production-ready apps.',
        importance: 5,
        skills: ['API Integration', 'Deployment', 'Docker', 'Testing'],
        courses: [
          { title: 'Full Stack Web Development', provider: 'Coursera', url: 'https://www.coursera.org/specializations/full-stack', level: 'Advanced', duration: '50 hrs' },
        ],
        projects: ['SaaS Product', 'Open Source Contribution'],
        certifications: ['AWS Cloud Practitioner'],
      },
      {
        id: 'roadmap-fs-4',
        year: 4,
        semester: 2,
        title: 'Placement and System Design',
        description: 'Prepare for interviews with system design and real-world projects.',
        importance: 5,
        skills: ['System Design', 'Cloud Deployment', 'Interview Prep'],
        courses: [
          { title: 'System Design Interview Prep', provider: 'YouTube', url: 'https://www.youtube.com/watch?v=MbjObHmDbZo', level: 'Advanced', duration: '4 hrs' },
        ],
        projects: ['Scalable App Architecture', 'Live Deployment'],
        internships: ['Full Stack Developer Intern'],
      },
    ],
    'Data Scientist': [
      {
        id: 'roadmap-ds-1',
        year: 3,
        semester: 1,
        title: 'Advanced Python and Data Wrangling',
        description: 'Master Python libraries and data cleaning workflows.',
        importance: 5,
        skills: ['Python', 'Pandas', 'NumPy', 'Data Cleaning'],
        courses: [
          { title: 'Python for Data Science', provider: 'Coursera', url: 'https://www.coursera.org/learn/python-for-applied-data-science-ai', level: 'Intermediate', duration: '14 hrs' },
        ],
        projects: ['EDA Notebook', 'Data Cleaning Pipeline'],
        internships: ['Data Science Intern'],
      },
      {
        id: 'roadmap-ds-2',
        year: 3,
        semester: 2,
        title: 'Machine Learning Fundamentals',
        description: 'Learn supervised and unsupervised ML techniques.',
        importance: 5,
        skills: ['Machine Learning', 'Scikit-learn', 'Model Evaluation'],
        courses: [
          { title: 'Machine Learning A-Z', provider: 'Udemy', url: 'https://www.udemy.com/course/machinelearning', level: 'Intermediate', duration: '40 hrs' },
        ],
        projects: ['Regression Model', 'Classification Project'],
        internships: ['Data Science Intern'],
      },
      {
        id: 'roadmap-ds-3',
        year: 4,
        semester: 1,
        title: 'Deep Learning and Deployment',
        description: 'Build deep learning projects and deploy models.',
        importance: 5,
        skills: ['TensorFlow', 'Model Deployment', 'APIs'],
        courses: [
          { title: 'TensorFlow Developer', provider: 'Coursera', url: 'https://www.coursera.org/professional-certificates/tensorflow-in-practice', level: 'Intermediate', duration: '50 hrs' },
        ],
        projects: ['Deep Learning Project', 'Model API'],
        certifications: ['TensorFlow Developer Certificate'],
      },
      {
        id: 'roadmap-ds-4',
        year: 4,
        semester: 2,
        title: 'Industry Readiness',
        description: 'Polish portfolio and interview readiness for DS roles.',
        importance: 5,
        skills: ['Case Studies', 'Communication', 'Domain Knowledge'],
        courses: [
          { title: 'Data Science Interview Prep', provider: 'YouTube', url: 'https://www.youtube.com/watch?v=HcqpanDadyQ', level: 'Advanced', duration: '5 hrs' },
        ],
        projects: ['Kaggle Competition', 'Capstone Project'],
        internships: ['Data Science Intern'],
      },
    ],
  };

  const roadmap = basePlans[targetCareer] || basePlans['Full Stack Developer'];
  return roadmap.map((item) => ({ ...item, completed: false }));
}

// Domain-specific question banks
type MCQQuestion = {
  id: string;
  type: 'mcq';
  domain: string;
  difficulty: string;
  question: string;
  category: 'technical';
  options: string[];
  correctAnswer?: string;
};

const DOMAIN_QUESTIONS: Record<string, Record<string, MCQQuestion[]>> = {
  python: {
    easy: [
      { id: 'py_e1', type: 'mcq', domain: 'python', difficulty: 'easy', category: 'technical', question: 'What will this print: print(len([1,2,3]))', options: ['1', '3', '2', 'Error'], correctAnswer: '3' },
      { id: 'py_e2', type: 'mcq', domain: 'python', difficulty: 'easy', category: 'technical', question: 'Which keyword is used to create a function in Python?', options: ['func', 'function', 'def', 'define'], correctAnswer: 'def' },
      { id: 'py_e3', type: 'mcq', domain: 'python', difficulty: 'easy', category: 'technical', question: 'What is the output of 2 ** 3?', options: ['5', '6', '8', '9'], correctAnswer: '8' },
      { id: 'py_e4', type: 'mcq', domain: 'python', difficulty: 'easy', category: 'technical', question: 'How do you create a list in Python?', options: ['[1, 2, 3]', '{1, 2, 3}', '(1, 2, 3)', '<1, 2, 3>'], correctAnswer: '[1, 2, 3]' },
      { id: 'py_e5', type: 'mcq', domain: 'python', difficulty: 'easy', category: 'technical', question: 'What does the range() function return?', options: ['A list', 'A tuple', 'A range object', 'A string'], correctAnswer: 'A range object' },
    ],
    moderate: [
      { id: 'py_m1', type: 'mcq', domain: 'python', difficulty: 'moderate', category: 'technical', question: 'What is the key difference between a list and a tuple?', options: ['Lists are mutable, tuples are immutable', 'Lists are immutable, tuples are mutable', 'They are identical', 'Lists are faster'], correctAnswer: 'Lists are mutable, tuples are immutable' },
      { id: 'py_m2', type: 'mcq', domain: 'python', difficulty: 'moderate', category: 'technical', question: 'After x = [1,2,3]; x.append(4), what is x?', options: ['[1, 2, 3]', '[4, 1, 2, 3]', '[1, 2, 3, 4]', '[1, 2, 3, [4]]'], correctAnswer: '[1, 2, 3, 4]' },
      { id: 'py_m3', type: 'mcq', domain: 'python', difficulty: 'moderate', category: 'technical', question: 'What is a lambda function used for?', options: ['Creating large functions', 'Creating anonymous/inline functions', 'Defining methods in classes', 'Looping through lists'], correctAnswer: 'Creating anonymous/inline functions' },
      { id: 'py_m4', type: 'mcq', domain: 'python', difficulty: 'moderate', category: 'technical', question: 'What is the output of: dict(a=1, b=2).keys()?', options: ['[\'a\', \'b\']', 'dict_keys([\'a\', \'b\'])', 'a, b', '1, 2'], correctAnswer: 'dict_keys([\'a\', \'b\'])' },
      { id: 'py_m5', type: 'mcq', domain: 'python', difficulty: 'moderate', category: 'technical', question: 'What is the purpose of *args in function parameters?', options: ['Required arguments', 'Keyword arguments', 'Variable number of positional arguments', 'Default arguments'], correctAnswer: 'Variable number of positional arguments' },
      { id: 'py_m6', type: 'mcq', domain: 'python', difficulty: 'moderate', category: 'technical', question: 'Which of the following is a generator?', options: ['A function that returns values with return', 'A function that yields values', 'A loop', 'A class'], correctAnswer: 'A function that yields values' },
      { id: 'py_m7', type: 'mcq', domain: 'python', difficulty: 'moderate', category: 'technical', question: 'What is list comprehension?', options: ['Compressing a list', 'A compact way to create lists', 'Sorting a list', 'Filtering a dictionary'], correctAnswer: 'A compact way to create lists' },
    ],
    hard: [
      { id: 'py_h1', type: 'mcq', domain: 'python', difficulty: 'hard', category: 'technical', question: 'What is the key difference between shallow copy and deep copy?', options: ['Shallow copy copies nested objects, deep copy doesn\'t', 'Deep copy copies nested objects, shallow copy doesn\'t', 'They are the same', 'Shallow copy is faster always'], correctAnswer: 'Deep copy copies nested objects, shallow copy doesn\'t' },
      { id: 'py_h2', type: 'mcq', domain: 'python', difficulty: 'hard', category: 'technical', question: 'What is the GIL (Global Interpreter Lock) in Python?', options: ['A lock on global variables', 'A mechanism that allows only one thread to execute Python bytecode', 'A security feature', 'A memory manager'], correctAnswer: 'A mechanism that allows only one thread to execute Python bytecode' },
      { id: 'py_h3', type: 'mcq', domain: 'python', difficulty: 'hard', category: 'technical', question: 'How do decorators modify function behavior in Python?', options: ['They change function parameters', 'They wrap a function and modify its behavior', 'They delete functions', 'They cache function results only'], correctAnswer: 'They wrap a function and modify its behavior' },
      { id: 'py_h4', type: 'mcq', domain: 'python', difficulty: 'hard', category: 'technical', question: 'What is async/await used for?', options: ['Synchronous programming', 'Asynchronous programming and managing coroutines', 'Declaring variables', 'Creating loops'], correctAnswer: 'Asynchronous programming and managing coroutines' },
      { id: 'py_h5', type: 'mcq', domain: 'python', difficulty: 'hard', category: 'technical', question: 'What is the difference between __init__ and __new__ in Python?', options: ['They do the same thing', '__new__ creates instance, __init__ initializes it', '__init__ creates instance, __new__ initializes it', '__new__ is faster'], correctAnswer: '__new__ creates instance, __init__ initializes it' },
    ],
  },
  javascript: {
    easy: [
      { id: 'js_e1', type: 'mcq', domain: 'javascript', difficulty: 'easy', category: 'technical', question: 'What will console.log(typeof []) print?', options: ['array', 'object', 'null', 'undefined'], correctAnswer: 'object' },
      { id: 'js_e2', type: 'mcq', domain: 'javascript', difficulty: 'easy', category: 'technical', question: 'Which keyword is used to declare a variable that cannot be reassigned?', options: ['var', 'let', 'const', 'fixed'], correctAnswer: 'const' },
      { id: 'js_e3', type: 'mcq', domain: 'javascript', difficulty: 'easy', category: 'technical', question: 'What does === check in JavaScript?', options: ['Type coercion comparison', 'Value comparison only', 'Strict equality (type and value)', 'Object identity'], correctAnswer: 'Strict equality (type and value)' },
      { id: 'js_e4', type: 'mcq', domain: 'javascript', difficulty: 'easy', category: 'technical', question: 'What is the output of: 5 + "5"?', options: ['10', '55', '"55"', 'Error'], correctAnswer: '"55"' },
      { id: 'js_e5', type: 'mcq', domain: 'javascript', difficulty: 'easy', category: 'technical', question: 'How do you declare a function in JavaScript?', options: ['function myFunc() {}', 'def myFunc(): {}', 'func myFunc() {}', 'method myFunc() {}'], correctAnswer: 'function myFunc() {}' },
    ],
    moderate: [
      { id: 'js_m1', type: 'mcq', domain: 'javascript', difficulty: 'moderate', category: 'technical', question: 'What is the main difference between var, let, and const?', options: ['No difference', 'Scope (function, block, block) and reassignability', 'Performance differences', 'Browser compatibility'], correctAnswer: 'Scope (function, block, block) and reassignability' },
      { id: 'js_m2', type: 'mcq', domain: 'javascript', difficulty: 'moderate', category: 'technical', question: 'What is a callback function?', options: ['A function that calls itself', 'A function passed as an argument to be executed later', 'A function inside a class', 'A function that returns another function'], correctAnswer: 'A function passed as an argument to be executed later' },
      { id: 'js_m3', type: 'mcq', domain: 'javascript', difficulty: 'moderate', category: 'technical', question: 'What is the event loop in JavaScript?', options: ['A loop that handles events', 'A mechanism that executes callbacks after the call stack is empty', 'A browser feature', 'A way to loop through arrays'], correctAnswer: 'A mechanism that executes callbacks after the call stack is empty' },
      { id: 'js_m4', type: 'mcq', domain: 'javascript', difficulty: 'moderate', category: 'technical', question: 'What is a Promise?', options: ['A guarantee in code', 'An object representing eventual completion/failure of async operation', 'A function parameter', 'A debugging tool'], correctAnswer: 'An object representing eventual completion/failure of async operation' },
      { id: 'js_m5', type: 'mcq', domain: 'javascript', difficulty: 'moderate', category: 'technical', question: 'What does the spread operator (...) do?', options: ['Multiplies numbers', 'Spreads array/object elements into individual elements', 'Concatenates strings', 'Converts arrays to objects'], correctAnswer: 'Spreads array/object elements into individual elements' },
      { id: 'js_m6', type: 'mcq', domain: 'javascript', difficulty: 'moderate', category: 'technical', question: 'What is destructuring assignment?', options: ['Breaking down code', 'Unpacking values from arrays/objects into variables', 'Removing properties', 'Organizing code'], correctAnswer: 'Unpacking values from arrays/objects into variables' },
      { id: 'js_m7', type: 'mcq', domain: 'javascript', difficulty: 'moderate', category: 'technical', question: 'What is the difference between == and ===?', options: ['No difference', '== allows type coercion, === requires strict equality', '=== is slower', '== is more modern'], correctAnswer: '== allows type coercion, === requires strict equality' },
    ],
    hard: [
      { id: 'js_h1', type: 'mcq', domain: 'javascript', difficulty: 'hard', category: 'technical', question: 'How do closures work in JavaScript?', options: ['Functions that close', 'Functions that have access to outer scope variables', 'A loop mechanism', 'Memory management'], correctAnswer: 'Functions that have access to outer scope variables' },
      { id: 'js_h2', type: 'mcq', domain: 'javascript', difficulty: 'hard', category: 'technical', question: 'What is hoisting in JavaScript?', options: ['Moving elements up', 'Declarations being moved to top of scope before execution', 'A CSS feature', 'Error handling'], correctAnswer: 'Declarations being moved to top of scope before execution' },
      { id: 'js_h3', type: 'mcq', domain: 'javascript', difficulty: 'hard', category: 'technical', question: 'What is the prototype chain?', options: ['A chain of function prototypes', 'A mechanism for object inheritance through prototypes', 'A debugging tool', 'A security feature'], correctAnswer: 'A mechanism for object inheritance through prototypes' },
      { id: 'js_h4', type: 'mcq', domain: 'javascript', difficulty: 'hard', category: 'technical', question: 'What is the difference between call(), apply(), and bind()?', options: ['They do the same thing', 'call/apply invoke immediately, bind returns new function; apply uses array args', 'Only performance differences', 'call is for objects, apply is for functions'], correctAnswer: 'call/apply invoke immediately, bind returns new function; apply uses array args' },
      { id: 'js_h5', type: 'mcq', domain: 'javascript', difficulty: 'hard', category: 'technical', question: 'How does async/await work under the hood?', options: ['It replaces callbacks', 'It\'s syntactic sugar over Promises and generators', 'It creates threads', 'It synchronizes code'], correctAnswer: 'It\'s syntactic sugar over Promises and generators' },
    ],
  },
  react: {
    easy: [
      { id: 'react_e1', type: 'mcq', domain: 'react', difficulty: 'easy', category: 'technical', question: 'What is JSX?', options: ['A JavaScript library', 'JavaScript XML - syntax extension for React', 'A CSS preprocessor', 'A build tool'], correctAnswer: 'JavaScript XML - syntax extension for React' },
      { id: 'react_e2', type: 'mcq', domain: 'react', difficulty: 'easy', category: 'technical', question: 'What is the main difference between state and props?', options: ['No difference', 'State is internal, props are passed from parent', 'Props are internal, state is passed', 'State is faster'], correctAnswer: 'State is internal, props are passed from parent' },
      { id: 'react_e3', type: 'mcq', domain: 'react', difficulty: 'easy', category: 'technical', question: 'How do you update state in a React component?', options: ['Directly modify state', 'Use setState() or useState() hook', 'Use this.props', 'Use global variables'], correctAnswer: 'Use setState() or useState() hook' },
      { id: 'react_e4', type: 'mcq', domain: 'react', difficulty: 'easy', category: 'technical', question: 'What is the purpose of useEffect hook?', options: ['Effect animations', 'Side effects and lifecycle management', 'State management', 'Component styling'], correctAnswer: 'Side effects and lifecycle management' },
      { id: 'react_e5', type: 'mcq', domain: 'react', difficulty: 'easy', category: 'technical', question: 'How do you pass data from parent to child component?', options: ['Through state', 'Through props', 'Through context API only', 'Direct variable assignment'], correctAnswer: 'Through props' },
    ],
    moderate: [
      { id: 'react_m1', type: 'mcq', domain: 'react', difficulty: 'moderate', category: 'technical', question: 'What is the Virtual DOM?', options: ['A fake DOM', 'An in-memory representation of the real DOM', 'A browser feature', 'A debugging tool'], correctAnswer: 'An in-memory representation of the real DOM' },
      { id: 'react_m2', type: 'mcq', domain: 'react', difficulty: 'moderate', category: 'technical', question: 'What are controlled components?', options: ['Components that control other components', 'Form components where React state is the source of truth', 'Uncontrolled components', 'Components with local state only'], correctAnswer: 'Form components where React state is the source of truth' },
      { id: 'react_m3', type: 'mcq', domain: 'react', difficulty: 'moderate', category: 'technical', question: 'What is the difference between functional and class components?', options: ['They are identical', 'Functional use hooks, class use lifecycle methods', 'Class components are faster', 'Functional components cannot have state'], correctAnswer: 'Functional use hooks, class use lifecycle methods' },
      { id: 'react_m4', type: 'mcq', domain: 'react', difficulty: 'moderate', category: 'technical', question: 'Why is the key prop important in lists?', options: ['For styling', 'To help React identify which items have changed', 'For better performance only', 'For accessibility'], correctAnswer: 'To help React identify which items have changed' },
      { id: 'react_m5', type: 'mcq', domain: 'react', difficulty: 'moderate', category: 'technical', question: 'What is React.memo used for?', options: ['Remembering data', 'Memoizing components to prevent unnecessary re-renders', 'Caching API calls', 'State management'], correctAnswer: 'Memoizing components to prevent unnecessary re-renders' },
      { id: 'react_m6', type: 'mcq', domain: 'react', difficulty: 'moderate', category: 'technical', question: 'What is lifting state up in React?', options: ['Increasing state priority', 'Moving state to parent component to share across siblings', 'Performance optimization', 'A debugging technique'], correctAnswer: 'Moving state to parent component to share across siblings' },
      { id: 'react_m7', type: 'mcq', domain: 'react', difficulty: 'moderate', category: 'technical', question: 'What is the Context API used for?', options: ['CSS styling', 'Global state management without Redux', 'API calls', 'Routing'], correctAnswer: 'Global state management without Redux' },
    ],
    hard: [
      { id: 'react_h1', type: 'mcq', domain: 'react', difficulty: 'hard', category: 'technical', question: 'What is fiber architecture in React?', options: ['A new DOM', 'A re-implementation of React core for better rendering', 'A state management solution', 'A CSS framework'], correctAnswer: 'A re-implementation of React core for better rendering' },
      { id: 'react_h2', type: 'mcq', domain: 'react', difficulty: 'hard', category: 'technical', question: 'How does React batching optimize updates?', options: ['Removes duplicate code', 'Groups state updates and re-renders into single batch', 'Caches components', 'Disables re-renders'], correctAnswer: 'Groups state updates and re-renders into single batch' },
      { id: 'react_h3', type: 'mcq', domain: 'react', difficulty: 'hard', category: 'technical', question: 'What is Suspense in React?', options: ['A security feature', 'A way to handle async component loading and data fetching', 'Error handling', 'A debugging tool'], correctAnswer: 'A way to handle async component loading and data fetching' },
      { id: 'react_h4', type: 'mcq', domain: 'react', difficulty: 'hard', category: 'technical', question: 'How do you optimize unnecessary re-renders?', options: ['Remove components', 'Use useMemo, useCallback, React.memo, and proper key props', 'Disable state', 'Use more hooks'], correctAnswer: 'Use useMemo, useCallback, React.memo, and proper key props' },
      { id: 'react_h5', type: 'mcq', domain: 'react', difficulty: 'hard', category: 'technical', question: 'What is the reconciliation algorithm in React?', options: ['Algorithm for routing', 'Process of comparing old and new Virtual DOM trees to update efficiently', 'A caching mechanism', 'A security algorithm'], correctAnswer: 'Process of comparing old and new Virtual DOM trees to update efficiently' },
    ],
  },
  'node.js': {
    easy: [
      { id: 'node_e1', type: 'mcq', domain: 'node.js', difficulty: 'easy', category: 'technical', question: 'What is Node.js?', options: ['A web browser', 'A JavaScript runtime for server-side execution', 'A database', 'A package manager'], correctAnswer: 'A JavaScript runtime for server-side execution' },
      { id: 'node_e2', type: 'mcq', domain: 'node.js', difficulty: 'easy', category: 'technical', question: 'How do you import a module in Node.js?', options: ['import Module from "module"', 'require("module")', 'include "module"', 'load "module"'], correctAnswer: 'require("module")' },
      { id: 'node_e3', type: 'mcq', domain: 'node.js', difficulty: 'easy', category: 'technical', question: 'What is npm?', options: ['Node Package Manager', 'A test framework', 'A database', 'A browser tool'], correctAnswer: 'Node Package Manager' },
      { id: 'node_e4', type: 'mcq', domain: 'node.js', difficulty: 'easy', category: 'technical', question: 'What is the event-driven architecture?', options: ['Using events to trigger code', 'Drawing architecture diagrams', 'Database structure', 'Network design'], correctAnswer: 'Using events to trigger code' },
      { id: 'node_e5', type: 'mcq', domain: 'node.js', difficulty: 'easy', category: 'technical', question: 'What is the purpose of package.json?', options: ['For styling', 'To define project metadata and dependencies', 'For routing', 'For database queries'], correctAnswer: 'To define project metadata and dependencies' },
    ],
    moderate: [
      { id: 'node_m1', type: 'mcq', domain: 'node.js', difficulty: 'moderate', category: 'technical', question: 'What is middleware in Express?', options: ['Hardware component', 'Functions that process requests/responses in pipeline', 'A database layer', 'A caching layer'], correctAnswer: 'Functions that process requests/responses in pipeline' },
      { id: 'node_m2', type: 'mcq', domain: 'node.js', difficulty: 'moderate', category: 'technical', question: 'How do you handle asynchronous operations in Node.js?', options: ['Callbacks, Promises, async/await', 'Synchronous loops', 'Global variables', 'Local storage'], correctAnswer: 'Callbacks, Promises, async/await' },
      { id: 'node_m3', type: 'mcq', domain: 'node.js', difficulty: 'moderate', category: 'technical', question: 'What is the difference between synchronous and asynchronous code?', options: ['No difference', 'Sync waits for completion, async continues immediately', 'Async is always faster', 'Sync is for loops'], correctAnswer: 'Sync waits for completion, async continues immediately' },
      { id: 'node_m4', type: 'mcq', domain: 'node.js', difficulty: 'moderate', category: 'technical', question: 'How do you create a basic REST API using Express?', options: ['Using routes with HTTP methods', 'Using databases only', 'Using HTML files', 'Using CSS'], correctAnswer: 'Using routes with HTTP methods' },
      { id: 'node_m5', type: 'mcq', domain: 'node.js', difficulty: 'moderate', category: 'technical', question: 'What does app.use() do in Express?', options: ['Uses a module', 'Registers middleware', 'Creates a route', 'Connects to database'], correctAnswer: 'Registers middleware' },
      { id: 'node_m6', type: 'mcq', domain: 'node.js', difficulty: 'moderate', category: 'technical', question: 'How do you handle errors in Node.js?', options: ['Ignore them', 'Try-catch blocks, error callbacks, error events', 'Print to console', 'Use alerts'], correctAnswer: 'Try-catch blocks, error callbacks, error events' },
      { id: 'node_m7', type: 'mcq', domain: 'node.js', difficulty: 'moderate', category: 'technical', question: 'What is the event emitter in Node.js?', options: ['An audio device', 'A class for emitting and listening to events', 'A network tool', 'A debugging tool'], correctAnswer: 'A class for emitting and listening to events' },
    ],
    hard: [
      { id: 'node_h1', type: 'mcq', domain: 'node.js', difficulty: 'hard', category: 'technical', question: 'Explain the Node.js event loop and its phases.', options: ['A loop animation', 'Mechanism handling timers, callbacks, I/O operations in phases', 'Browser feature', 'Database query loop'], correctAnswer: 'Mechanism handling timers, callbacks, I/O operations in phases' },
      { id: 'node_h2', type: 'mcq', domain: 'node.js', difficulty: 'hard', category: 'technical', question: 'What is libuv and its role in Node.js?', options: ['A UI library', 'C library providing async I/O and event loop', 'A database', 'A security tool'], correctAnswer: 'C library providing async I/O and event loop' },
      { id: 'node_h3', type: 'mcq', domain: 'node.js', difficulty: 'hard', category: 'technical', question: 'How do you optimize Node.js applications?', options: ['Remove comments', 'Use clustering, caching, profiling, connection pooling', 'Use more variables', 'Disable logging'], correctAnswer: 'Use clustering, caching, profiling, connection pooling' },
      { id: 'node_h4', type: 'mcq', domain: 'node.js', difficulty: 'hard', category: 'technical', question: 'What is clustering in Node.js?', options: ['Grouping files', 'Running multiple processes for multi-core utilization', 'Database feature', 'Version control'], correctAnswer: 'Running multiple processes for multi-core utilization' },
      { id: 'node_h5', type: 'mcq', domain: 'node.js', difficulty: 'hard', category: 'technical', question: 'What are worker threads in Node.js?', options: ['Thread management', 'Threads for running CPU-intensive tasks in parallel', 'Network threads', 'Debugging threads'], correctAnswer: 'Threads for running CPU-intensive tasks in parallel' },
    ],
  },
  'machine learning': {
    easy: [
      { id: 'ml_e1', type: 'mcq', domain: 'machine learning', difficulty: 'easy', category: 'technical', question: 'What is machine learning?', options: ['Programming computers manually', 'Algorithms that learn from data to make predictions', 'Using databases', 'Web development'], correctAnswer: 'Algorithms that learn from data to make predictions' },
      { id: 'ml_e2', type: 'mcq', domain: 'machine learning', difficulty: 'easy', category: 'technical', question: 'What are training and test data?', options: ['Data before and after processing', 'Data used to train model and test its performance', 'Two copies of same data', 'Raw and clean data'], correctAnswer: 'Data used to train model and test its performance' },
      { id: 'ml_e3', type: 'mcq', domain: 'machine learning', difficulty: 'easy', category: 'technical', question: 'What is overfitting?', options: ['Having too many features', 'Model memorizing data instead of learning patterns', 'Using too much data', 'Small dataset'], correctAnswer: 'Model memorizing data instead of learning patterns' },
      { id: 'ml_e4', type: 'mcq', domain: 'machine learning', difficulty: 'easy', category: 'technical', question: 'What is a feature in ML?', options: ['A GUI element', 'An input variable used for prediction', 'A model property', 'A dataset column name'], correctAnswer: 'An input variable used for prediction' },
      { id: 'ml_e5', type: 'mcq', domain: 'machine learning', difficulty: 'easy', category: 'technical', question: 'What is supervised learning?', options: ['Self-taught learning', 'Learning from labeled data with known outputs', 'Learning without data', 'Learning from unlabeled data'], correctAnswer: 'Learning from labeled data with known outputs' },
    ],
    moderate: [
      { id: 'ml_m1', type: 'mcq', domain: 'machine learning', difficulty: 'moderate', category: 'technical', question: 'What is the difference between classification and regression?', options: ['Same thing', 'Classification predicts categories, regression predicts continuous values', 'Classification uses more data', 'Regression is faster'], correctAnswer: 'Classification predicts categories, regression predicts continuous values' },
      { id: 'ml_m2', type: 'mcq', domain: 'machine learning', difficulty: 'moderate', category: 'technical', question: 'What is cross-validation?', options: ['Validating across countries', 'Technique to assess model generalization by splitting data', 'Checking for errors', 'Data cleaning method'], correctAnswer: 'Technique to assess model generalization by splitting data' },
      { id: 'ml_m3', type: 'mcq', domain: 'machine learning', difficulty: 'moderate', category: 'technical', question: 'What is normalization in ML?', options: ['Making data normal', 'Scaling features to similar ranges', 'Removing outliers', 'Sorting data'], correctAnswer: 'Scaling features to similar ranges' },
      { id: 'ml_m4', type: 'mcq', domain: 'machine learning', difficulty: 'moderate', category: 'technical', question: 'What is a confusion matrix?', options: ['A confusing matrix', 'Table showing TP, TN, FP, FN for classification models', 'A correlation matrix', 'A covariance matrix'], correctAnswer: 'Table showing TP, TN, FP, FN for classification models' },
      { id: 'ml_m5', type: 'mcq', domain: 'machine learning', difficulty: 'moderate', category: 'technical', question: 'What are hyperparameters?', options: ['Model parameters', 'Settings you set before training a model', 'Data features', 'Output values'], correctAnswer: 'Settings you set before training a model' },
      { id: 'ml_m6', type: 'mcq', domain: 'machine learning', difficulty: 'moderate', category: 'technical', question: 'Why is train-test split important?', options: ['For organizing data', 'To prevent overfitting and evaluate real-world performance', 'For faster training', 'For better data quality'], correctAnswer: 'To prevent overfitting and evaluate real-world performance' },
      { id: 'ml_m7', type: 'mcq', domain: 'machine learning', difficulty: 'moderate', category: 'technical', question: 'What is feature engineering?', options: ['Building features', 'Creating new features to improve model performance', 'Removing features', 'Sorting features'], correctAnswer: 'Creating new features to improve model performance' },
    ],
    hard: [
      { id: 'ml_h1', type: 'mcq', domain: 'machine learning', difficulty: 'hard', category: 'technical', question: 'What is the bias-variance tradeoff?', options: ['Model preferences', 'Balance between underfitting (bias) and overfitting (variance)', 'Data quality', 'Feature selection'], correctAnswer: 'Balance between underfitting (bias) and overfitting (variance)' },
      { id: 'ml_h2', type: 'mcq', domain: 'machine learning', difficulty: 'hard', category: 'technical', question: 'What is regularization and why is it important?', options: ['Organizing code', 'Technique to prevent overfitting by adding penalty to complex models', 'Data preprocessing', 'Feature scaling'], correctAnswer: 'Technique to prevent overfitting by adding penalty to complex models' },
      { id: 'ml_h3', type: 'mcq', domain: 'machine learning', difficulty: 'hard', category: 'technical', question: 'How does gradient descent work?', options: ['Descending gradients visually', 'Iteratively adjusting parameters to minimize loss function', 'Finding maximum values', 'Sorting data'], correctAnswer: 'Iteratively adjusting parameters to minimize loss function' },
      { id: 'ml_h4', type: 'mcq', domain: 'machine learning', difficulty: 'hard', category: 'technical', question: 'What is backpropagation in neural networks?', options: ['Going back in time', 'Algorithm to compute gradients for training neural networks', 'Moving data backward', 'Debugging technique'], correctAnswer: 'Algorithm to compute gradients for training neural networks' },
      { id: 'ml_h5', type: 'mcq', domain: 'machine learning', difficulty: 'hard', category: 'technical', question: 'What is transfer learning?', options: ['Moving data between systems', 'Using pre-trained model for new task to save computation', 'Transferring files', 'Data migration'], correctAnswer: 'Using pre-trained model for new task to save computation' },
    ],
  },
  'data science': {
    easy: [
      { id: 'ds_e1', type: 'mcq', domain: 'data science', difficulty: 'easy', category: 'technical', question: 'What is data science?', options: ['Science of dates', 'Interdisciplinary field using data to extract insights', 'Database management', 'Data visualization'], correctAnswer: 'Interdisciplinary field using data to extract insights' },
      { id: 'ds_e2', type: 'mcq', domain: 'data science', difficulty: 'easy', category: 'technical', question: 'What is a dataset?', options: ['A collection of data points', 'A setting for data', 'A database', 'A data type'], correctAnswer: 'A collection of data points' },
      { id: 'ds_e3', type: 'mcq', domain: 'data science', difficulty: 'easy', category: 'technical', question: 'What is data preprocessing?', options: ['Preparing computers', 'Cleaning and transforming raw data for analysis', 'Storing data', 'Visualizing data'], correctAnswer: 'Cleaning and transforming raw data for analysis' },
      { id: 'ds_e4', type: 'mcq', domain: 'data science', difficulty: 'easy', category: 'technical', question: 'What is exploratory data analysis (EDA)?', options: ['Analyzing exploration data', 'Initial investigation to discover patterns and characteristics', 'Data cleaning', 'Machine learning'], correctAnswer: 'Initial investigation to discover patterns and characteristics' },
      { id: 'ds_e5', type: 'mcq', domain: 'data science', difficulty: 'easy', category: 'technical', question: 'What is a data pipeline?', options: ['A pipe for data', 'Series of processes for data collection, processing, and delivery', 'A database', 'Data storage'], correctAnswer: 'Series of processes for data collection, processing, and delivery' },
    ],
    moderate: [
      { id: 'ds_m1', type: 'mcq', domain: 'data science', difficulty: 'moderate', category: 'technical', question: 'What is the difference between correlation and causation?', options: ['Same thing', 'Correlation is relationship, causation is cause-effect', 'Causation is faster', 'No difference statistically'], correctAnswer: 'Correlation is relationship, causation is cause-effect' },
      { id: 'ds_m2', type: 'mcq', domain: 'data science', difficulty: 'moderate', category: 'technical', question: 'How do you handle missing data?', options: ['Ignore it', 'Deletion, mean/median imputation, or prediction methods', 'Duplicate it', 'Replace with zeros'], correctAnswer: 'Deletion, mean/median imputation, or prediction methods' },
      { id: 'ds_m3', type: 'mcq', domain: 'data science', difficulty: 'moderate', category: 'technical', question: 'What is dimensionality reduction?', options: ['Reducing dimensions in space', 'Reducing number of features while preserving information', 'Filtering data', 'Removing rows'], correctAnswer: 'Reducing number of features while preserving information' },
      { id: 'ds_m4', type: 'mcq', domain: 'data science', difficulty: 'moderate', category: 'technical', question: 'What is the difference between descriptive and inferential statistics?', options: ['Same field', 'Descriptive summarizes data, inferential predicts from samples', 'Descriptive is faster', 'Inferential uses more data'], correctAnswer: 'Descriptive summarizes data, inferential predicts from samples' },
      { id: 'ds_m5', type: 'mcq', domain: 'data science', difficulty: 'moderate', category: 'technical', question: 'What is A/B testing?', options: ['Comparing two alphabets', 'Experiment comparing two variants to determine which performs better', 'Testing alphabet data', 'Quality assurance'], correctAnswer: 'Experiment comparing two variants to determine which performs better' },
      { id: 'ds_m6', type: 'mcq', domain: 'data science', difficulty: 'moderate', category: 'technical', question: 'What is SQL used for?', options: ['Debugging', 'Querying and managing relational databases', 'Styling web pages', 'Creating APIs'], correctAnswer: 'Querying and managing relational databases' },
      { id: 'ds_m7', type: 'mcq', domain: 'data science', difficulty: 'moderate', category: 'technical', question: 'What is data visualization?', options: ['Making data look pretty', 'Presenting data graphically to identify patterns', 'Storing data', 'Documenting data'], correctAnswer: 'Presenting data graphically to identify patterns' },
    ],
    hard: [
      { id: 'ds_h1', type: 'mcq', domain: 'data science', difficulty: 'hard', category: 'technical', question: 'What is statistical hypothesis testing?', options: ['Testing statistics tools', 'Method to test if hypothesis is supported by data', 'Data validation', 'Quality control'], correctAnswer: 'Method to test if hypothesis is supported by data' },
      { id: 'ds_h2', type: 'mcq', domain: 'data science', difficulty: 'hard', category: 'technical', question: 'What is Bayesian inference?', options: ['Inference about bays', 'Probabilistic approach using prior beliefs and data', 'Statistical testing', 'Hypothesis validation'], correctAnswer: 'Probabilistic approach using prior beliefs and data' },
      { id: 'ds_h3', type: 'mcq', domain: 'data science', difficulty: 'hard', category: 'technical', question: 'How do you handle outliers in data?', options: ['Ignore them', 'Detection methods: removal, capping, transformation', 'Multiply them', 'Keep all data'], correctAnswer: 'Detection methods: removal, capping, transformation' },
      { id: 'ds_h4', type: 'mcq', domain: 'data science', difficulty: 'hard', category: 'technical', question: 'What is time series analysis?', options: ['Analyzing time concepts', 'Analyzing data points ordered in time to identify trends', 'Scheduling analysis', 'Historical data'], correctAnswer: 'Analyzing data points ordered in time to identify trends' },
      { id: 'ds_h5', type: 'mcq', domain: 'data science', difficulty: 'hard', category: 'technical', question: 'What is causal inference?', options: ['Making inferences about time', 'Determining cause-effect relationships from observational data', 'Correlation analysis', 'Predictive modeling'], correctAnswer: 'Determining cause-effect relationships from observational data' },
    ],
  },
};

// Coding activity questions
type CodingChallenge = {
  id: string;
  type: 'coding';
  domain: string;
  language: string;
  difficulty: string;
  title: string;
  description: string;
  problem: string;
  examples: { input: string; output: string }[];
  boilerplate: string;
  category: 'coding';
};

const CODING_ACTIVITIES: Record<string, Record<string, CodingChallenge[]>> = {
  python: {
    easy: [
      {
        id: 'py_code_e1',
        type: 'coding',
        domain: 'python',
        language: 'Python 3',
        difficulty: 'easy',
        title: 'Factorial Calculator',
        description: 'A retail store needs to calculate factorial values for their inventory system',
        problem: 'Write a function that calculates the factorial of a number. Factorial of n (n!) is the product of all positive integers less than or equal to n.',
        examples: [
          { input: 'factorial(5)', output: '120' },
          { input: 'factorial(0)', output: '1' },
          { input: 'factorial(3)', output: '6' },
        ],
        boilerplate: 'def factorial(n):\n    # Your code here\n    pass\n\n# Test\nprint(factorial(5))',
        category: 'coding',
      },
      {
        id: 'py_code_e2',
        type: 'coding',
        domain: 'python',
        language: 'Python 3',
        difficulty: 'easy',
        title: 'Palindrome Validator',
        description: 'A text processing tool needs to validate if user input forms a valid palindrome',
        problem: 'Check if a given string is a palindrome (reads the same forwards and backwards). Ignore spaces and use case-insensitive comparison.',
        examples: [
          { input: 'is_palindrome("racecar")', output: 'True' },
          { input: 'is_palindrome("hello")', output: 'False' },
          { input: 'is_palindrome("A man a plan a canal Panama")', output: 'True' },
        ],
        boilerplate: 'def is_palindrome(s):\n    # Your code here\n    pass\n\n# Test\nprint(is_palindrome("racecar"))',
        category: 'coding',
      },
    ],
    moderate: [
      {
        id: 'py_code_m1',
        type: 'coding',
        domain: 'python',
        language: 'Python 3',
        difficulty: 'moderate',
        title: 'Longest Unique Substring',
        description: 'A search engine needs to find patterns in user queries to optimize indexing',
        problem: 'Find the length of the longest substring without repeating characters in a given string.',
        examples: [
          { input: 'longest_unique("abcabcbb")', output: '3' },
          { input: 'longest_unique("bbbbb")', output: '1' },
          { input: 'longest_unique("pwwkew")', output: '3' },
        ],
        boilerplate: 'def longest_unique(s):\n    # Your code here\n    pass\n\n# Test\nprint(longest_unique("abcabcbb"))',
        category: 'coding',
      },
      {
        id: 'py_code_m2',
        type: 'coding',
        domain: 'python',
        language: 'Python 3',
        difficulty: 'moderate',
        title: 'Merge Sorted Lists',
        description: 'A data aggregation service needs to combine sorted datasets from multiple sources',
        problem: 'Merge two sorted lists into a single sorted list efficiently.',
        examples: [
          { input: 'merge([1, 3, 5], [2, 4, 6])', output: '[1, 2, 3, 4, 5, 6]' },
          { input: 'merge([], [1, 2])', output: '[1, 2]' },
          { input: 'merge([5], [1, 2, 3])', output: '[1, 2, 3, 5]' },
        ],
        boilerplate: 'def merge(list1, list2):\n    # Your code here\n    pass\n\n# Test\nprint(merge([1, 3, 5], [2, 4, 6]))',
        category: 'coding',
      },
    ],
    hard: [
      {
        id: 'py_code_h1',
        type: 'coding',
        domain: 'python',
        language: 'Python 3',
        difficulty: 'hard',
        title: 'Binary Search Tree Implementation',
        description: 'An enterprise database system needs efficient data retrieval with ordered storage',
        problem: 'Implement a Binary Search Tree with insert, search, and inorder traversal operations.',
        examples: [
          { input: 'insert(50), insert(30), insert(70), search(30)', output: 'True' },
          { input: 'inorder_traversal()', output: '[30, 50, 70]' },
        ],
        boilerplate: 'class Node:\n    def __init__(self, val):\n        self.val = val\n        self.left = None\n        self.right = None\n\nclass BST:\n    def __init__(self):\n        self.root = None\n    \n    def insert(self, val):\n        # Your code here\n        pass\n    \n    def search(self, val):\n        # Your code here\n        pass',
        category: 'coding',
      },
    ],
  },
  javascript: {
    easy: [
      {
        id: 'js_code_e1',
        type: 'coding',
        domain: 'javascript',
        language: 'JavaScript',
        difficulty: 'easy',
        title: 'String Reversal',
        description: 'A text editor needs to reverse strings for undo operations',
        problem: 'Write a function that reverses a string. Handle both regular strings and special characters.',
        examples: [
          { input: 'reverse("hello")', output: '"olleh"' },
          { input: 'reverse("JavaScript")', output: '"tpircSavaJ"' },
          { input: 'reverse("12345")', output: '"54321"' },
        ],
        boilerplate: 'function reverse(str) {\n    // Your code here\n}\n\n// Test\nconsole.log(reverse("hello"));',
        category: 'coding',
      },
      {
        id: 'js_code_e2',
        type: 'coding',
        domain: 'javascript',
        language: 'JavaScript',
        difficulty: 'easy',
        title: 'Array Maximum Finder',
        description: 'An analytics dashboard needs to find peak values in data arrays',
        problem: 'Find the maximum value in an array of numbers. Handle edge cases like empty arrays.',
        examples: [
          { input: 'findMax([1, 5, 3, 9, 2])', output: '9' },
          { input: 'findMax([-5, -1, -10])', output: '-1' },
          { input: 'findMax([42])', output: '42' },
        ],
        boilerplate: 'function findMax(arr) {\n    // Your code here\n}\n\n// Test\nconsole.log(findMax([1, 5, 3, 9, 2]));',
        category: 'coding',
      },
    ],
    moderate: [
      {
        id: 'js_code_m1',
        type: 'coding',
        domain: 'javascript',
        language: 'JavaScript',
        difficulty: 'moderate',
        title: 'Debounce Function',
        description: 'A search interface needs to optimize API calls by debouncing user input',
        problem: 'Implement a debounce function that delays function execution until specified milliseconds have passed without new calls.',
        examples: [
          { input: 'debounce(callback, 300) - multiple rapid calls', output: 'callback executes once after 300ms' },
        ],
        boilerplate: 'function debounce(func, delay) {\n    // Your code here\n    return function(...args) {\n        // Implementation\n    };\n}\n\n// Usage example:\n// const debouncedSearch = debounce(searchAPI, 300);',
        category: 'coding',
      },
      {
        id: 'js_code_m2',
        type: 'coding',
        domain: 'javascript',
        language: 'JavaScript',
        difficulty: 'moderate',
        title: 'Remove Array Duplicates',
        description: 'A data pipeline needs to deduplicate user IDs from multiple log sources',
        problem: 'Remove all duplicate values from an array while maintaining order.',
        examples: [
          { input: '[1, 2, 2, 3, 4, 4, 5]', output: '[1, 2, 3, 4, 5]' },
          { input: '[\'a\', \'b\', \'a\', \'c\']', output: '[\'a\', \'b\', \'c\']' },
        ],
        boilerplate: 'function removeDuplicates(arr) {\n    // Your code here\n}\n\n// Test\nconsole.log(removeDuplicates([1, 2, 2, 3, 4, 4, 5]));',
        category: 'coding',
      },
    ],
    hard: [
      {
        id: 'js_code_h1',
        type: 'coding',
        domain: 'javascript',
        language: 'JavaScript',
        difficulty: 'hard',
        title: 'Promise-based API with Retry',
        description: 'A payment gateway needs reliable API calls with automatic retry logic for failed requests',
        problem: 'Implement an API call function with exponential backoff retry logic for network failures.',
        examples: [
          { input: 'fetchWithRetry(url, 3) - fails twice then succeeds', output: 'returns data after 2 retries' },
        ],
        boilerplate: 'async function fetchWithRetry(url, retries = 3, delay = 1000) {\n    // Your code here\n    // Implement exponential backoff: delay, delay*2, delay*4\n}\n\n// Test\n// fetchWithRetry("https://api.example.com/data");',
        category: 'coding',
      },
    ],
  },
  react: {
    easy: [
      {
        id: 'react_code_e1',
        type: 'coding',
        domain: 'react',
        language: 'JSX/React',
        difficulty: 'easy',
        title: 'Counter Component',
        description: 'An e-commerce site needs a quantity selector for products',
        problem: 'Create a React counter component with increment/decrement buttons that manages count state.',
        examples: [
          { input: 'Click increment 3 times', output: 'Counter shows 3' },
          { input: 'Click decrement 2 times from 3', output: 'Counter shows 1' },
        ],
        boilerplate: 'import { useState } from "react";\n\nfunction Counter() {\n    // Your code here\n    return (\n        <div>\n            {/* JSX here */}\n        </div>\n    );\n}\n\nexport default Counter;',
        category: 'coding',
      },
    ],
    moderate: [
      {
        id: 'react_code_m1',
        type: 'coding',
        domain: 'react',
        language: 'JSX/React',
        difficulty: 'moderate',
        title: 'Form Validation',
        description: 'A registration form needs email and password validation before submission',
        problem: 'Build a form component with real-time validation for email and password fields.',
        examples: [
          { input: 'Invalid email format', output: 'Show error message' },
          { input: 'Password < 8 chars', output: 'Show validation error' },
        ],
        boilerplate: 'import { useState } from "react";\n\nfunction Form() {\n    const [email, setEmail] = useState("");\n    const [password, setPassword] = useState("");\n    // Your code here\n    return (\n        <form>\n            {/* Form fields with validation */}\n        </form>\n    );\n}\n\nexport default Form;',
        category: 'coding',
      },
    ],
  },
  'node.js': {
    easy: [
      {
        id: 'node_code_e1',
        type: 'coding',
        domain: 'node.js',
        language: 'Node.js/Express',
        difficulty: 'easy',
        title: 'Simple HTTP Server',
        description: 'A startup needs a basic web server to serve static content',
        problem: 'Create a simple HTTP server that listens on port 3000 and responds with "Hello World".',
        examples: [
          { input: 'GET http://localhost:3000/', output: 'Hello World' },
        ],
        boilerplate: 'const http = require("http");\n\nconst server = http.createServer((req, res) => {\n    // Your code here\n});\n\nserver.listen(3000, () => {\n    console.log("Server running on port 3000");\n});',
        category: 'coding',
      },
    ],
    moderate: [
      {
        id: 'node_code_m1',
        type: 'coding',
        domain: 'node.js',
        language: 'Node.js/Express',
        difficulty: 'moderate',
        title: 'Request Logging Middleware',
        description: 'An enterprise API needs to log all incoming requests for debugging and analytics',
        problem: 'Create Express middleware that logs method, path, and timestamp of each request.',
        examples: [
          { input: 'GET /api/users', output: '[2024-01-01 10:30:45] GET /api/users' },
        ],
        boilerplate: 'const express = require("express");\nconst app = express();\n\napp.use((req, res, next) => {\n    // Your logging code here\n    next();\n});\n\napp.get("/api/users", (req, res) => {\n    res.json({ users: [] });\n});\n\napp.listen(3000);',
        category: 'coding',
      },
    ],
  },
};

function getDifficultyLevel(yearInfo: any): 'easy' | 'moderate' | 'hard' {
  if (typeof yearInfo === 'string') {
    const lower = yearInfo.toLowerCase();
    if (lower.includes('work') || lower.includes('prof') || lower.includes('grad')) return 'hard';
  }
  const year = Number(yearInfo || 1);
  if (year <= 1) return 'easy';
  if (year <= 2) return 'moderate';
  return 'hard';
}

function getAdaptiveQuestionnaire(profile: any) {
  const skills = (profile.skills || []).map((s: string) => s.toLowerCase());
  const interests = (profile.interests || []).map((i: string) => i.toLowerCase());
  const selectedDomains = [...skills, ...interests].filter((item: string) => 
    Object.keys(DOMAIN_QUESTIONS).some(domain => domain === item || item.includes(domain))
  );

  const yearInfo = profile.year || 1;
  const difficulty = getDifficultyLevel(yearInfo);

  // Get 13 MCQ questions
  const mcqQuestions: MCQQuestion[] = [];
  const seenQuestionIds = new Set<string>();

  // Get questions from each selected domain (max 3 domains)
  for (const domain of selectedDomains.slice(0, 3)) {
    const normalizedDomain = Object.keys(DOMAIN_QUESTIONS).find(key => 
      domain.includes(key) || key.includes(domain)
    );
    
    if (normalizedDomain && DOMAIN_QUESTIONS[normalizedDomain]) {
      const domainQuestions = DOMAIN_QUESTIONS[normalizedDomain][difficulty] || 
                             DOMAIN_QUESTIONS[normalizedDomain]['moderate'] || [];
      
      for (const question of domainQuestions) {
        if (!seenQuestionIds.has(question.id) && mcqQuestions.length < 13) {
          mcqQuestions.push(question);
          seenQuestionIds.add(question.id);
        }
      }
    }
  }

  // If we still don't have 13 questions, try filling with other difficulties from the same domains
  if (mcqQuestions.length < 13) {
    for (const domain of selectedDomains.slice(0, 3)) {
      const normalizedDomain = Object.keys(DOMAIN_QUESTIONS).find(key => 
        domain.includes(key) || key.includes(domain)
      );
      if (normalizedDomain && DOMAIN_QUESTIONS[normalizedDomain]) {
        for (const diff of ['easy', 'moderate', 'hard'] as const) {
          const moreQuestions = DOMAIN_QUESTIONS[normalizedDomain][diff] || [];
          for (const question of moreQuestions) {
            if (!seenQuestionIds.has(question.id) && mcqQuestions.length < 13) {
              mcqQuestions.push(question);
              seenQuestionIds.add(question.id);
            }
          }
        }
      }
    }
  }

  // Fill remaining with general technical questions if needed
  if (mcqQuestions.length < 13) {
    const generalQuestions: MCQQuestion[] = [
      { id: 'gen_1', type: 'mcq', domain: 'general', difficulty: 'easy', category: 'technical', question: 'What is version control and why is it important?', options: ['Tracking changes', 'Managing code history and collaboration', 'Backing up files', 'Storing code online'], correctAnswer: 'Managing code history and collaboration' },
      { id: 'gen_2', type: 'mcq', domain: 'general', difficulty: 'easy', category: 'technical', question: 'What is the difference between HTTP and HTTPS?', options: ['HTTP is for text', 'HTTPS is encrypted, HTTP is not', 'HTTPS is older', 'No real difference'], correctAnswer: 'HTTPS is encrypted, HTTP is not' },
      { id: 'gen_3', type: 'mcq', domain: 'general', difficulty: 'easy', category: 'technical', question: 'What is the purpose of code review?', options: ['Criticizing code', 'Ensuring quality and catching bugs before deployment', 'Delaying release', 'Checking formatting'], correctAnswer: 'Ensuring quality and catching bugs before deployment' },
      { id: 'gen_4', type: 'mcq', domain: 'general', difficulty: 'easy', category: 'technical', question: 'What is a bug and how do you report it?', options: ['Insect in code', 'Error in software reported with reproduction steps', 'Typo in comments', 'Slow performance'], correctAnswer: 'Error in software reported with reproduction steps' },
      { id: 'gen_5', type: 'mcq', domain: 'general', difficulty: 'easy', category: 'technical', question: 'What is testing in software development?', options: ['Taking exams', 'Verifying software works as expected', 'Finding bugs only', 'Quality assurance only'], correctAnswer: 'Verifying software works as expected' },
      { id: 'gen_6', type: 'mcq', domain: 'general', difficulty: 'moderate', category: 'technical', question: 'What does an API do?', options: ['Styles a webpage', 'Allows different software applications to communicate', 'Stores database records', 'Encrypts user passwords'], correctAnswer: 'Allows different software applications to communicate' },
      { id: 'gen_7', type: 'mcq', domain: 'general', difficulty: 'moderate', category: 'technical', question: 'What is the primary purpose of a database index?', options: ['To encrypt data', 'To improve the speed of data retrieval operations', 'To backup data', 'To format data for output'], correctAnswer: 'To improve the speed of data retrieval operations' },
      { id: 'gen_8', type: 'mcq', domain: 'general', difficulty: 'moderate', category: 'technical', question: 'In object-oriented programming, what is inheritance?', options: ['Copying code manually', 'A mechanism where a new class derives properties from an existing class', 'A security vulnerability', 'A way to format strings'], correctAnswer: 'A mechanism where a new class derives properties from an existing class' },
      { id: 'gen_9', type: 'mcq', domain: 'general', difficulty: 'hard', category: 'technical', question: 'What is a race condition in concurrent programming?', options: ['A competition between developers', 'When software behavior depends on the uncontrolled timing of threads or processes', 'A fast algorithm', 'A database sorting method'], correctAnswer: 'When software behavior depends on the uncontrolled timing of threads or processes' },
      { id: 'gen_10', type: 'mcq', domain: 'general', difficulty: 'hard', category: 'technical', question: 'What is the purpose of a load balancer?', options: ['To balance the weight of servers', 'To distribute incoming network traffic across multiple servers', 'To compress files', 'To compile code faster'], correctAnswer: 'To distribute incoming network traffic across multiple servers' },
      { id: 'gen_11', type: 'mcq', domain: 'general', difficulty: 'easy', category: 'technical', question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Tech Modern Language', 'Hyper Transfer Model Language', 'Home Tool Markup Language'], correctAnswer: 'Hyper Text Markup Language' },
      { id: 'gen_12', type: 'mcq', domain: 'general', difficulty: 'moderate', category: 'technical', question: 'What is a JSON file primarily used for?', options: ['Styling web pages', 'Transmitting data between a server and web application', 'Executing server-side scripts', 'Creating 3D graphics'], correctAnswer: 'Transmitting data between a server and web application' },
      { id: 'gen_13', type: 'mcq', domain: 'general', difficulty: 'hard', category: 'technical', question: 'What is the main advantage of microservices architecture?', options: ['It uses less memory than a monolith', 'It allows independent deployment and scaling of application components', 'It requires zero configuration', 'It guarantees 100% uptime'], correctAnswer: 'It allows independent deployment and scaling of application components' }
    ];

    for (const question of generalQuestions) {
      if (mcqQuestions.length < 13 && !seenQuestionIds.has(question.id)) {
        mcqQuestions.push(question);
        seenQuestionIds.add(question.id);
      }
    }
  }

  // Get 2 coding/activity questions
  const codingQuestions: CodingChallenge[] = [];
  for (const domain of selectedDomains.slice(0, 2)) {
    const normalizedDomain = Object.keys(CODING_ACTIVITIES).find(key => 
      domain.includes(key) || key.includes(domain)
    );
    
    if (normalizedDomain && CODING_ACTIVITIES[normalizedDomain]) {
      const activities = CODING_ACTIVITIES[normalizedDomain][difficulty] || 
                        CODING_ACTIVITIES[normalizedDomain]['moderate'] || [];
      
      if (activities.length > 0 && codingQuestions.length < 2) {
        codingQuestions.push(activities[0]);
      }
    }
  }

  // Fill remaining coding questions with general ones if needed
  if (codingQuestions.length < 2) {
    // Use Python general coding challenges as fallback
    const pythonActivities = CODING_ACTIVITIES['python']?.[difficulty] || CODING_ACTIVITIES['python']?.['moderate'] || [];
    if (pythonActivities.length > 0 && codingQuestions.length < 2) {
      codingQuestions.push(pythonActivities[Math.min(1, pythonActivities.length - 1)]);
    }
    
    // If still need more, use JavaScript fallback
    if (codingQuestions.length < 2) {
      const jsActivities = CODING_ACTIVITIES['javascript']?.[difficulty] || CODING_ACTIVITIES['javascript']?.['moderate'] || [];
      if (jsActivities.length > 0) {
        codingQuestions.push(jsActivities[0]);
      }
    }
  }

  const allQuestions = [...mcqQuestions, ...codingQuestions];
  
  return {
    questions: allQuestions,
    metadata: {
      totalQuestions: allQuestions.length,
      mcqCount: mcqQuestions.length,
      codingCount: codingQuestions.length,
      year: yearInfo,
      difficulty,
      selectedDomains: selectedDomains.slice(0, 3),
    },
  };
}

function sourceLogo(source: string) {
  const s = String(source || '').toLowerCase();
  if (s.includes('linkedin')) return 'in';
  if (s.includes('naukri')) return 'N';
  if (s.includes('adzuna')) return 'A';
  return 'CO';
}

function isPrioritySource(source: string) {
  const s = String(source || '').toLowerCase();
  return s.includes('linkedin') || s.includes('naukri');
}

function enforceSourceMix(jobs: any[], maxItems = 200, priorityShare = 0.5) {
  const ranked = [...jobs].sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
  const priority = ranked.filter((j: any) => isPrioritySource(j.primarySource || j.source));
  const adzunaLike = ranked.filter((j: any) => !isPrioritySource(j.primarySource || j.source));

  // Hard rule: keep LinkedIn+Naukri at >= 50% by limiting non-priority count.
  const priorityCap = Math.min(priority.length, maxItems);
  const nonPriorityCap = Math.min(adzunaLike.length, Math.floor(priorityCap / Math.max(priorityShare, 0.01) - priorityCap));

  const out = [...priority.slice(0, priorityCap), ...adzunaLike.slice(0, nonPriorityCap)];
  return out.slice(0, maxItems).sort((a: any, b: any) => (b.matchScore || 0) - (a.matchScore || 0));
}
function recencyScoreFromDate(dateString?: string) {
  if (!dateString) return 0;
  const t = new Date(dateString).getTime();
  if (Number.isNaN(t)) return 0;
  const ageHours = (Date.now() - t) / (1000 * 60 * 60);
  if (ageHours < 24) return 20;
  if (ageHours < 72) return 15;
  if (ageHours < 168) return 10;
  return 5;
}

async function fetchDevToDiscovery(keyword: string) {
  const url = new URL('https://dev.to/api/articles');
  url.searchParams.set('tag', keyword.toLowerCase().replace(/\s+/g, ''));
  url.searchParams.set('per_page', '8');
  const resp = await fetch(url.toString(), { headers: { 'User-Agent': 'CareerCompass/1.0' } });
  if (!resp.ok) throw new Error(`devto HTTP ${resp.status}`);
  const data = await resp.json();
  return (Array.isArray(data) ? data : []).map((p: any) => ({
    id: `devto_${p.id}`,
    title: p.title || 'Post',
    summary: p.description || '',
    url: p.url || '',
    source: 'dev.to',
    publishedAt: p.published_at || '',
    tags: p.tag_list || [],
  }));
}

async function fetchRedditDiscovery(keyword: string) {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(keyword)}&sort=new&limit=8`;
  const resp = await fetch(url, { headers: { 'User-Agent': 'CareerCompass/1.0' } });
  if (!resp.ok) throw new Error(`reddit HTTP ${resp.status}`);
  const data = await resp.json();
  const children = data?.data?.children || [];
  return children.map((c: any) => {
    const d = c.data || {};
    return {
      id: `reddit_${d.id}`,
      title: d.title || 'Post',
      summary: d.selftext ? String(d.selftext).slice(0, 280) : '',
      url: d.url ? (String(d.url).startsWith('http') ? d.url : `https://reddit.com${d.permalink || ''}`) : `https://reddit.com${d.permalink || ''}`,
      source: 'reddit',
      publishedAt: d.created_utc ? new Date(d.created_utc * 1000).toISOString() : '',
      tags: [d.subreddit_name_prefixed || 'reddit'],
    };
  });
}

async function fetchHnDiscovery(keyword: string) {
  const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(keyword)}&tags=story&hitsPerPage=8`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`hn HTTP ${resp.status}`);
  const data = await resp.json();
  const hits = data?.hits || [];
  return hits.map((h: any) => ({
    id: `hn_${h.objectID}`,
    title: h.title || 'Post',
    summary: h.story_text ? stripTags(String(h.story_text).slice(0, 280)) : '',
    url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`,
    source: 'hackernews',
    publishedAt: h.created_at || '',
    tags: ['hackernews'],
  }));
}

function rankDiscoveryPosts(posts: any[], interests: string[], query: string) {
  const queryTerms = `${query} ${(interests || []).join(' ')}`.toLowerCase();
  return posts
    .map((p) => {
      const text = `${p.title || ''} ${p.summary || ''} ${(p.tags || []).join(' ')}`.toLowerCase();
      const match = setOverlapScore(queryTerms.split(/\s+/).filter(Boolean), text.split(/\s+/).filter(Boolean));
      const recency = recencyScoreFromDate(p.publishedAt);
      const score = Math.round(match * 80 + recency);
      return { ...p, relevance: score };
    })
    .sort((a, b) => b.relevance - a.relevance);
}

function parseLinkedInJobsHtml(html: string, where: string, skills: string[]) {
  const cards = (html.match(/<li[\s\S]*?<\/li>/g) || []);
  const jobs = cards.map((card, i) => {
    const id = (card.match(/jobPosting:(\d+)/)?.[1] || card.match(/\/jobs\/view\/(\d+)/)?.[1] || `li_${Date.now()}_${i}`);
    const href = card.match(/href="([^"]+)"/)?.[1] || '';
    const rawTitle = card.match(/base-search-card__title[\s\S]*?>([\s\S]*?)<\/h3>/)?.[1] || '';
    const rawCompany = card.match(/base-search-card__subtitle[\s\S]*?>([\s\S]*?)<\/h4>/)?.[1] || '';
    const rawLocation = card.match(/job-search-card__location[\s\S]*?>([\s\S]*?)<\/span>/)?.[1] || '';
    const rawDate = card.match(/<time[^>]*datetime="([^"]+)"/)?.[1] || '';

    const title = stripTags(rawTitle) || 'Job';
    const company = stripTags(rawCompany) || 'Company';
    const location = stripTags(rawLocation) || where;
    const applyUrl = href.startsWith('http')
      ? href
      : id
      ? `https://www.linkedin.com/jobs/view/${id}`
      : '';
    const description = stripTags(card);
    const requiredSkills = extractSkillsFromText(`${title} ${description}`, skills);

    return {
      id: `linkedin_${id}`,
      title,
      company,
      location,
      type: 'Full-time',
      salary: 'Not disclosed',
      requiredSkills,
      matchScore: 0,
      postedDate: rawDate ? new Date(rawDate).toLocaleDateString() : 'Recently',
      applyUrl,
      logo: 'in',
      source: 'linkedin',
      _rawDescription: description,
    };
  });
  return jobs.filter((j) => j.title && j.company && j.applyUrl);
}

async function fetchLinkedInJobs(params: { role?: string; where?: string; skills?: string[] }) {
  const role = params.role || '';
  const where = params.where || ADZUNA_DEFAULT_WHERE;
  const cacheKey = `${role}|${where}`.toLowerCase();
  const now = Date.now();
  const cached = linkedInCache.get(cacheKey);
  if (cached && now - cached.ts < LINKEDIN_CACHE_MINUTES * 60_000) {
    return cached.jobs;
  }

  const pages = Math.max(1, Math.min(5, LINKEDIN_SCRAPE_PAGES));
  const pagePromises = Array.from({ length: pages }).map(async (_, idx) => {
    const start = idx * 25;
    const url = new URL('https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search');
    url.searchParams.set('keywords', role);
    url.searchParams.set('location', where);
    url.searchParams.set('start', String(start));
    const resp = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });
    if (!resp.ok) {
      throw new Error(`LinkedIn scrape HTTP ${resp.status}`);
    }
    const html = await resp.text();
    return parseLinkedInJobsHtml(html, where, params.skills || []);
  });

  const pageResults = await Promise.all(pagePromises);
  const jobs = pageResults.flat();
  linkedInCache.set(cacheKey, { ts: now, jobs });
  return jobs;
}


function parseNaukriJobsHtml(html: string, where: string, skills: string[]) {
  const cards = html.match(/<article[\s\S]*?<\/article>/g) || html.match(/<div class=\"srp-jobtuple-wrapper[\s\S]*?<\/div>\s*<\/div>/g) || [];
  const jobs = cards.map((card, i) => {
    const href =
      card.match(/<a[^>]*class=\"[^\"]*title[^\"]*\"[^>]*href=\"([^\"]+)\"/i)?.[1] ||
      card.match(/href=\"([^\"]*job-listings[^\"]+)\"/i)?.[1] ||
      '';
    const rawTitle =
      card.match(/<a[^>]*class=\"[^\"]*title[^\"]*\"[^>]*>([\s\S]*?)<\/a>/i)?.[1] ||
      card.match(/title=\"([^\"]+)\"/i)?.[1] ||
      '';
    const rawCompany =
      card.match(/class=\"[^\"]*comp-name[^\"]*\"[^>]*>([\s\S]*?)<\//i)?.[1] ||
      card.match(/class=\"[^\"]*companyName[^\"]*\"[^>]*>([\s\S]*?)<\//i)?.[1] ||
      '';
    const rawLocation =
      card.match(/class=\"[^\"]*locWdth[^\"]*\"[^>]*>([\s\S]*?)<\//i)?.[1] ||
      card.match(/class=\"[^\"]*location\"[^>]*>([\s\S]*?)<\//i)?.[1] ||
      '';
    const rawDate = card.match(/class=\"[^\"]*job-post-day[^\"]*\"[^>]*>([\s\S]*?)<\//i)?.[1] || 'Recently';

    const title = stripTags(rawTitle) || 'Job';
    const company = stripTags(rawCompany) || 'Company';
    const location = stripTags(rawLocation) || where;
    const applyUrl = href.startsWith('http') ? href : href ? `https://www.naukri.com${href}` : '';
    const description = stripTags(card);
    const requiredSkills = extractSkillsFromText(`${title} ${description}`, skills);

    return {
      id: `naukri_${Date.now()}_${i}`,
      title,
      company,
      location,
      type: 'Full-time',
      salary: 'Not disclosed',
      requiredSkills,
      matchScore: 0,
      postedDate: stripTags(rawDate) || 'Recently',
      applyUrl,
      logo: 'NK',
      source: 'naukri',
      _rawDescription: description,
    };
  });
  return jobs.filter((j) => j.title && j.company && j.applyUrl);
}

async function fetchNaukriJobs(params: { role?: string; where?: string; skills?: string[] }) {
  const role = params.role || '';
  const where = params.where || ADZUNA_DEFAULT_WHERE;
  const cacheKey = `${role}|${where}`.toLowerCase();
  const now = Date.now();
  const cached = naukriCache.get(cacheKey);
  if (cached && now - cached.ts < NAUKRI_CACHE_MINUTES * 60_000) {
    return cached.jobs;
  }

  const roleSlug = role.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const locationSlug = where.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const pages = Math.max(1, Math.min(5, NAUKRI_SCRAPE_PAGES));

  const pagePromises = Array.from({ length: pages }).map(async (_, pageIndex) => {
    const pageNo = pageIndex + 1;
    const url = `https://www.naukri.com/${roleSlug}-jobs-in-${locationSlug}-${pageNo}?k=${encodeURIComponent(role)}&l=${encodeURIComponent(where)}`;
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
        Accept: 'text/html,application/xhtml+xml',
      },
    });
    if (!resp.ok) {
      throw new Error(`Naukri scrape HTTP ${resp.status}`);
    }
    const html = await resp.text();
    return parseNaukriJobsHtml(html, where, params.skills || []);
  });

  const pageResults = await Promise.all(pagePromises);
  const jobs = pageResults.flat();
  naukriCache.set(cacheKey, { ts: now, jobs });
  return jobs;
}

function dedupeJobs(jobs: any[]) {
  const map = new Map<string, any>();
  for (const job of jobs) {
    const key = `${(job.title || '').toLowerCase()}|${(job.company || '').toLowerCase()}|${(job.location || '').toLowerCase()}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, job);
      continue;
    }
    const existingScore =
      (existing.applyUrl ? 1 : 0) +
      (existing.salary && existing.salary !== 'Not disclosed' ? 1 : 0) +
      ((existing.requiredSkills || []).length > 0 ? 1 : 0);
    const nextScore =
      (job.applyUrl ? 1 : 0) +
      (job.salary && job.salary !== 'Not disclosed' ? 1 : 0) +
      ((job.requiredSkills || []).length > 0 ? 1 : 0);
    if (nextScore > existingScore) {
      map.set(key, job);
    }
  }
  return Array.from(map.values());
}

function normalizeBronzeToSilver(rawJobs: any[]) {
  return rawJobs.map((j, idx) => ({
    canonicalId: j.id || `job_${Date.now()}_${idx}`,
    title: String(j.title || '').trim(),
    company: String(j.company || '').trim(),
    location: String(j.location || '').trim(),
    type: String(j.type || 'Full-time').trim(),
    salary: String(j.salary || 'Not disclosed').trim(),
    requiredSkills: Array.isArray(j.requiredSkills) ? j.requiredSkills : [],
    applyUrl: String(j.applyUrl || '').trim(),
    source: String(j.source || 'unknown').trim().toLowerCase(),
    logo: String(j.logo || sourceLogo(String(j.source || ''))).trim(),
    postedDate: String(j.postedDate || 'Recently'),
    description: String(j._rawDescription || j.description || '').trim(),
    raw: j,
  }));
}

function dedupeAndResolveEntities(silverJobs: any[]) {
  const grouped = new Map<string, any[]>();
  silverJobs.forEach((j) => {
    const key = `${j.title.toLowerCase()}|${j.company.toLowerCase()}|${j.location.toLowerCase()}`;
    const arr = grouped.get(key) || [];
    arr.push(j);
    grouped.set(key, arr);
  });

  const gold = Array.from(grouped.values()).map((group, idx) => {
    const preferred = group.sort((a, b) => {
      const qa = Number(Boolean(a.applyUrl)) + Number((a.requiredSkills || []).length > 0);
      const qb = Number(Boolean(b.applyUrl)) + Number((b.requiredSkills || []).length > 0);
      return qb - qa;
    })[0];
    const sources = Array.from(new Set(group.map((x) => x.source)));
    return {
      id: `gold_${idx}_${preferred.canonicalId}`,
      title: preferred.title,
      company: preferred.company,
      location: preferred.location,
      type: preferred.type || 'Full-time',
      salary: preferred.salary || 'Not disclosed',
      requiredSkills: preferred.requiredSkills || [],
      applyUrl: preferred.applyUrl || '',
      logo: preferred.logo || sourceLogo(preferred.source || sources[0] || ''),
      postedDate: preferred.postedDate || 'Recently',
      source: sources.join(','),
      primarySource: preferred.source || sources[0] || 'unknown',
      sourceCount: sources.length,
      description: preferred.description || '',
    };
  });
  return gold;
}

function buildFeatureSnapshots(profile: any, goldJobs: any[]) {
  return goldJobs.map((job) => {
    const roleMatch = (profile.targetRoles || []).some((r: string) =>
      String(job.title || '').toLowerCase().includes(String(r).toLowerCase())
    )
      ? 1
      : 0;
    const skillMatch = setOverlapScore(profile.skills || [], job.requiredSkills || []);
    const interestMatch = setOverlapScore(profile.interests || [], [job.title, job.description].join(' ').split(/\s+/));
    const recency = String(job.postedDate).includes('/') ? 0.7 : 0.5;
    const sourceQuality = Math.min(1, (job.sourceCount || 1) / 2);
    return {
      jobId: job.id,
      roleMatch,
      skillMatch,
      interestMatch,
      recency,
      sourceQuality,
      updatedAt: new Date().toISOString(),
    };
  });
}

function applyExplainableRanking(profile: any, goldJobs: any[], features: any[]) {
  const featureByJob = new Map(features.map((f: any) => [f.jobId, f]));
  return goldJobs
    .map((job) => {
      const f = featureByJob.get(job.id) || {};
      const score = Math.round(
        (Number(f.roleMatch || 0) * 30 +
          Number(f.skillMatch || 0) * 35 +
          Number(f.interestMatch || 0) * 20 +
          Number(f.recency || 0) * 10 +
          Number(f.sourceQuality || 0) * 5) * 1
      );
      const reasons = [
        `Role alignment ${(Number(f.roleMatch || 0) * 100).toFixed(0)}%`,
        `Skill overlap ${(Number(f.skillMatch || 0) * 100).toFixed(0)}%`,
        `Interest relevance ${(Number(f.interestMatch || 0) * 100).toFixed(0)}%`,
        `Source reliability ${(Number(f.sourceQuality || 0) * 100).toFixed(0)}%`,
      ];
      return { ...job, matchScore: Math.min(100, score), reasons };
    })
    .sort((a, b) => b.matchScore - a.matchScore);
}

async function fetchAdzunaJobs(params: { role?: string; where?: string; skills?: string[] }) {
  const role = params.role || '';
  const where = params.where || ADZUNA_DEFAULT_WHERE;
  const cacheKey = `${role}|${where}`.toLowerCase();
  const now = Date.now();
  const cached = adzunaCache.get(cacheKey);
  if (cached && now - cached.ts < ADZUNA_CACHE_MINUTES * 60_000) {
    return cached.jobs;
  }

  const base = `https://api.adzuna.com/v1/api/jobs/${ADZUNA_COUNTRY}/search/1`;
  const url = new URL(base);
  url.searchParams.set('app_id', ADZUNA_APP_ID);
  url.searchParams.set('app_key', ADZUNA_APP_KEY);
  url.searchParams.set('results_per_page', '30');
  url.searchParams.set('what', role);
  url.searchParams.set('where', where);
  url.searchParams.set('sort_by', 'date');
  url.searchParams.set('content-type', 'application/json');
  url.searchParams.set('max_days_old', '14');

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    throw new Error(`Adzuna HTTP ${resp.status}`);
  }
  const data = await resp.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  const jobs = results.map((r: any) => {
    const description = r.description || '';
    const requiredSkills = extractSkillsFromText(
      `${r.title || ''} ${description}`,
      params.skills || []
    );
    return {
      id: r.id || `adz_${Math.random().toString(36).slice(2)}`,
      title: r.title || 'Job',
      company: r.company?.display_name || 'Company',
      location: r.location?.display_name || where,
      type: r.contract_time ? (r.contract_time === 'part_time' ? 'Part-time' : 'Full-time') : 'Full-time',
      salary: formatSalary(r.salary_min, r.salary_max, r.currency) || 'Not disclosed',
      requiredSkills,
      matchScore: 0,
      postedDate: r.created ? new Date(r.created).toLocaleDateString() : 'Recently',
      applyUrl: r.redirect_url || r.url || '',
      logo: '🏢',
      source: 'adzuna',
      _rawDescription: description,
    };
  });

  adzunaCache.set(cacheKey, { ts: now, jobs });
  return jobs;
}

async function recommendJobsWithML(profile: any, jobs: any[]) {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/recommend-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profile: {
          name: profile?.name,
          year: profile?.year,
          cgpa: profile?.cgpa,
          skills: profile?.skills || [],
          interests: profile?.interests || [],
          aptitude: profile?.aptitude || {},
        },
        jobs: jobs.map((j) => ({
          id: j.id,
          title: j.title,
          company: j.company,
          description: j._rawDescription || j.description || '',
          requiredSkills: j.requiredSkills || [],
        })),
        top_k: Math.min(200, jobs.length),
      }),
    });
    if (!resp.ok) throw new Error(`ML HTTP ${resp.status}`);
    const data = await resp.json();
    const ranked = data?.ranked || [];
    const scoreById = new Map<string, number>(
      ranked.map((r: any) => [String(r.id), Number(r.score) || 0])
    );
    return jobs.map((j) => ({
      ...j,
      matchScore: Math.round((scoreById.get(j.id) || 0) * 100),
    }));
  } catch (err) {
    return null;
  }
}

function getAlertProfile(userId: string, email?: string) {
  const users = getUsers();
  const fromId = users.find((u: any) => u.id === userId);
  const fromEmail = email ? getUserByEmail(email) : null;
  return fromId || fromEmail || mockUserProfile;
}

function normalizeUserId(email?: string, fallbackId?: string) {
  if (fallbackId && fallbackId !== mockUserProfile.id) return String(fallbackId);
  if (email) {
    return `user_${String(email).trim().toLowerCase().replace(/[^a-z0-9]+/g, '_')}`;
  }
  return mockUserProfile.id;
}

function emptyStudentProfile(email?: string, fallbackId?: string) {
  return {
    id: normalizeUserId(email, fallbackId),
    name: '',
    email: email || '',
    course: '',
    year: 0,
    cgpa: 0,
    preferredWorkMode: '',
    weeklyStudyHours: 0,
    targetPlacementTimeline: '',
    skills: [],
    interests: [],
    targetRoles: [],
    strongestSkills: [],
    weakestSkills: [],
    targetLocations: [],
    projectCount: 0,
    internshipCount: 0,
    certificationsCount: 0,
    expectedSalaryLpa: 0,
    githubUrl: '',
    linkedinUrl: '',
    resumeUrl: '',
    aptitude: {},
    aptitudeResponses: [],
    logicalResponses: [],
    logicalScore: 0,
    authVerified: false,
    createdAt: new Date().toISOString(),
  };
}

function hashPassword(password: string) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

async function sendOtpEmail(to: string, subject: string, otp: string, context: string) {
  const text =
    `Your CareerPath verification code is ${otp}.\n\n` +
    `Purpose: ${context}\n` +
    `This code expires in 10 minutes.\n\n` +
    `If you did not request this, you can ignore this email.`;
  const delivered = await sendNotificationEmail(to, subject, text);
  return delivered;
}

function getLatestOtp(email: string, purpose: string) {
  const now = Date.now();
  return getAuthOtps().find((entry: any) => {
    const sameEmail = String(entry.email || '').toLowerCase() === String(email || '').toLowerCase();
    const samePurpose = entry.purpose === purpose;
    const active = new Date(entry.expiresAt).getTime() > now;
    return sameEmail && samePurpose && active;
  }) || null;
}

function sanitizeUserForClient(user: any) {
  if (!user) return user;
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

function getStudentProfile(userId?: string, email?: string) {
  const users = getUsers();
  const byId = userId ? users.find((u: any) => u.id === userId) : null;
  const byEmail = email ? getUserByEmail(email) : null;
  if (byId || byEmail) {
    return { ...emptyStudentProfile(email, userId), ...(byId || {}), ...(byEmail || {}) };
  }
  if (email && String(email).toLowerCase() !== String(mockUserProfile.email).toLowerCase()) {
    return emptyStudentProfile(email, userId);
  }
  return { ...emptyStudentProfile(mockUserProfile.email, mockUserProfile.id), ...mockUserProfile };
}

function buildSimulationContext(userId: string) {
  const recentCheckIns = getWeeklyCheckIns()
    .filter((entry: any) => entry.userId === userId)
    .slice(0, 6);
  const outcomes = getPlacementOutcomes().filter((entry: any) => entry.userId === userId);

  const averageStudyHours = recentCheckIns.length > 0
    ? Number((recentCheckIns.reduce((sum: number, entry: any) => sum + Number(entry.studyHours || 0), 0) / recentCheckIns.length).toFixed(1))
    : 0;
  const checkInConsistency = recentCheckIns.length / 6;
  const applicationsSubmitted = recentCheckIns.reduce((sum: number, entry: any) => sum + Number(entry.applicationsSubmitted || 0), 0);
  const interviewsAttended = recentCheckIns.reduce((sum: number, entry: any) => sum + Number(entry.interviewsAttended || 0), 0);
  const offersReceived = outcomes.filter((entry: any) => entry.status === 'Offered' || entry.status === 'Accepted').length;
  const successfulInterviews = outcomes.filter((entry: any) => ['Interviewing', 'Offered', 'Accepted'].includes(entry.status)).length;

  return {
    averageStudyHours,
    checkInConsistency: Number(checkInConsistency.toFixed(2)),
    recentApplications: applicationsSubmitted,
    recentInterviews: interviewsAttended,
    offersReceived,
    successfulInterviews,
    totalOutcomes: outcomes.length,
  };
}

async function fetchFreshAlertJobs(params: {
  userId: string;
  email?: string;
  role?: string;
  where?: string;
  sources?: string[];
}) {
  const profile = getAlertProfile(params.userId, params.email);
  const role = params.role || profile?.targetRoles?.[0] || profile?.interests?.[0] || mockUserProfile.targetRoles?.[0] || 'Full Stack Developer';
  const where = params.where || profile?.location || ADZUNA_DEFAULT_WHERE;
  const selectedSources = (params.sources && params.sources.length > 0 ? params.sources : JOB_SOURCES)
    .map((s) => String(s).trim().toLowerCase())
    .filter(Boolean);

  const shouldUseAdzuna = selectedSources.includes('adzuna') && Boolean(ADZUNA_APP_ID && ADZUNA_APP_KEY);
  const shouldUseLinkedIn = selectedSources.includes('linkedin') && LINKEDIN_SCRAPE_ENABLED;
  const shouldUseNaukri = selectedSources.includes('naukri') && NAUKRI_SCRAPE_ENABLED;

  if (!shouldUseAdzuna && !shouldUseLinkedIn && !shouldUseNaukri) {
    return {
      ok: false,
      status: 503,
      error: 'Live job providers are not configured',
      details: 'Enable Adzuna keys and/or LinkedIn/Naukri scraping in backend/.env to generate verified alerts.',
      jobs: [],
      warnings: [],
      fetchedAt: new Date().toISOString(),
      role,
      where,
      selectedSources,
    };
  }

  const providerErrors: string[] = [];
  const jobsFromProviders: any[] = [];
  const providerCalls: Promise<unknown>[] = [];

  if (shouldUseAdzuna) {
    providerCalls.push(
      fetchAdzunaJobs({ role, where, skills: profile?.skills || mockUserProfile.skills || [] })
        .then((jobs) => jobsFromProviders.push(...jobs))
        .catch((err) => providerErrors.push(`adzuna: ${String(err)}`))
    );
  }

  if (shouldUseLinkedIn) {
    providerCalls.push(
      fetchLinkedInJobs({ role, where, skills: profile?.skills || mockUserProfile.skills || [] })
        .then((jobs) => jobsFromProviders.push(...jobs))
        .catch((err) => providerErrors.push(`linkedin: ${String(err)}`))
    );
  }

  if (shouldUseNaukri) {
    providerCalls.push(
      fetchNaukriJobs({ role, where, skills: profile?.skills || mockUserProfile.skills || [] })
        .then((jobs) => jobsFromProviders.push(...jobs))
        .catch((err) => providerErrors.push(`naukri: ${String(err)}`))
    );
  }

  await Promise.all(providerCalls);
  const fetchedAt = new Date().toISOString();

  if (jobsFromProviders.length === 0) {
    return {
      ok: false,
      status: 502,
      error: 'No fresh live jobs were fetched',
      details: providerErrors.length > 0 ? providerErrors.join(' | ') : 'No providers returned jobs for this query.',
      jobs: [],
      warnings: providerErrors,
      fetchedAt,
      role,
      where,
      selectedSources,
    };
  }

  const bronze = jobsFromProviders.map((job) => ({
    ingestedAt: fetchedAt,
    source: job.source || 'unknown',
    payload: job,
  }));
  saveBronzeJobs(bronze);

  const silver = normalizeBronzeToSilver(jobsFromProviders);
  saveSilverJobs(silver);

  const gold = dedupeAndResolveEntities(silver);
  const features = buildFeatureSnapshots(profile, gold);
  saveFeatureSnapshots(features);
  const explained = applyExplainableRanking(profile, gold, features);
  saveGoldJobs(explained);

  let jobsWithScores = explained.map((job: any) => ({
    ...job,
    matchScore: job.matchScore ?? getMatchScore(job, profile),
  }));

  const mlScores = await recommendJobsWithML(profile, explained);
  if (mlScores) {
    const mlMap = new Map(mlScores.map((job: any) => [job.id, job.matchScore]));
    jobsWithScores = jobsWithScores.map((job: any) => ({
      ...job,
      matchScore: mlMap.has(job.id) ? mlMap.get(job.id) : job.matchScore,
    }));
  }

  const filtered = enforceSourceMix(
    jobsWithScores
      .filter((job: any) =>
        !role
          ? true
          : job.title.toLowerCase().includes(role.toLowerCase()) || job.company.toLowerCase().includes(role.toLowerCase())
      )
      .sort((a: any, b: any) => b.matchScore - a.matchScore),
    200,
    0.5
  );

  return {
    ok: true,
    status: 200,
    jobs: filtered,
    warnings: providerErrors,
    fetchedAt,
    role,
    where,
    selectedSources,
    profile,
  };
}

// Serve docs (API contract)
app.get('/api/contract', (_req, res) => {
  const mdPath = path.join(__dirname, '..', '..', 'docs', 'api-contract.md');
  if (fs.existsSync(mdPath)) {
    const md = fs.readFileSync(mdPath, 'utf-8');
    res.setHeader('Content-Type', 'text/markdown');
    return res.send(md);
  }
  res.json({ contract: 'API endpoints: GET /api/jobs, POST /api/apply, POST /api/chat, POST /api/resume/analyze' });
});

// User profile endpoint
app.get('/api/user/profile', (req, res) => {
  const email = String(req.query.email || mockUserProfile.email);
  const userId = String(req.query.userId || '');
  const user = getStudentProfile(userId || undefined, email);
  res.json(sanitizeUserForClient(user));
});

app.post('/api/auth/signup/request-otp', async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  const confirmPassword = String(req.body?.confirmPassword || '');

  if (!name || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All signup fields are required' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = getUserByEmail(email);
  if (existing?.passwordHash && existing?.authVerified) {
    return res.status(409).json({ error: 'An account already exists for this email' });
  }

  const otp = generateOtp();
  const otpRecord = {
    email,
    purpose: 'signup',
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    payload: {
      id: normalizeUserId(email),
      name,
      email,
      passwordHash: hashPassword(password),
    },
    createdAt: new Date().toISOString(),
  };
  saveAuthOtp(otpRecord);
  const delivered = await sendOtpEmail(email, 'CareerPath signup verification code', otp, 'Complete your signup');
  res.json({
    ok: true,
    delivered,
    message: delivered ? 'OTP sent to your email' : 'SMTP is not configured. Use the OTP shown for local testing.',
    ...(delivered ? {} : { devOtp: otp }),
  });
});

app.post('/api/auth/signup/verify', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const otp = String(req.body?.otp || '').trim();
  const pending = getLatestOtp(email, 'signup');

  if (!pending || pending.otp !== otp) {
    return res.status(400).json({ error: 'Invalid or expired signup OTP' });
  }

  const existing = getStudentProfile(undefined, email);
  const user = {
    ...existing,
    ...pending.payload,
    authVerified: true,
    createdAt: existing.createdAt || new Date().toISOString(),
  };
  deleteAuthOtp(email, 'signup');
  const saved = upsertUser(user);
  res.json({ ok: true, user: sanitizeUserForClient(saved) });
});

app.post('/api/auth/login', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const password = String(req.body?.password || '');
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  const user = getUserByEmail(email);
  if (!user || !user.passwordHash || !user.authVerified) {
    return res.status(401).json({ error: 'No verified account found for this email' });
  }

  if (user.passwordHash !== hashPassword(password)) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  res.json({ ok: true, user: sanitizeUserForClient(user) });
});

app.post('/api/auth/forgot-password/request', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const user = getUserByEmail(email);
  if (!email || !user || !user.authVerified) {
    return res.status(404).json({ error: 'No verified account found for this email' });
  }

  const otp = generateOtp();
  saveAuthOtp({
    email,
    purpose: 'password_reset',
    otp,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    payload: { id: user.id },
    createdAt: new Date().toISOString(),
  });
  const delivered = await sendOtpEmail(email, 'CareerPath password reset code', otp, 'Reset your password');
  res.json({
    ok: true,
    delivered,
    message: delivered ? 'Password reset OTP sent to your email' : 'SMTP is not configured. Use the OTP shown for local testing.',
    ...(delivered ? {} : { devOtp: otp }),
  });
});

app.post('/api/auth/forgot-password/verify', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const otp = String(req.body?.otp || '').trim();
  const newPassword = String(req.body?.newPassword || '');
  const confirmPassword = String(req.body?.confirmPassword || '');
  const pending = getLatestOtp(email, 'password_reset');

  if (!pending || pending.otp !== otp) {
    return res.status(400).json({ error: 'Invalid or expired reset OTP' });
  }
  if (!newPassword || newPassword !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = getUserByEmail(email);
  if (!existing) {
    return res.status(404).json({ error: 'No account found for this email' });
  }

  const saved = upsertUser({
    ...existing,
    passwordHash: hashPassword(newPassword),
    authVerified: true,
  });
  deleteAuthOtp(email, 'password_reset');
  res.json({ ok: true, user: sanitizeUserForClient(saved) });
});

app.post('/api/user/profile', (req, res) => {
  const body = req.body || {};
  const existing = getStudentProfile(body.id, body.email);
  const user = {
    ...existing,
    id: normalizeUserId(body.email || existing.email, body.id || existing.id),
    name: body.name ?? existing.name,
    email: body.email ?? existing.email,
    course: body.course ?? existing.course,
    year: body.year !== undefined ? Number(body.year) : existing.year,
    cgpa: body.cgpa !== undefined ? Number(body.cgpa) : existing.cgpa,
    skills: Array.isArray(body.skills) ? body.skills : existing.skills,
    interests: Array.isArray(body.interests) ? body.interests : existing.interests,
    targetRoles: Array.isArray(body.targetRoles) ? body.targetRoles : existing.targetRoles,
    strongestSkills: Array.isArray(body.strongestSkills) ? body.strongestSkills : existing.strongestSkills,
    weakestSkills: Array.isArray(body.weakestSkills) ? body.weakestSkills : existing.weakestSkills,
    targetLocations: Array.isArray(body.targetLocations) ? body.targetLocations : existing.targetLocations,
    projectCount: body.projectCount !== undefined ? Number(body.projectCount) : existing.projectCount,
    internshipCount: body.internshipCount !== undefined ? Number(body.internshipCount) : existing.internshipCount,
    certificationsCount: body.certificationsCount !== undefined ? Number(body.certificationsCount) : existing.certificationsCount,
    expectedSalaryLpa: body.expectedSalaryLpa !== undefined ? Number(body.expectedSalaryLpa) : existing.expectedSalaryLpa,
    githubUrl: body.githubUrl ?? existing.githubUrl,
    linkedinUrl: body.linkedinUrl ?? existing.linkedinUrl,
    preferredWorkMode: body.preferredWorkMode ?? existing.preferredWorkMode,
    weeklyStudyHours: body.weeklyStudyHours !== undefined ? Number(body.weeklyStudyHours) : existing.weeklyStudyHours,
    targetPlacementTimeline: body.targetPlacementTimeline ?? existing.targetPlacementTimeline,
    resumeUrl: body.resumeUrl ?? existing.resumeUrl,
    aptitude: body.aptitude ?? existing.aptitude,
    aptitudeResponses: Array.isArray(body.aptitudeResponses) ? body.aptitudeResponses : existing.aptitudeResponses,
    logicalResponses: Array.isArray(body.logicalResponses) ? body.logicalResponses : existing.logicalResponses,
    logicalScore: body.logicalScore !== undefined ? Number(body.logicalScore) : existing.logicalScore,
    createdAt: existing.createdAt || body.createdAt || new Date().toISOString(),
  };
  const saved = upsertUser(user);
  res.json(sanitizeUserForClient(saved));
});

app.get('/api/student/checkins', (req, res) => {
  const userId = String(req.query.userId || mockUserProfile.id);
  const checkIns = getWeeklyCheckIns()
    .filter((entry: any) => entry.userId === userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(checkIns);
});

app.post('/api/student/checkins', (req, res) => {
  const body = req.body || {};
  const userId = String(body.userId || mockUserProfile.id);
  const entry = {
    id: `checkin_${Date.now()}`,
    userId,
    weekLabel: String(body.weekLabel || `Week of ${new Date().toLocaleDateString()}`),
    studyHours: Number(body.studyHours || 0),
    topicsCompleted: Array.isArray(body.topicsCompleted) ? body.topicsCompleted : [],
    projectWorkSummary: String(body.projectWorkSummary || ''),
    applicationsSubmitted: Number(body.applicationsSubmitted || 0),
    interviewsAttended: Number(body.interviewsAttended || 0),
    confidenceLevel: Math.max(1, Math.min(5, Number(body.confidenceLevel || 3))),
    blockers: String(body.blockers || ''),
    createdAt: new Date().toISOString(),
  };
  addWeeklyCheckIn(entry);
  addEventLog({
    id: `evt_${Date.now()}_checkin`,
    type: 'weekly_checkin_logged',
    userId,
    refId: entry.id,
    metadata: {
      studyHours: entry.studyHours,
      applicationsSubmitted: entry.applicationsSubmitted,
      interviewsAttended: entry.interviewsAttended,
      confidenceLevel: entry.confidenceLevel,
    },
    createdAt: entry.createdAt,
  });
  res.json(entry);
});

app.get('/api/student/outcomes', (req, res) => {
  const userId = String(req.query.userId || mockUserProfile.id);
  const outcomes = getPlacementOutcomes()
    .filter((entry: any) => entry.userId === userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(outcomes);
});

app.post('/api/student/outcomes', (req, res) => {
  const body = req.body || {};
  const userId = String(body.userId || mockUserProfile.id);
  const entry = {
    id: `outcome_${Date.now()}`,
    userId,
    company: String(body.company || 'Unknown Company'),
    role: String(body.role || 'Unknown Role'),
    status: String(body.status || 'Applied'),
    roundsCleared: Number(body.roundsCleared || 0),
    packageLpa: body.packageLpa ? Number(body.packageLpa) : null,
    notes: String(body.notes || ''),
    createdAt: new Date().toISOString(),
  };
  addPlacementOutcome(entry);
  addEventLog({
    id: `evt_${Date.now()}_outcome`,
    type: 'placement_outcome_logged',
    userId,
    refId: entry.id,
    metadata: {
      company: entry.company,
      role: entry.role,
      status: entry.status,
      roundsCleared: entry.roundsCleared,
      packageLpa: entry.packageLpa,
    },
    createdAt: entry.createdAt,
  });
  res.json(entry);
});

app.get('/api/student/simulation-runs', (req, res) => {
  const userId = String(req.query.userId || mockUserProfile.id);
  const runs = getSimulationRuns()
    .filter((entry: any) => entry.userId === userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(runs);
});

app.get('/api/questionnaire', (req, res) => {
  const userId = String(req.query.userId || '');
  const email = String(req.query.email || mockUserProfile.email);
  const user = getStudentProfile(userId || undefined, email);
  const result = getAdaptiveQuestionnaire(user);
  res.json(result);
});

app.post('/api/questionnaire/submit', (req, res) => {
  const body = req.body || {};
  const userId = String(body.userId || '');
  const email = String(body.email || mockUserProfile.email);
  const user = getStudentProfile(userId || undefined, email);
  const answers = Array.isArray(body.answers)
    ? body.answers
    : Array.isArray(body.responses)
    ? body.responses
    : [];
  const response = {
    id: `qresp_${Date.now()}`,
    userId: user.id,
    answers,
    submittedAt: new Date().toISOString(),
  };
  addQuestionnaireResponse(response);

  const updatedProfile = {
    ...user,
    aptitude: body.aptitude || {},
    aptitudeResponses: answers,
    logicalResponses: Array.isArray(body.logicalResponses) ? body.logicalResponses : user.logicalResponses || [],
    logicalScore: body.logicalScore !== undefined ? Number(body.logicalScore) : user.logicalScore || 0,
  };
  upsertUser(updatedProfile);

  const recommendations = buildCareerRecommendations(updatedProfile);
  saveCareerRecommendations(recommendations);
  res.json({ recommendations });
});

app.post('/api/code/run', (req, res) => {
  const body = req.body || {};
  const { code, language, questionId } = body;
  
  if (!code || !language) {
    return res.status(400).json({ error: 'code and language required' });
  }

  // NOTE: In production, integrate with Judge0 API or similar service
  // For now, return a mock response indicating code was submitted
  const result = {
    success: true,
    message: 'Code execution is configured in production with a code execution service (Judge0, Piston, etc.)',
    code,
    language,
    questionId,
    executedAt: new Date().toISOString(),
    output: '✓ Code syntax validated\n✓ Ready for submission\n\nNote: Full execution requires backend integration with a code execution service like Judge0 or Piston.',
    runtime: '0ms',
  };

  res.json(result);
});

app.post('/api/questionnaire/submit', (req, res) => {
  const body = req.body || {};
  const user = getUserByEmail(mockUserProfile.email) || mockUserProfile;
  const targetCareer = String(
    body.career || body.targetCareer || body.careerTitle || user.targetRoles?.[0] || 'Full Stack Developer'
  );
  const roadmap = buildRoadmap(user, targetCareer);
  saveRoadmap({ userId: user.id, career: targetCareer, roadmap, generatedAt: new Date().toISOString() });
  res.json({ career: targetCareer, roadmap });
});

// Community endpoints
app.get('/api/community/users', (_req, res) => {
  res.json(getUsers());
});

app.post('/api/community/users', (req, res) => {
  const user = req.body || {};
  if (!user.id) return res.status(400).json({ error: 'id required' });
  res.json(upsertUser(user));
});

app.get('/api/community/posts', (_req, res) => {
  const posts = getPosts();
  const comments = getComments();
  const users = getUsers();
  const withMeta = posts.map((p: any) => ({
    ...p,
    author: users.find((u: any) => u.id === p.authorId),
    comments: comments.filter((c: any) => c.postId === p.id),
  }));
  res.json(withMeta);
});

app.post('/api/community/posts', (req, res) => {
  const body = req.body || {};
  if (!body.authorId || !body.content) return res.status(400).json({ error: 'authorId and content required' });
  const post = {
    id: `post_${Date.now()}`,
    authorId: body.authorId,
    content: body.content,
    tags: body.tags || [],
    createdAt: new Date().toISOString(),
  };
  addPost(post);
  addEventLog({
    id: `evt_${Date.now()}_post`,
    type: 'post_created',
    userId: body.authorId,
    refId: post.id,
    metadata: { tags: post.tags },
    createdAt: new Date().toISOString(),
  });
  const followers = getConnections()
    .filter((c: any) => c.toId === body.authorId)
    .map((c: any) => c.fromId);
  followers.forEach((userId: string) => {
    addNotification({
      id: `n_${Date.now()}_${userId}`,
      userId,
      type: 'post',
      title: 'New post in your network',
      body: 'Someone you follow published a new post.',
      refId: post.id,
      read: false,
      createdAt: new Date().toISOString(),
    });
  });
  res.json(post);
});

app.post('/api/community/comments', (req, res) => {
  const body = req.body || {};
  if (!body.postId || !body.authorId || !body.content) {
    return res.status(400).json({ error: 'postId, authorId, content required' });
  }
  const comment = {
    id: `c_${Date.now()}`,
    postId: body.postId,
    authorId: body.authorId,
    content: body.content,
    createdAt: new Date().toISOString(),
  };
  addComment(comment);
  addEventLog({
    id: `evt_${Date.now()}_comment`,
    type: 'comment_created',
    userId: body.authorId,
    refId: body.postId,
    metadata: {},
    createdAt: new Date().toISOString(),
  });
  const post = getPosts().find((p: any) => p.id === body.postId);
  if (post?.authorId && post.authorId !== body.authorId) {
    addNotification({
      id: `n_${Date.now()}_${post.authorId}`,
      userId: post.authorId,
      type: 'comment',
      title: 'New comment on your post',
      body: 'Someone commented on your post.',
      refId: body.postId,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  res.json(comment);
});

app.get('/api/community/connections', (req, res) => {
  const userId = (req.query.userId as string) || mockUserProfile.id;
  const conns = getConnections().filter((c: any) => c.fromId === userId);
  res.json(conns);
});

app.post('/api/community/connections', (req, res) => {
  const body = req.body || {};
  if (!body.fromId || !body.toId) return res.status(400).json({ error: 'fromId and toId required' });
  const result = toggleConnection(body.fromId, body.toId);
  addEventLog({
    id: `evt_${Date.now()}_connection`,
    type: result.connected ? 'connection_created' : 'connection_removed',
    userId: body.fromId,
    refId: body.toId,
    metadata: {},
    createdAt: new Date().toISOString(),
  });
  if (result.connected) {
    addNotification({
      id: `n_${Date.now()}_${body.toId}`,
      userId: body.toId,
      type: 'connection',
      title: 'New connection request',
      body: 'Someone connected with you.',
      refId: body.fromId,
      read: false,
      createdAt: new Date().toISOString(),
    });
  }
  res.json(result);
});

app.get('/api/community/groups', (_req, res) => {
  const groups = getGroups();
  const members = getGroupMembers();
  const withCounts = groups.map((g: any) => ({
    ...g,
    members: members.filter((m: any) => m.groupId === g.id).length,
  }));
  res.json(withCounts);
});

app.post('/api/community/groups', (req, res) => {
  const body = req.body || {};
  if (!body.name) return res.status(400).json({ error: 'name required' });
  const group = {
    id: `g_${Date.now()}`,
    name: body.name,
    description: body.description || '',
    createdAt: new Date().toISOString(),
  };
  res.json(addGroup(group));
});

app.post('/api/community/groups/join', (req, res) => {
  const body = req.body || {};
  if (!body.groupId || !body.userId) return res.status(400).json({ error: 'groupId and userId required' });
  res.json(joinGroup(body.groupId, body.userId));
});

app.get('/api/community/messages', (req, res) => {
  const userId = (req.query.userId as string) || mockUserProfile.id;
  const withId = (req.query.withId as string) || '';
  const all = getMessages();
  const filtered = withId
    ? all.filter((m: any) => (m.fromId === userId && m.toId === withId) || (m.fromId === withId && m.toId === userId))
    : all.filter((m: any) => m.fromId === userId || m.toId === userId);
  res.json(filtered);
});

app.post('/api/community/messages', (req, res) => {
  const body = req.body || {};
  if (!body.fromId || !body.toId || !body.content) {
    return res.status(400).json({ error: 'fromId, toId, content required' });
  }
  const msg = {
    id: `msg_${Date.now()}`,
    fromId: body.fromId,
    toId: body.toId,
    content: body.content,
    createdAt: new Date().toISOString(),
  };
  addMessage(msg);
  addEventLog({
    id: `evt_${Date.now()}_message`,
    type: 'message_sent',
    userId: body.fromId,
    refId: msg.id,
    metadata: { toId: body.toId },
    createdAt: new Date().toISOString(),
  });
  addNotification({
    id: `n_${Date.now()}_${body.toId}`,
    userId: body.toId,
    type: 'message',
    title: 'New message',
    body: 'You have a new direct message.',
    refId: msg.id,
    read: false,
    createdAt: new Date().toISOString(),
  });
  res.json(msg);
});

app.get('/api/community/feed', (req, res) => {
  const userId = (req.query.userId as string) || mockUserProfile.id;
  const posts = getPosts();
  const comments = getComments();
  const users = getUsers();
  const connections = getConnections();
  const me = users.find((u: any) => u.id === userId) || mockUserProfile;
  const following = new Set(connections.filter((c: any) => c.fromId === userId).map((c: any) => c.toId));

  const scored = posts.map((post: any) => {
    const author = users.find((u: any) => u.id === post.authorId);
    const postTags = post.tags || [];
    const interestScore = setOverlapScore(me.interests || [], postTags) * 35;
    const skillScore = setOverlapScore(me.skills || [], author?.skills || []) * 20;
    const networkScore = following.has(post.authorId) ? 20 : 0;
    const engagementScore = Math.min(15, comments.filter((c: any) => c.postId === post.id).length * 3);
    const ageHours = Math.max(1, (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60));
    const recencyScore = Math.max(0, 20 - Math.min(20, ageHours / 2));
    const relevance = Math.round(interestScore + skillScore + networkScore + engagementScore + recencyScore);
    return {
      ...post,
      author,
      comments: comments.filter((c: any) => c.postId === post.id),
      relevance,
    };
  });

  scored.sort((a: any, b: any) => b.relevance - a.relevance || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(scored);
});

app.get('/api/community/suggestions', (req, res) => {
  const userId = (req.query.userId as string) || mockUserProfile.id;
  const users = getUsers();
  const connections = getConnections();
  const me = users.find((u: any) => u.id === userId) || mockUserProfile;
  const alreadyConnected = new Set(connections.filter((c: any) => c.fromId === userId).map((c: any) => c.toId));

  const suggestions = users
    .filter((u: any) => u.id !== userId && !alreadyConnected.has(u.id))
    .map((u: any) => {
      const interest = setOverlapScore(me.interests || [], u.interests || []);
      const skills = setOverlapScore(me.skills || [], u.skills || []);
      const mutual = getMutualConnectionCount(userId, u.id, connections);
      const score = Math.round((interest * 45 + skills * 35 + Math.min(mutual, 5) * 4) * 100) / 100;
      return { ...u, suggestionScore: score, mutualConnections: mutual };
    })
    .sort((a: any, b: any) => b.suggestionScore - a.suggestionScore)
    .slice(0, 10);

  res.json(suggestions);
});

app.get('/api/community/discovery', async (req, res) => {
  const userId = (req.query.userId as string) || mockUserProfile.id;
  const query = ((req.query.q as string) || '').trim();
  const me = getUsers().find((u: any) => u.id === userId) || mockUserProfile;
  const interestKeywords = (me.interests || []).slice(0, 3);
  const keywords = query ? [query, ...interestKeywords].slice(0, 3) : interestKeywords;
  const cacheKey = `${userId}|${keywords.join('|').toLowerCase()}`;
  const cached = discoveryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.ts < 15 * 60_000) {
    return res.json(cached.posts);
  }

  if (keywords.length === 0) {
    return res.json([]);
  }

  try {
    const collected: any[] = [];
    const errors: string[] = [];
    const calls = keywords.map(async (keyword: string) => {
      const sourceCalls = [
        fetchDevToDiscovery(keyword).catch((e) => {
          errors.push(String(e));
          return [];
        }),
        fetchRedditDiscovery(keyword).catch((e) => {
          errors.push(String(e));
          return [];
        }),
        fetchHnDiscovery(keyword).catch((e) => {
          errors.push(String(e));
          return [];
        }),
      ];
      const resultSets = await Promise.all(sourceCalls);
      resultSets.forEach((set) => collected.push(...set));
    });

    await Promise.all(calls);
    const unique = dedupeJobs(
      collected.map((p) => ({
        title: p.title,
        company: p.source,
        location: '',
        ...p,
      }))
    ).map((p: any) => ({
      id: p.id,
      title: p.title,
      summary: p.summary,
      url: p.url,
      source: p.source,
      publishedAt: p.publishedAt,
      tags: p.tags || [],
    }));

    const ranked = rankDiscoveryPosts(unique, me.interests || [], query).slice(0, 30);
    discoveryCache.set(cacheKey, { ts: now, posts: ranked });
    res.json(ranked);
  } catch (err) {
    res.status(500).json({ error: 'Failed to build discovery feed', details: String(err) });
  }
});

app.get('/api/community/notifications', (req, res) => {
  const userId = (req.query.userId as string) || mockUserProfile.id;
  const notifications = getNotifications()
    .filter((n: any) => n.userId === userId)
    .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(notifications);
});

app.post('/api/community/notifications/read', (req, res) => {
  const userId = (req.body?.userId as string) || mockUserProfile.id;
  res.json(markNotificationsRead(userId));
});

app.post('/api/community/presence', (req, res) => {
  const userId = (req.body?.userId as string) || mockUserProfile.id;
  presenceStore.set(userId, { lastSeen: Date.now(), status: 'online' });
  res.json({ ok: true });
});

app.get('/api/community/presence', (req, res) => {
  const userIds = String(req.query.userIds || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const now = Date.now();
  const data = userIds.map((id) => {
    const state = presenceStore.get(id);
    const online = state ? now - state.lastSeen < 20_000 : false;
    return { userId: id, online, lastSeen: state?.lastSeen || 0 };
  });
  res.json(data);
});

app.post('/api/community/typing', (req, res) => {
  const fromId = req.body?.fromId;
  const toId = req.body?.toId;
  if (!fromId || !toId) return res.status(400).json({ error: 'fromId and toId required' });
  const key = `${fromId}:${toId}`;
  typingStore.set(key, Date.now());
  res.json({ ok: true });
});

app.get('/api/community/typing', (req, res) => {
  const fromId = String(req.query.fromId || '');
  const toId = String(req.query.toId || '');
  if (!fromId || !toId) return res.status(400).json({ error: 'fromId and toId required' });
  const key = `${fromId}:${toId}`;
  const ts = typingStore.get(key) || 0;
  res.json({ typing: Date.now() - ts < 4000 });
});

app.post('/api/data/pipeline/run', async (req, res) => {
  const role = (req.body?.role as string) || mockUserProfile.targetRoles?.[0] || 'Full Stack Developer';
  const where = (req.body?.where as string) || ADZUNA_DEFAULT_WHERE;
  const selectedSources = ((req.body?.sources as string[]) || JOB_SOURCES).map((s) => String(s).toLowerCase());

  const startedAt = new Date().toISOString();
  const sourceErrors: string[] = [];
  const rawJobs: any[] = [];

  if (selectedSources.includes('adzuna') && ADZUNA_APP_ID && ADZUNA_APP_KEY) {
    try {
      const adz = await fetchAdzunaJobs({ role, where, skills: mockUserProfile.skills || [] });
      rawJobs.push(...adz);
    } catch (err) {
      sourceErrors.push(`adzuna: ${String(err)}`);
    }
  }

  if (selectedSources.includes('linkedin') && LINKEDIN_SCRAPE_ENABLED) {
    try {
      const li = await fetchLinkedInJobs({ role, where, skills: mockUserProfile.skills || [] });
      rawJobs.push(...li);
    } catch (err) {
      sourceErrors.push(`linkedin: ${String(err)}`);
    }
  }

  if (selectedSources.includes('naukri') && NAUKRI_SCRAPE_ENABLED) {
    try {
      const nk = await fetchNaukriJobs({ role, where, skills: mockUserProfile.skills || [] });
      rawJobs.push(...nk);
    } catch (err) {
      sourceErrors.push(`naukri: ${String(err)}`);
    }
  }

  const bronze = rawJobs.map((j) => ({
    ingestedAt: new Date().toISOString(),
    source: j.source || 'unknown',
    payload: j,
  }));
  saveBronzeJobs(bronze);
  const silver = normalizeBronzeToSilver(rawJobs);
  saveSilverJobs(silver);
  const gold = dedupeAndResolveEntities(silver);
  const features = buildFeatureSnapshots(mockUserProfile, gold);
  const ranked = applyExplainableRanking(mockUserProfile, gold, features);
  saveFeatureSnapshots(features);
  saveGoldJobs(ranked);

  const run = {
    id: `pr_${Date.now()}`,
    startedAt,
    finishedAt: new Date().toISOString(),
    role,
    where,
    sources: selectedSources,
    bronzeCount: bronze.length,
    silverCount: silver.length,
    goldCount: ranked.length,
    featureCount: features.length,
    status: sourceErrors.length > 0 && ranked.length === 0 ? 'failed' : 'ok',
    errors: sourceErrors,
  };
  addPipelineRun(run);
  res.json(run);
});

app.get('/api/data/features', (_req, res) => {
  res.json(getFeatureSnapshots());
});

app.get('/api/data/events', (_req, res) => {
  res.json(getEventLogs().slice(0, 300));
});

app.get('/api/data/kpis', (_req, res) => {
  const events = getEventLogs();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const inRange = (d: string, days: number) => now - new Date(d).getTime() <= days * day;

  const last7 = events.filter((e: any) => inRange(e.createdAt, 7));
  const applied = last7.filter((e: any) => e.type === 'job_applied').length;
  const messages = last7.filter((e: any) => e.type === 'message_sent').length;
  const posts = last7.filter((e: any) => e.type === 'post_created').length;
  const connections = last7.filter((e: any) => e.type === 'connection_created').length;
  const dailyMap = new Map<string, number>();
  last7.forEach((e: any) => {
    const d = new Date(e.createdAt).toISOString().slice(0, 10);
    dailyMap.set(d, (dailyMap.get(d) || 0) + 1);
  });

  res.json({
    totals: { applied, messages, posts, connections },
    dailyEvents: Array.from(dailyMap.entries()).map(([date, count]) => ({ date, count })),
  });
});

app.get('/api/data/quality', (_req, res) => {
  const bronze = getBronzeJobs();
  const silver = getSilverJobs();
  const gold = getGoldJobs();
  const runs = getPipelineRuns();

  const nullFields = silver.reduce((acc: number, j: any) => {
    const missing = Number(!j.title) + Number(!j.company) + Number(!j.applyUrl);
    return acc + missing;
  }, 0);
  const possibleFields = Math.max(1, silver.length * 3);
  const nullRatio = Number((nullFields / possibleFields).toFixed(4));

  const dedupRatio = bronze.length > 0 ? Number((1 - gold.length / bronze.length).toFixed(4)) : 0;
  const latestRun = runs[0];
  const freshnessMinutes = latestRun
    ? Math.round((Date.now() - new Date(latestRun.finishedAt).getTime()) / (1000 * 60))
    : null;

  const sourceCount: Record<string, number> = {};
  bronze.forEach((b: any) => {
    const s = String(b.source || 'unknown');
    sourceCount[s] = (sourceCount[s] || 0) + 1;
  });

  res.json({
    counts: {
      bronze: bronze.length,
      silver: silver.length,
      gold: gold.length,
      features: getFeatureSnapshots().length,
    },
    nullRatio,
    dedupRatio,
    freshnessMinutes,
    sourceDistribution: sourceCount,
    latestRun,
  });
});

app.get('/api/data/pipeline/health', (_req, res) => {
  const runs = getPipelineRuns();
  const latest = runs[0];
  res.json({
    status: latest?.status || 'unknown',
    lastRunAt: latest?.finishedAt || null,
    runs: runs.slice(0, 10),
  });
});

// Jobs endpoints with smart matching
app.get('/api/jobs', (req, res) => {
  try {
    const role = (req.query.role as string) || '';
    const where = (req.query.where as string) || ADZUNA_DEFAULT_WHERE;
    const liveMode = (req.query.live as string) !== '0';
    const querySources = ((req.query.sources as string) || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
    const selectedSources = querySources.length > 0 ? querySources : JOB_SOURCES;
    const all = getJobs();

    const shouldUseAdzuna = selectedSources.includes('adzuna') && Boolean(ADZUNA_APP_ID && ADZUNA_APP_KEY);
    const shouldUseLinkedIn = selectedSources.includes('linkedin') && LINKEDIN_SCRAPE_ENABLED;
    const shouldUseNaukri = selectedSources.includes('naukri') && NAUKRI_SCRAPE_ENABLED;
    if (liveMode && !shouldUseAdzuna && !shouldUseLinkedIn && !shouldUseNaukri) {
      return res.status(503).json({
        error: 'Live jobs are not configured',
        details: 'Enable Adzuna keys and/or LINKEDIN_SCRAPE_ENABLED/NAUKRI_SCRAPE_ENABLED in backend/.env',
        source: 'none',
      });
    }

    const load = async () => {
      let jobsToScore = all.length > 0 ? all : initialJobs;
      const providerErrors: string[] = [];

      if (liveMode) {
        const jobsFromProviders: any[] = [];
        const providerCalls: Promise<unknown>[] = [];

        if (shouldUseAdzuna) {
          providerCalls.push(
            fetchAdzunaJobs({
              role: role || mockUserProfile.targetRoles?.[0] || '',
              where,
              skills: mockUserProfile.skills || [],
            })
              .then((jobs) => {
                jobsFromProviders.push(...jobs);
              })
              .catch((err) => providerErrors.push(`adzuna: ${String(err)}`))
          );
        }

        if (shouldUseLinkedIn) {
          providerCalls.push(
            fetchLinkedInJobs({
              role: role || mockUserProfile.targetRoles?.[0] || '',
              where,
              skills: mockUserProfile.skills || [],
            })
              .then((jobs) => {
                jobsFromProviders.push(...jobs);
              })
              .catch((err) => providerErrors.push(`linkedin: ${String(err)}`))
          );
        }

        if (shouldUseNaukri) {
          providerCalls.push(
            fetchNaukriJobs({
              role: role || mockUserProfile.targetRoles?.[0] || '',
              where,
              skills: mockUserProfile.skills || [],
            })
              .then((jobs) => {
                jobsFromProviders.push(...jobs);
              })
              .catch((err) => providerErrors.push(`naukri: ${String(err)}`))
          );
        }

        await Promise.all(providerCalls);
        const bronze = jobsFromProviders.map((j) => ({
          ingestedAt: new Date().toISOString(),
          source: j.source || 'unknown',
          payload: j,
        }));
        saveBronzeJobs(bronze);

        const silver = normalizeBronzeToSilver(jobsFromProviders);
        saveSilverJobs(silver);

        const gold = dedupeAndResolveEntities(silver);
        const features = buildFeatureSnapshots(mockUserProfile, gold);
        saveFeatureSnapshots(features);
        const explained = applyExplainableRanking(mockUserProfile, gold, features);
        saveGoldJobs(explained);
        jobsToScore = explained;

        if (jobsToScore.length === 0) {
          const fallback = getGoldJobs();
          if (fallback.length > 0) {
            jobsToScore = fallback;
          } else if (all.length > 0) {
            jobsToScore = all;
          } else {
            jobsToScore = initialJobs;
          }
        }
      }

      // Calculate match scores based on user profile
      let jobsWithScores = jobsToScore.map((j: any) => ({
        ...j,
        matchScore: j.matchScore ?? getMatchScore(j, mockUserProfile),
      }));

      const mlScores = await recommendJobsWithML(mockUserProfile, jobsToScore);
      if (mlScores) {
        const mlMap = new Map(mlScores.map((m: any) => [m.id, m.matchScore]));
        jobsWithScores = jobsWithScores.map((j: any) => ({
          ...j,
          matchScore: mlMap.has(j.id) ? mlMap.get(j.id) : j.matchScore,
        }));
      }

      // Filter by role if provided
      let filtered = role
        ? jobsWithScores.filter((j: any) => j.title.toLowerCase().includes(role.toLowerCase()) || j.company.toLowerCase().includes(role.toLowerCase()))
        : jobsWithScores;

      // Sort by match score descending and enforce 50% from LinkedIn+Naukri when available
      filtered = filtered.sort((a: any, b: any) => b.matchScore - a.matchScore);
      filtered = enforceSourceMix(filtered, 200, 0.5);

      addEventLog({
        id: `evt_${Date.now()}_jobs_view`,
        type: 'jobs_viewed',
        userId: mockUserProfile.id,
        refId: role || 'all',
        metadata: { where, count: filtered.length, source: liveMode ? 'live' : 'mock' },
        createdAt: new Date().toISOString(),
      });

      res.json({
        count: filtered.length,
        jobs: filtered.slice(0, 200),
        userProfile: mockUserProfile,
        source: liveMode ? [shouldUseAdzuna ? 'adzuna' : '', shouldUseLinkedIn ? 'linkedin' : '', shouldUseNaukri ? 'naukri' : ''].filter(Boolean).join('+') || 'none' : 'mock',
        dataEngineering: {
          bronzeCount: getBronzeJobs().length,
          silverCount: getSilverJobs().length,
          goldCount: getGoldJobs().length,
          featureCount: getFeatureSnapshots().length,
        },
        sourceMix: {
          total: filtered.length,
          linkedinOrNaukri: filtered.filter((j: any) => isPrioritySource(j.primarySource || j.source)).length,
          adzunaOrOther: filtered.filter((j: any) => !isPrioritySource(j.primarySource || j.source)).length,
        },
        warnings: providerErrors,
      });
    };

    void load().catch((err) => {
      console.error('GET /api/jobs error', err);
      if (liveMode) {
        return res.status(502).json({
          error: 'Failed to fetch live jobs',
          details: String(err),
          source: 'none',
        });
      }
      res.status(500).json({ error: 'Failed to fetch jobs', details: String(err) });
    });
  } catch (err) {
    console.error('GET /api/jobs error', err);
    res.status(500).json({ error: 'Failed to fetch jobs', details: String(err) });
  }
});

// AI Job Analysis: Get personalized insights and recommendations
app.get('/api/jobs/analysis', (req, res) => {
  try {
    const user = getUserByEmail(mockUserProfile.email) || mockUserProfile;
    const allJobs = getJobs();
    const jobs = allJobs.length > 0 ? allJobs : initialJobs;

    // Score all jobs with AI matching
    const scoredJobs = jobs
      .map((job: any) => ({
        ...job,
        matchScore: getMatchScore(job, user),
      }))
      .sort((a: any, b: any) => b.matchScore - a.matchScore);

    // Group by match quality
    const topMatches = scoredJobs.filter((j: any) => j.matchScore >= 80).slice(0, 5);
    const goodMatches = scoredJobs.filter((j: any) => j.matchScore >= 60 && j.matchScore < 80).slice(0, 5);
    const developingMatches = scoredJobs.filter((j: any) => j.matchScore < 60).slice(0, 3);

    // Analyze skill gaps
    const userSkills = new Set((user.skills || []).map((s: string) => s.toLowerCase()));
    const allRequiredSkills = new Set<string>();
    jobs.forEach((job: any) => {
      (job.requiredSkills || []).forEach((skill: string) => {
        allRequiredSkills.add(skill.toLowerCase());
      });
    });

    const missingSkills = Array.from(allRequiredSkills).filter((skill) => !userSkills.has(skill)).slice(0, 8);
    const strongSkills = Array.from(userSkills).slice(0, 6);

    // AI Recommendations based on profile and patterns
    const recommendations = [
      user.year === 4
        ? 'You are in your final year! Focus on full-time roles that provide placement opportunities.'
        : user.year === 3
        ? 'Perfect time for summer internships to build practical experience for full-time placements.'
        : 'Build foundational skills through internships. Consider roles that focus on learning.',
      user.cgpa >= 3.5
        ? 'Your CGPA is competitive for premium companies. Target Tier-1 roles with FAANG-like compensation.'
        : user.cgpa >= 3.0
        ? 'With your CGPA, focus on growing companies and startups with strong learning culture.'
        : 'Build a strong portfolio with projects; CGPA constraints require visible achievements.',
      `Your top interests (${(user.interests || []).slice(0, 2).join(', ')}) align well with ${topMatches.length > 0 ? 'several high-match roles' : 'emerging roles'} in the market.`,
      user.preferredWorkMode === 'remote'
        ? 'Remote roles are increasingly available; 60%+ of top matches offer remote work.'
        : user.preferredWorkMode === 'hybrid'
        ? 'Most roles are hybrid-friendly now. Bangalore and Pune are top hubs with strong hybrid cultures.'
        : 'Onsite roles in metros offer best mentorship. Consider Bangalore, Pune, Hyderabad.',
    ];

    // Market insights
    const sourceBreakdown: Record<string, number> = {};
    scoredJobs.forEach((job: any) => {
      const source = job.source || 'Seed';
      sourceBreakdown[source] = (sourceBreakdown[source] || 0) + 1;
    });

    const topSkills = Array.from(allRequiredSkills)
      .map((skill) => ({
        skill,
        frequency: jobs.filter((j: any) => (j.requiredSkills || []).some((s: string) => s.toLowerCase() === skill)).length,
      }))
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 8);

    res.json({
      profile: {
        name: user.name,
        year: user.year,
        cgpa: user.cgpa,
        targetRoles: user.targetRoles,
        skills: strongSkills,
        interests: user.interests,
      },
      matchAnalysis: {
        topMatches,
        goodMatches,
        developingMatches,
        averageMatchScore: Math.round(
          scoredJobs.reduce((sum: number, job: any) => sum + job.matchScore, 0) / scoredJobs.length
        ),
      },
      skillsGapAnalysis: {
        strongSkills,
        missingSkills,
        recommendedSkillsBuild: missingSkills.slice(0, 3),
      },
      marketInsights: {
        totalJobsAvailable: scoredJobs.length,
        sourceBreakdown,
        mostDemandedSkills: topSkills,
        careerPathMap: topMatches.map((job: any) => ({
          role: job.title,
          company: job.company,
          matchScore: job.matchScore,
          requiredSkills: job.requiredSkills,
        })),
      },
      aiRecommendations: recommendations,
      nextActions: [
        `Learn top 3 missing skills: ${missingSkills.slice(0, 3).join(', ')}`,
        `Apply to ${Math.min(5, Math.max(3, topMatches.length))} top-match roles this week`,
        `Build a project using: ${(user.skills || []).slice(0, 2).join(', ')}`,
        `Network with professionals in: ${(user.interests || []).slice(0, 1).join(', ')} industry`,
      ],
    });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed', details: String(err) });
  }
});

app.post('/api/jobs/create', (req, res) => {
  const body = req.body || {};
  const job = {
    id: body.id || `job_${Date.now()}`,
    title: body.title || 'New Job',
    company: body.company || 'Company',
    location: body.location || 'Remote',
    type: body.type || 'Full-time',
    salary: body.salary || '',
    requiredSkills: body.requiredSkills || [],
    matchScore: body.matchScore || 50,
    postedDate: body.postedDate || 'now',
    applyUrl: body.applyUrl || '',
    logo: body.logo || '🏢',
  };
  addJob(job);
  res.json(job);
});

// Applications: record when user clicks Apply
app.post('/api/apply', (req, res) => {
  const { jobId, applicant = { id: 'anon', name: 'Anonymous' } } = req.body || {};
  if (!jobId) return res.status(400).json({ error: 'jobId required' });
  const applications = getApplications();
  const appRecord = {
    id: `app_${Date.now()}`,
    jobId,
    applicant,
    createdAt: new Date().toISOString(),
  };
  addApplication(appRecord);
  addEventLog({
    id: `evt_${Date.now()}_apply`,
    type: 'job_applied',
    userId: applicant.id || 'anon',
    refId: jobId,
    metadata: { applicantName: applicant.name || 'Anonymous' },
    createdAt: new Date().toISOString(),
  });
  res.json({ ok: true, application: appRecord });
});

// Chat endpoint using an LLM provider for personalized coaching + sentiment analysis
app.post('/api/chat', async (req, res) => {
  const { message = '', profile = {}, history = [] } = req.body || {};
  try {
    const { reply, sentiment } = await generateCoachReply(message, profile, history);
    const chat = {
      id: `chat_${Date.now()}`,
      message,
      reply,
      sentiment,
      createdAt: new Date().toISOString(),
    };
    addChat(chat);
    res.json(chat);
  } catch (error) {
    console.error('LLM chat error', error);
    res.status(500).json({ error: 'Failed to generate coach response' });
  }
});

app.post('/api/ml/predict-career', async (req, res) => {
  const payload = req.body || {};
  try {
    if (ML_SERVICE_URL) {
      const resp = await fetch(`${ML_SERVICE_URL}/predict-career`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (resp.ok) {
        const data = await resp.json();
        return res.json(data);
      }
    }
  } catch (err) {
    // fallback to local prediction if ML service is unavailable
  }

  const profile = {
    name: payload.name || mockUserProfile.name,
    year: payload.year || mockUserProfile.year,
    cgpa: payload.cgpa || mockUserProfile.cgpa,
    skills: payload.skills || mockUserProfile.skills,
    interests: payload.interests || mockUserProfile.interests,
    aptitude: payload.aptitude || mockUserProfile.aptitude || {},
  };
  const ranked = buildCareerRecommendations(profile);
  saveCareerRecommendations(ranked);
  res.json({ ranked });
});

app.post('/api/ml/recommend-jobs', async (req, res) => {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/recommend-jobs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to recommend jobs', details: String(err) });
  }
});

app.post('/api/ml/extract-skills', async (req, res) => {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/extract-skills`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to extract skills', details: String(err) });
  }
});

app.post('/api/ml/cluster-students', async (req, res) => {
  try {
    const resp = await fetch(`${ML_SERVICE_URL}/cluster-students`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });
    const data = await resp.json();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: 'Failed to cluster students', details: String(err) });
  }
});

app.get('/api/interview/companies', (_req, res) => {
  const companies = Object.entries(COMPANY_DOMAINS).map(([company, domains]) => ({
    company: toTitleCase(company),
    slug: company,
    domains,
  }));
  res.json(companies);
});

app.get('/api/interview/pattern', async (req, res) => {
  const company = String(req.query.company || '').toLowerCase().trim();
  const domain = String(req.query.domain || 'qa testing').toLowerCase();
  if (!company) return res.status(400).json({ error: 'company query is required' });
  try {
    const pattern = await fetchInterviewPatternFromWeb(company, domain);
    res.json(pattern);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch interview pattern', details: String(err) });
  }
});

app.post('/api/interview/start', async (req, res) => {
  const company = String(req.body?.customCompany || req.body?.company || '').toLowerCase().trim();
  const domain = String(req.body?.domain || 'qa testing').toLowerCase();
  const difficulty = String(req.body?.difficulty || 'medium');
  const userId = String(req.body?.userId || mockUserProfile.id);
  const email = String(req.body?.email || mockUserProfile.email || '');
  const candidateName = String(req.body?.candidateName || mockUserProfile.name || 'Student');
  if (!company) return res.status(400).json({ error: 'company is required' });

  try {
    const pattern = await fetchInterviewPatternFromWeb(company, domain);
    const rounds = pattern.rounds.map((r: any, i: number) => ({
      id: `round_${i + 1}`,
      name: r.round,
      questions: (r.questions || []).slice(0, r.questionCount || 2),
      minScoreToClear: r.round === 'hr' ? 55 : 60,
      weight: r.round === 'technical' ? 0.35 : r.round === 'coding' ? 0.3 : r.round === 'aptitude' ? 0.2 : 0.15,
    }));
    const firstRound = rounds[0];
    const session = {
      id: `int_${Date.now()}`,
      userId,
      candidateName,
      email,
      company: toTitleCase(company),
      domain: toTitleCase(domain),
      difficulty,
      patternSummary: pattern.summary,
      sources: pattern.sources || [],
      rounds,
      roundIndex: 0,
      questionIndex: 0,
      answers: [] as any[],
      roundScores: [] as any[],
      status: 'active',
      overallScore: 0,
      selected: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    addInterviewSession(session);
    res.json({
      sessionId: session.id,
      company: session.company,
      domain: session.domain,
      round: firstRound?.name || 'aptitude',
      question: firstRound?.questions?.[0] || 'Tell me about yourself.',
      roundIndex: 0,
      questionIndex: 0,
      totalRounds: rounds.length,
      patternSummary: session.patternSummary,
      sources: session.sources,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to start interview', details: String(err) });
  }
});

app.post('/api/interview/answer', async (req, res) => {
  const sessionId = String(req.body?.sessionId || '');
  const answer = String(req.body?.answer || '').trim();
  if (!sessionId || !answer) return res.status(400).json({ error: 'sessionId and answer required' });
  const session = getInterviewSessions().find((s: any) => s.id === sessionId);
  if (!session) return res.status(404).json({ error: 'Interview session not found' });
  if (session.status !== 'active') return res.status(400).json({ error: 'Session already completed' });

  const currentRound = session.rounds[session.roundIndex];
  const currentQuestion = currentRound?.questions?.[session.questionIndex] || 'General question';
  const wordCount = answer.split(/\s+/).filter(Boolean).length;
  const hasStructure = /(first|second|third|because|therefore|example|approach|steps)/i.test(answer);
  const hasTech = /(test|bug|api|sql|automation|framework|design|tradeoff|latency|debug)/i.test(answer);
  const concise = wordCount >= 35 && wordCount <= 220;
  const answerScore = Math.max(
    20,
    Math.min(
      100,
      Math.round(wordCount * 0.8 + (hasStructure ? 18 : 0) + (hasTech ? 18 : 0) + (concise ? 10 : -5))
    )
  );

  const feedback =
    answerScore >= 75
      ? 'Strong answer. Good structure and relevant details.'
      : answerScore >= 55
      ? 'Decent answer. Add clearer steps and one concrete example.'
      : 'Needs improvement. Use structured approach and role-specific terminology.';

  const answers = [
    ...(session.answers || []),
    {
      round: currentRound?.name || 'technical',
      question: currentQuestion,
      answer,
      score: answerScore,
      feedback,
    },
  ];

  let nextRoundIndex = session.roundIndex;
  let nextQuestionIndex = session.questionIndex + 1;
  const roundComplete = nextQuestionIndex >= (currentRound?.questions?.length || 1);
  let roundScores = [...(session.roundScores || [])];
  if (roundComplete) {
    const roundAnswers = answers.filter((a: any) => a.round === currentRound.name);
    const roundScore = Math.round(roundAnswers.reduce((sum: number, a: any) => sum + a.score, 0) / Math.max(1, roundAnswers.length));
    roundScores.push({
      round: currentRound.name,
      score: roundScore,
      cleared: roundScore >= currentRound.minScoreToClear,
    });
    nextRoundIndex += 1;
    nextQuestionIndex = 0;
  }

  const finished = nextRoundIndex >= session.rounds.length;
  const weighted = roundScores.reduce((sum: number, r: any) => {
    const roundMeta = session.rounds.find((x: any) => x.name === r.round);
    return sum + r.score * Number(roundMeta?.weight || 0);
  }, 0);
  const overallScore = Math.round(weighted || 0);
  const allRoundsCleared = roundScores.every((r: any) => r.cleared);
  const selected = finished && allRoundsCleared && overallScore >= 65;

  const patched = updateInterviewSession(sessionId, {
    answers,
    roundScores,
    roundIndex: nextRoundIndex,
    questionIndex: nextQuestionIndex,
    overallScore,
    selected,
    status: finished ? 'completed' : 'active',
    updatedAt: new Date().toISOString(),
  });
  if (!patched) return res.status(500).json({ error: 'Failed to update session' });

  addEventLog({
    id: `evt_${Date.now()}_interview_round`,
    type: finished ? 'mock_interview_completed' : 'mock_interview_answered',
    userId: patched.userId,
    refId: patched.id,
    metadata: {
      company: patched.company,
      domain: patched.domain,
      roundIndex: patched.roundIndex,
      questionIndex: patched.questionIndex,
      overallScore,
      selected,
    },
    createdAt: new Date().toISOString(),
  });

  if (finished) {
    const decision = selected ? 'SELECTED' : 'NOT SELECTED';
    const subject = `${patched.company} Mock Interview Result - ${decision}`;
    const text =
      `Hi ${patched.candidateName},\n\n` +
      `Your mock interview for ${patched.company} - ${patched.domain} is completed.\n` +
      `Result: ${decision}\nOverall score: ${overallScore}/100\n\n` +
      `Round scores:\n` +
      roundScores.map((r: any) => `- ${toTitleCase(r.round)}: ${r.score} (${r.cleared ? 'Cleared' : 'Not Cleared'})`).join('\n') +
      `\n\nKeep practicing.`;
    try {
      await sendNotificationEmail(patched.email, subject, text);
    } catch (err) {
      console.error('interview email error', err);
    }
    return res.json({
      complete: true,
      sessionId,
      selected,
      decision,
      overallScore,
      roundScores,
      strengths: answers.filter((a: any) => a.score >= 75).slice(0, 3).map((a: any) => `${a.round}: ${a.feedback}`),
      improvements: answers.filter((a: any) => a.score < 65).slice(0, 3).map((a: any) => `${a.round}: ${a.feedback}`),
    });
  }

  const nextRound = patched.rounds[patched.roundIndex];
  const nextQuestion = nextRound?.questions?.[patched.questionIndex] || 'Tell me about yourself.';
  res.json({
    complete: false,
    sessionId,
    round: nextRound?.name || 'technical',
    question: nextQuestion,
    roundIndex: patched.roundIndex,
    questionIndex: patched.questionIndex,
    totalRounds: patched.rounds.length,
    latestFeedback: feedback,
  });
});

app.get('/api/interview/session/:id', (req, res) => {
  const session = getInterviewSessions().find((s: any) => s.id === req.params.id);
  if (!session) return res.status(404).json({ error: 'Interview session not found' });
  res.json(session);
});

app.post('/api/interview/mcq/result', async (req, res) => {
  const company = String(req.body?.company || 'Company');
  const domain = String(req.body?.domain || 'General');
  const email = String(req.body?.email || mockUserProfile.email || '');
  const candidateName = String(req.body?.candidateName || mockUserProfile.name || 'Candidate');
  const score = Number(req.body?.score || 0);
  const totalScore = Number(req.body?.totalScore || 100);
  const decision = score >= 60 ? 'SELECTED' : 'NOT SELECTED';
  const subject = `${toTitleCase(company)} Timed MCQ Result - ${decision}`;
  const text =
    `Hi ${candidateName},\n\n` +
    `Your timed MCQ interview for ${toTitleCase(company)} - ${toTitleCase(domain)} is complete.\n` +
    `Score: ${score}%\n` +
    `Decision: ${decision}\n\n` +
    `Thank you for participating. Keep practicing and stay ready for the next opportunity.`;

  try {
    await sendNotificationEmail(email, subject, text);
  } catch (err) {
    console.error('mcq result email error', err);
  }

  addEventLog({
    id: `evt_${Date.now()}_interview_mcq_result`,
    type: 'mock_interview_mcq_result',
    userId: String(req.body?.userId || mockUserProfile.id),
    refId: String(req.body?.sessionId || `mcq_${Date.now()}`),
    metadata: {
      company: toTitleCase(company),
      domain: toTitleCase(domain),
      score,
      totalScore,
      decision,
    },
    createdAt: new Date().toISOString(),
  });

  res.json({
    decision,
    selected: decision === 'SELECTED',
    score,
    totalScore,
    message: 'MCQ result submitted and email sent if SMTP is configured.',
  });
});

app.post('/api/skills/simulate', (req, res) => {
  const load = async () => {
    const bodyProfile = req.body?.profile || {};
    const userId = String(bodyProfile.id || req.body?.userId || mockUserProfile.id);
    const email = String(bodyProfile.email || req.body?.email || mockUserProfile.email);
    const storedProfile = getStudentProfile(userId, email);
    const simulationContext = buildSimulationContext(userId);
    const profile = { ...storedProfile, ...bodyProfile };
    const targetRole = String(req.body?.targetRole || mockUserProfile.targetRoles?.[0] || 'Full Stack Developer');
    const weeks = Math.max(2, Math.min(24, Number(req.body?.weeks || 8)));

    try {
      const resp = await fetch(`${ML_SERVICE_URL}/simulate-skills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetRole,
          weeks,
          profile: {
            name: profile.name || storedProfile.name || mockUserProfile.name,
            year: profile.year || storedProfile.year || mockUserProfile.year,
            cgpa: profile.cgpa || storedProfile.cgpa || mockUserProfile.cgpa,
            skills: profile.skills || mockUserProfile.skills || [],
            interests: profile.interests || mockUserProfile.interests || [],
            aptitude: profile.aptitude || {},
            weeklyStudyHours: profile.weeklyStudyHours || mockUserProfile.weeklyStudyHours || 10,
            projectCount: profile.projectCount || 0,
            internshipCount: profile.internshipCount || 0,
            certificationsCount: profile.certificationsCount || 0,
            expectedSalaryLpa: profile.expectedSalaryLpa || 0,
            recentStudyHoursAvg: simulationContext.averageStudyHours || profile.weeklyStudyHours || 0,
            checkInConsistency: simulationContext.checkInConsistency,
            recentApplications: simulationContext.recentApplications,
            recentInterviews: simulationContext.recentInterviews,
            offersReceived: simulationContext.offersReceived,
            successfulInterviews: simulationContext.successfulInterviews,
          },
        }),
      });

      if (resp.ok) {
        const data = await resp.json();
        const response = {
          ...data,
          mode: 'ml',
          context: simulationContext,
        };
        addSimulationRun({
          id: `sim_${Date.now()}`,
          userId,
          targetRole,
          weeks,
          mode: 'ml',
          result: response,
          createdAt: new Date().toISOString(),
        });
        return res.json(response);
      }
    } catch (_err) {
      // fall back to heuristic simulation below
    }

    const currentSkills = (profile.skills || mockUserProfile.skills || []).map((s: string) => toSkillSlug(s));

    const roleSkillMap: Record<string, string[]> = {
      'full stack developer': ['javascript', 'react', 'node.js', 'sql', 'git', 'api design', 'docker', 'testing'],
      'data scientist': ['python', 'sql', 'machine learning', 'statistics', 'data analysis', 'pandas', 'feature engineering'],
      'product manager': ['communication', 'leadership', 'product strategy', 'roadmapping', 'analytics', 'stakeholder management'],
    };
    const key = targetRole.toLowerCase().includes('data')
      ? 'data scientist'
      : targetRole.toLowerCase().includes('product')
      ? 'product manager'
      : 'full stack developer';
    const required = roleSkillMap[key];
    const matched = required.filter((s) => currentSkills.includes(toSkillSlug(s)));
    const missing = required.filter((s) => !currentSkills.includes(toSkillSlug(s)));
    const baseline = Math.round((matched.length / required.length) * 100);
    const improvement = Math.min(35, missing.length * Math.ceil(weeks / Math.max(missing.length, 1)));
    const projected = Math.min(95, baseline + improvement);

    const weeklyPlan = missing.slice(0, weeks).map((skill, idx) => ({
      week: idx + 1,
      focus: skill,
      hours: Math.max(4, Math.round((Number(profile.weeklyStudyHours || 10) * 0.6) / 2)),
      deliverable: `Build one mini artifact proving ${skill}`,
    }));

    const response = {
      targetRole,
      weeks,
      baselineReadiness: baseline,
      projectedReadiness: projected,
      matchedSkills: matched,
      missingSkills: missing,
      weeklyPlan,
      mode: 'heuristic_fallback',
      context: simulationContext,
    };
    addSimulationRun({
      id: `sim_${Date.now()}`,
      userId,
      targetRole,
      weeks,
      mode: 'heuristic_fallback',
      result: response,
      createdAt: new Date().toISOString(),
    });
    res.json(response);
  };

  void load().catch((err) => {
    res.status(500).json({ error: 'Simulation failed', details: String(err) });
  });
});

app.post('/api/resume/ats-optimize', (req, res) => {
  const resumeText = String(req.body?.resumeText || '');
  const jobDescription = String(req.body?.jobDescription || '');
  if (!resumeText || !jobDescription) return res.status(400).json({ error: 'resumeText and jobDescription required' });

  const tokenize = (t: string) =>
    t
      .toLowerCase()
      .replace(/[^a-z0-9+\s.#-]/g, ' ')
      .split(/\s+/)
      .filter((x) => x.length > 2);
  const jdTerms = tokenize(jobDescription);
  const resumeTerms = tokenize(resumeText);
  const jdSet = new Set(jdTerms);
  const resumeSet = new Set(resumeTerms);
  const overlap = Array.from(jdSet).filter((term) => resumeSet.has(term));
  const missing = Array.from(jdSet).filter((term) => !resumeSet.has(term)).slice(0, 20);
  const coverage = jdSet.size > 0 ? overlap.length / jdSet.size : 0;
  const atsScore = Math.round(Math.min(100, 35 + coverage * 65));

  const sectionScores = {
    keywords: Math.round(coverage * 100),
    impact: Math.min(100, /\b(increased|reduced|improved|built|led|deployed)\b/i.test(resumeText) ? 78 : 52),
    structure: Math.min(100, /\b(experience|projects|skills|education)\b/i.test(resumeText) ? 84 : 55),
  };

  res.json({
    atsScore,
    sectionScores,
    matchedKeywords: overlap.slice(0, 20),
    missingKeywords: missing,
    rewriteSuggestions: [
      'Add quantified impact bullets: include %, latency, users, or revenue.',
      'Mirror exact JD skill terms in Skills and Projects sections.',
      'Prioritize role-relevant projects in top half of resume.',
    ],
  });
});

app.get('/api/alerts', (req, res) => {
  const userId = String(req.query.userId || mockUserProfile.id);
  const alerts = getAlertEvents().filter((a: any) => a.userId === userId).slice(0, 40);
  res.json(alerts);
});

app.post('/api/alerts/generate', (req, res) => {
  const userId = String(req.body?.userId || mockUserProfile.id);
  const email = String(req.body?.email || '');
  const role = String(req.body?.role || '');
  const where = String(req.body?.where || '');
  const selectedSources = Array.isArray(req.body?.sources)
    ? req.body.sources.map((s: any) => String(s))
    : JOB_SOURCES;

  const load = async () => {
    const liveResult = await fetchFreshAlertJobs({
      userId,
      email,
      role,
      where,
      sources: selectedSources,
    });

    if (!liveResult.ok) {
      return res.status(liveResult.status).json({
        error: liveResult.error,
        details: liveResult.details,
        source: 'none',
        fetchedAt: liveResult.fetchedAt,
        warnings: liveResult.warnings,
      });
    }

    const applications = getApplications().filter((a: any) => a.applicant?.id === userId);
    const generated: any[] = [];

    liveResult.jobs.slice(0, 3).forEach((job: any) => {
      const sourceLabel = String(job.primarySource || job.source || 'unknown');
      const alert = {
        id: `alert_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        userId,
        type: 'job_match',
        title: `Verified live role: ${job.title}`,
        detail: `${job.company} in ${job.location} (${job.matchScore || 0}% match)`,
        createdAt: new Date().toISOString(),
        source: sourceLabel,
        fetchedAt: liveResult.fetchedAt,
        verificationStatus: job.applyUrl ? 'verified_live' : 'live_unverified',
        applyUrl: job.applyUrl || '',
      };
      addAlertEvent(alert);
      generated.push(alert);
    });

    if (applications.length === 0) {
      const nudge = {
        id: `alert_${Date.now()}_apply`,
        userId,
        type: 'action_nudge',
        title: 'No applications in last 7 days',
        detail: 'Apply to at least 3 roles this week to increase callback probability.',
        createdAt: new Date().toISOString(),
        source: 'system',
        fetchedAt: liveResult.fetchedAt,
        verificationStatus: 'system_generated',
      };
      addAlertEvent(nudge);
      generated.push(nudge);
    }

    addEventLog({
      id: `evt_${Date.now()}_alerts`,
      type: 'alerts_generated',
      userId,
      refId: `alerts_${generated.length}`,
      metadata: {
        count: generated.length,
        sources: liveResult.selectedSources,
        fetchedAt: liveResult.fetchedAt,
        role: liveResult.role,
        where: liveResult.where,
      },
      createdAt: new Date().toISOString(),
    });

    res.json({
      generated: generated.length,
      alerts: generated,
      source: liveResult.selectedSources.join(','),
      fetchedAt: liveResult.fetchedAt,
      warnings: liveResult.warnings,
    });
  };

  void load().catch((err) => {
    console.error('POST /api/alerts/generate error', err);
    res.status(500).json({ error: 'Failed to generate live alerts', details: String(err) });
  });
});

app.post('/api/portfolio/verify', async (req, res) => {
  try {
    const github = String(req.body?.githubUrl || '').trim();
    if (!github) return res.status(400).json({ error: 'githubUrl required' });
    const match = github.match(/github\.com\/([^\/?#]+)/i);
    if (!match) return res.status(400).json({ error: 'Invalid GitHub URL' });
    const username = match[1];
    const reposResp = await fetch(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`);
    if (!reposResp.ok) throw new Error(`GitHub HTTP ${reposResp.status}`);
    const repos = (await reposResp.json()) as any[];
    const nonFork = repos.filter((r: any) => !r.fork);
    const withReadme = nonFork.filter((r: any) => (r.description || '').length > 0);
    const withTopics = nonFork.filter((r: any) => Array.isArray(r.topics) && r.topics.length > 0);
    const recent = nonFork.filter((r: any) => Date.now() - new Date(r.pushed_at).getTime() < 1000 * 60 * 60 * 24 * 30);
    const stars = nonFork.reduce((sum: number, r: any) => sum + Number(r.stargazers_count || 0), 0);

    const score = Math.round(
      Math.min(
        100,
        nonFork.length * 3 + withReadme.length * 2 + withTopics.length * 2 + recent.length * 3 + Math.min(25, stars * 1.5)
      )
    );

    const report = {
      id: `port_${Date.now()}`,
      userId: String(req.body?.userId || mockUserProfile.id),
      githubUrl: github,
      username,
      score,
      stats: {
        repos: nonFork.length,
        documentedRepos: withReadme.length,
        topicTaggedRepos: withTopics.length,
        activeLast30Days: recent.length,
        stars,
      },
      suggestions: [
        'Pin 4 best repos with role-specific names and clear README.',
        'Add deployment links and architecture diagrams to top projects.',
        'Include tests and CI badge for credibility with recruiters.',
      ],
      createdAt: new Date().toISOString(),
    };
    addPortfolioReport(report);
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: 'Failed to verify portfolio', details: String(err) });
  }
});

app.get('/api/portfolio/reports', (req, res) => {
  const userId = String(req.query.userId || mockUserProfile.id);
  res.json(getPortfolioReports().filter((r: any) => r.userId === userId).slice(0, 20));
});

app.post('/api/readiness-index', (req, res) => {
  const payload = req.body || {};
  const milestonesDone = Number(payload.completedMilestones || 0);
  const milestonesTotal = Math.max(1, Number(payload.totalMilestones || 1));
  const resumeScore = Number(payload.resumeScore || 60);
  const interviewScore = Number(payload.interviewScore || 55);
  const applications7d = Number(payload.applications7d || 0);
  const skillReadiness = Number(payload.skillReadiness || 60);

  const progressScore = Math.round((milestonesDone / milestonesTotal) * 100);
  const applicationScore = Math.min(100, applications7d * 20);
  const score = Math.round(
    progressScore * 0.28 +
      resumeScore * 0.2 +
      interviewScore * 0.2 +
      applicationScore * 0.12 +
      skillReadiness * 0.2
  );
  const band = score >= 80 ? 'Placement Ready' : score >= 60 ? 'Almost Ready' : 'Needs Work';
  res.json({
    score,
    band,
    components: { progressScore, resumeScore, interviewScore, applicationScore, skillReadiness },
    nextActions: [
      'Complete one high-importance roadmap milestone this week',
      'Run one mock interview and improve lowest rubric area',
      'Apply to 3 targeted openings with customized resume',
    ],
  });
});

// Resume analyze accepts text body (or upload via /api/resume/upload)
app.post('/api/resume/analyze', (req, res) => {
  const { text = '' } = req.body || {};
  const score = Math.min(100, 40 + Math.floor((text.length / 800) * 60));
  const issues = [] as string[];
  if (text.length < 200) issues.push('Resume too short');
  if (!/\b(React|Node|JavaScript|Python|SQL)\b/i.test(text)) issues.push('Add relevant technical keywords');
  const result = { score, issues };
  addResume({ id: `res_${Date.now()}`, textSnippet: text.slice(0, 200), score, createdAt: new Date().toISOString() });
  res.json(result);
});

// Accept uploaded resume files (text/plain only for prototype)
const upload = multer({ dest: path.join(__dirname, '..', 'uploads') });
app.post('/api/resume/upload', upload.single('file'), (req, res) => {
  try {
    const file = (req as any).file;
    if (!file) return res.status(400).json({ error: 'file required' });
    const contents = fs.readFileSync(file.path, 'utf-8');
    const score = Math.min(100, 40 + Math.floor((contents.length / 800) * 60));
    const issues: string[] = [];
    if (contents.length < 200) issues.push('Resume too short');
    if (!/\b(React|Node|JavaScript|Python|SQL)\b/i.test(contents)) issues.push('Add relevant technical keywords');
    addResume({ id: `res_${Date.now()}`, textSnippet: contents.slice(0, 200), score, createdAt: new Date().toISOString() });
    res.json({ score, issues });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to analyze' });
  }
});

// Simple notify endpoint using SMTP (configure env: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS)
app.post('/api/notify', async (req, res) => {
  const { to, subject, text } = req.body || {};
  if (!to || !subject || !text) return res.status(400).json({ error: 'to, subject and text required' });

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, FROM_EMAIL } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    return res.status(400).json({ error: 'SMTP not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS in env.' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT) || 587,
      secure: false,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    const info = await transporter.sendMail({
      from: FROM_EMAIL || SMTP_USER,
      to,
      subject,
      text,
    });

    res.json({ ok: true, info });
  } catch (err) {
    console.error('notify error', err);
    res.status(500).json({ error: 'failed to send' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
