import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bot,
  Sparkles,
  BookOpen,
  Target,
  Briefcase,
  Send,
  Mic,
  ShieldCheck,
  Brain,
  PlayCircle,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getApiBaseUrl } from '@/lib/api';
import { useAppStore } from '@/store/useAppStore';

const quickPrompts = [
  'Create a 6-week plan for Full Stack Developer roles',
  'Review my resume for ATS gaps',
  'Give me 5 projects to stand out in Data Science',
  'Prepare me for a product manager interview',
];

type ChatMessage = {
  id: string;
  role: 'coach' | 'user';
  content: string;
  sentiment?: 'positive' | 'neutral' | 'concerned';
};

const mockThread: ChatMessage[] = [
  {
    id: 'm1',
    role: 'coach',
    content:
      'Welcome back! I combined your aptitude scores, CGPA, and recent job matches. Want a fast roadmap or a deep skill-gap breakdown?',
  },
  {
    id: 'm2',
    role: 'user',
    content: 'I want a fast roadmap for Full Stack roles and what to do this week.',
  },
  {
    id: 'm3',
    role: 'coach',
    content:
      'Got it. This week: 1) finish SQL basics, 2) deploy one full-stack mini app, 3) apply to 3 jobs. I also found 7 new matches since this morning.',
  },
];

export default function AICoachPage() {
  const { selectedCareer, profile } = useAppStore();
  const [prompt, setPrompt] = useState('');
  const [roadmapResult, setRoadmapResult] = useState<any | null>(null);
  const [resumeResult, setResumeResult] = useState<any | null>(null);
  const [thread, setThread] = useState(mockThread);
  const [chatLoading, setChatLoading] = useState(false);
  const [interviewSessionId, setInterviewSessionId] = useState('');
  const [interviewQuestion, setInterviewQuestion] = useState('');
  const [interviewAnswer, setInterviewAnswer] = useState('');
  const [interviewResult, setInterviewResult] = useState<any | null>(null);
  const [interviewLoading, setInterviewLoading] = useState(false);
  const progressSignals = useMemo(
    () => [
      { label: 'Career Fit', value: '92%', detail: 'Full Stack' },
      { label: 'Interview Readiness', value: '68%', detail: 'Frontend' },
      { label: 'Resume Score', value: '76/100', detail: 'ATS Medium' },
    ],
    []
  );

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8"
        >
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-medium text-primary-foreground backdrop-blur-sm">
              <Bot className="h-4 w-4" />
              AI Career Coach
            </div>
            <h1 className="mb-2 font-display text-3xl font-bold text-primary-foreground">
              Career Copilot Studio
            </h1>
            <p className="max-w-2xl text-primary-foreground/80">
              Chat with a role-aware assistant that blends your aptitude, resume, and market signals
              to build a clear, actionable plan.
            </p>
          </div>
          <div className="absolute right-8 top-6 hidden flex-col gap-3 md:flex">
            {progressSignals.map((signal) => (
              <div
                key={signal.label}
                className="rounded-xl bg-primary-foreground/10 px-4 py-3 text-primary-foreground backdrop-blur-md"
              >
                <p className="text-xs uppercase tracking-wide text-primary-foreground/70">{signal.label}</p>
                <p className="text-lg font-semibold">{signal.value}</p>
                <p className="text-xs text-primary-foreground/70">{signal.detail}</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="rounded-xl border border-border bg-card p-5 shadow-card"
        >
          <p className="text-sm text-muted-foreground">
            For more personalized chat, reach our AI assistant{' '}
            <a
              href="https://luna-aichatbot.netlify.app/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
            >
              Luna chatbot
              <ExternalLink className="h-4 w-4" />
            </a>
            .
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">Live Coaching Thread</h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-xs font-semibold text-success">
                <ShieldCheck className="h-4 w-4" />
                Privacy Safe
              </div>
            </div>

            <div className="space-y-4">
              {thread.map((message) => (
                <div
                  key={message.id}
                  className={`rounded-2xl px-4 py-3 text-sm ${
                    message.role === 'coach'
                      ? 'bg-muted text-foreground'
                      : 'bg-primary text-primary-foreground ml-auto'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="leading-relaxed">{message.content}</p>
                    {message.role === 'coach' && message.sentiment && (
                      <span className="whitespace-nowrap rounded-full bg-primary/10 px-2 py-1 text-[11px] font-semibold text-primary-foreground">
                        {message.sentiment.toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6">
              <div className="mb-3 flex flex-wrap gap-2">
                {quickPrompts.map((item) => (
                  <button
                    key={item}
                    onClick={() => setPrompt(item)}
                    className="rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground transition hover:border-primary hover:text-primary"
                  >
                    {item}
                  </button>
                ))}
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <Textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Ask anything: roadmap, resume, interview prep..."
                  className="min-h-[110px] border-0 focus-visible:ring-0"
                />
                <div className="mt-3">
                  <label className="text-sm text-muted-foreground">Upload resume (txt)</label>
                  <input
                    type="file"
                    accept="text/plain"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = async () => {
                        const text = String(reader.result || '');
                        try {
                          const base = getApiBaseUrl();
                          const resp = await fetch(`${base}/api/resume/analyze`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ text }),
                          });
                          const result = await resp.json();
                          setResumeResult(result);
                        } catch (err) {
                          console.error(err);
                        }
                      };
                      reader.readAsText(file);
                    }}
                    className="mt-2"
                  />
                  {resumeResult && (
                    <div className="mt-2 rounded-md bg-muted/40 p-2 text-sm">
                      <strong>Resume Score:</strong> {resumeResult.score} / 100
                      <div className="text-xs text-muted-foreground">{resumeResult.issues?.join(', ')}</div>
                    </div>
                  )}
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Brain className="h-4 w-4" />
                    GPT-powered with profile context
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost">
                      <Mic className="mr-1 h-4 w-4" />
                      Voice
                    </Button>
                    <Button
                      size="sm"
                      disabled={!prompt || chatLoading}
                      onClick={async () => {
                        if (!prompt) return;
                        setChatLoading(true);
                        try {
                          const base = getApiBaseUrl();
                          const resp = await fetch(`${base}/api/chat`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              message: prompt,
                              profile,
                              history: thread,
                            }),
                          });
                          const data = await resp.json();
                          setThread((t) => [
                            ...t,
                            { id: `m${Date.now()}`, role: 'user', content: prompt },
                            {
                              id: `m${Date.now()}r`,
                              role: 'coach',
                              content: data.reply,
                              sentiment: data.sentiment || 'neutral',
                            },
                          ]);
                          setPrompt('');
                        } catch (err) {
                          console.error(err);
                        } finally {
                          setChatLoading(false);
                        }
                      }}
                    >
                      {chatLoading ? 'Sending...' : 'Send'}
                      <Send className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
                {roadmapResult && (
                  <div className="mt-4 rounded-lg border border-border bg-background p-4">
                    <h4 className="font-semibold">Roadmap: {roadmapResult.role}</h4>
                    <ul className="list-disc pl-5">
                      {roadmapResult.roadmap?.map((r: any, i: number) => (
                        <li key={i} className="text-sm">{`${r.week || i + 1}. ${r.task}`}</li>
                      ))}
                    </ul>
                    <div className="mt-2">
                      <strong>Courses</strong>
                      <ul className="pl-5">
                        {roadmapResult.courses?.map((c: any, i: number) => (
                          <li key={i}>
                            <a className="text-primary underline" href={c.url} target="_blank" rel="noreferrer">
                              {c.title}
                            </a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-6"
          >
            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">Focus Mode</h3>
              <div className="space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2">
                  <Target className="h-4 w-4 text-primary" />
                  3-day sprint for interview prep
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2">
                  <BookOpen className="h-4 w-4 text-secondary" />
                  Roadmap builder with live courses
                </div>
                <div className="flex items-center gap-3 rounded-lg bg-muted/60 px-3 py-2">
                  <Briefcase className="h-4 w-4 text-accent" />
                  Job match explainer per role
                </div>
              </div>
              <Button className="mt-4 w-full" variant="secondary">
                Activate Focus Mode
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                <PlayCircle className="h-5 w-5 text-primary" />
                Mock Interview Lab
              </h3>
              {!interviewSessionId ? (
                <Button
                  className="w-full"
                  onClick={async () => {
                    setInterviewLoading(true);
                    try {
                      const base = getApiBaseUrl();
                      const resp = await fetch(`${base}/api/interview/start`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          role: selectedCareer?.title || profile?.interests?.[0] || 'Full Stack Developer',
                        }),
                      });
                      const data = await resp.json();
                      setInterviewSessionId(data.sessionId || '');
                      setInterviewQuestion(data.question || '');
                      setInterviewResult(null);
                    } catch (err) {
                      console.error(err);
                    } finally {
                      setInterviewLoading(false);
                    }
                  }}
                >
                  {interviewLoading ? 'Starting...' : 'Start Interview'}
                </Button>
              ) : (
                <div className="space-y-3">
                  {interviewQuestion && (
                    <div className="rounded-lg bg-muted/60 p-3 text-sm text-foreground">{interviewQuestion}</div>
                  )}
                  {!interviewResult?.complete ? (
                    <>
                      <Textarea
                        value={interviewAnswer}
                        onChange={(e) => setInterviewAnswer(e.target.value)}
                        placeholder="Type your interview answer..."
                        className="min-h-[100px]"
                      />
                      <Button
                        className="w-full"
                        disabled={!interviewAnswer.trim() || interviewLoading}
                        onClick={async () => {
                          setInterviewLoading(true);
                          try {
                            const base = getApiBaseUrl();
                            const resp = await fetch(`${base}/api/interview/answer`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                sessionId: interviewSessionId,
                                answer: interviewAnswer,
                              }),
                            });
                            const data = await resp.json();
                            if (data.complete) {
                              setInterviewResult(data);
                              setInterviewQuestion('');
                            } else {
                              setInterviewQuestion(data.question || '');
                            }
                            setInterviewAnswer('');
                          } catch (err) {
                            console.error(err);
                          } finally {
                            setInterviewLoading(false);
                          }
                        }}
                      >
                        {interviewLoading ? 'Submitting...' : 'Submit Answer'}
                      </Button>
                    </>
                  ) : (
                    <div className="rounded-lg border border-success/30 bg-success/10 p-3 text-sm">
                      <p className="mb-1 flex items-center gap-2 font-semibold text-success">
                        <CheckCircle2 className="h-4 w-4" />
                        Completed - Score {interviewResult.score}
                      </p>
                      <p className="text-muted-foreground">
                        Tech {interviewResult.rubric?.technical} | Communication {interviewResult.rubric?.communication}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card p-6 shadow-card">
              <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
                Coach Capabilities
              </h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>Real-time job feed analysis and prioritization</li>
                <li>Resume scoring with ATS keyword gaps</li>
                <li>Interview simulator with rubric feedback</li>
                <li>Personalized weekly task automation</li>
              </ul>
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
