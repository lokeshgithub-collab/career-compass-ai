import { motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Target, 
  Map as MapIcon, 
  Briefcase, 
  TrendingUp, 
  Award,
  ArrowRight,
  Sparkles,
  Bot,
  FileSearch,
  Mail,
  Activity,
  BarChart3,
  CalendarCheck,
  ShieldCheck
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { ScoreRing } from '@/components/ui/score-ring';
import { useAppStore } from '@/store/useAppStore';
import { generateRoadmap, mockCareerRecommendations, mockJobOpportunities } from '@/lib/mockData';

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

function getDashboardGreetingName(profile: { name?: string; email?: string } | null) {
  const rawName = profile?.name?.trim();
  if (rawName && rawName.toLowerCase() !== 'student') {
    return rawName;
  }

  const emailLocalPart = profile?.email?.split('@')[0]?.trim();
  if (!emailLocalPart) {
    return 'Student';
  }

  const readableName = emailLocalPart
    .replace(/[._-]+/g, ' ')
    .replace(/(\D)(\d+)/g, '$1 $2')
    .replace(/(\d+)(\D)/g, '$1 $2');

  return toTitleCase(readableName);
}

export default function DashboardPage() {
  const { profile, selectedCareer, completedMilestones } = useAppStore();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [dashboardRecommendations, setDashboardRecommendations] = useState(mockCareerRecommendations);
  const [dashboardJobs, setDashboardJobs] = useState<any[]>([]);
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const greetingName = getDashboardGreetingName(profile);
  const completedMilestoneMap = completedMilestones ?? {};

  const selectedCareerTitle = selectedCareer?.title?.toLowerCase();
  const rankedSelectedCareer = selectedCareerTitle
    ? dashboardRecommendations.find((career) => career.title.toLowerCase() === selectedCareerTitle)
    : null;
  const topCareer = rankedSelectedCareer
    ? { ...selectedCareer, ...rankedSelectedCareer }
    : ((selectedCareer && typeof selectedCareer.title === 'string')
        ? selectedCareer
        : dashboardRecommendations[0] || mockCareerRecommendations[0]);
  const analytics = useMemo(() => {
    const roadmapMilestones = generateRoadmap(topCareer.title);
    const totalMilestones = roadmapMilestones.length;
    const completedCount = roadmapMilestones.filter((milestone) => completedMilestoneMap[milestone.id]).length;
    const milestoneProgress = totalMilestones > 0
      ? Math.round((completedCount / totalMilestones) * 100)
      : 0;

    const profileSignals = [
      Boolean(profile?.name?.trim() && profile.name.trim().toLowerCase() !== 'student'),
      Boolean(profile?.email?.trim()),
      Boolean(profile?.course?.trim()),
      Boolean(profile?.year),
      typeof profile?.cgpa === 'number' && profile.cgpa > 0,
      Boolean(profile?.preferredWorkMode),
      typeof profile?.weeklyStudyHours === 'number' && profile.weeklyStudyHours > 0,
      Boolean(profile?.targetPlacementTimeline),
      Array.isArray(profile?.skills) && profile.skills.length >= 3,
      Array.isArray(profile?.interests) && profile.interests.length >= 2,
      Boolean(profile?.resumeUrl),
    ];
    const profileCompletion = Math.round(
      (profileSignals.filter(Boolean).length / profileSignals.length) * 100
    );

    const aptitudeValues = profile?.aptitude
      ? Object.values(profile.aptitude)
      : (profile?.aptitudeResponses || []).map((response) => response.answer);
    const aptitudeScore = aptitudeValues.length > 0
      ? Math.round(
          (aptitudeValues.reduce((sum, value) => sum + Number(value), 0) / aptitudeValues.length / 5) * 100
        )
      : 0;

    const overallReadiness = Math.round(
      profileCompletion * 0.3 +
      aptitudeScore * 0.25 +
      milestoneProgress * 0.25 +
      topCareer.skillReadinessScore * 0.2
    );

    const roadmapSkillCounts = new Map<string, { total: number; completed: number }>();
    roadmapMilestones.forEach((milestone) => {
      milestone.skills.forEach((skill) => {
        const current = roadmapSkillCounts.get(skill) || { total: 0, completed: 0 };
        current.total += 1;
        if (completedMilestoneMap[milestone.id]) {
          current.completed += 1;
        }
        roadmapSkillCounts.set(skill, current);
      });
    });

    const skillProgress = Array.from(roadmapSkillCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 4)
      .map(([skill, data]) => ({
        skill,
        current: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        target: 100,
      }));

    return {
      overallReadiness,
      completedMilestones: completedCount,
      totalMilestones,
      skillProgress,
    };
  }, [completedMilestoneMap, profile, topCareer]);

  const weeklyTasks = [
    { id: 'task-1', title: 'Finish SQL basics module', eta: '2 hrs', priority: 'High' },
    { id: 'task-2', title: 'Update resume for Full Stack roles', eta: '45 mins', priority: 'Medium' },
    { id: 'task-3', title: 'Apply to 3 matched internships', eta: '30 mins', priority: 'High' },
    { id: 'task-4', title: 'Mock interview (frontend)', eta: '25 mins', priority: 'Low' },
  ];
  const marketSignals = [
    { skill: 'React', demand: 'Very High', change: '+18%' },
    { skill: 'TypeScript', demand: 'High', change: '+12%' },
    { skill: 'Docker', demand: 'Rising', change: '+9%' },
  ];
  const resumeInsights = {
    score: 76,
    missingKeywords: ['SQL', 'REST APIs', 'Unit Testing'],
    atsRisk: 'Medium',
  };
  const feedStatus = {
    lastSync: 'Today, 9:05 AM',
    newMatches: 7,
    sources: ['LinkedIn', 'Indeed', 'Naukri'],
  };

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        const resp = await fetch(`${base}/api/alerts?userId=${encodeURIComponent('user-1')}`);
        if (!resp.ok) return;
        const data = await resp.json();
        setAlerts(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    };
    void loadAlerts();
  }, [base]);

  useEffect(() => {
    const loadRecommendations = async () => {
      try {
        let normalizedAptitude: Record<string, number> = profile?.aptitude || {};
        if (Object.keys(normalizedAptitude).length === 0) {
          const grouped = (profile?.aptitudeResponses || []).reduce((acc: Record<string, number[]>, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item.answer);
            return acc;
          }, {} as Record<string, number[]>);

          normalizedAptitude = Object.fromEntries(
            Object.entries(grouped).map(([key, values]) => [
              key,
              Number((values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1)).toFixed(2)),
            ])
          );
        }

        const resp = await fetch(`${base}/api/ml/predict-career`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: profile?.name || 'Student',
            year: profile?.year || 1,
            cgpa: profile?.cgpa || 7.0,
            skills: profile?.skills || [],
            interests: profile?.interests || [],
            aptitude: normalizedAptitude,
          }),
        });
        if (!resp.ok) return;

        const data = await resp.json();
        const ranked = Array.isArray(data?.ranked) ? data.ranked : [];
        if (ranked.length === 0) return;

        const order = new globalThis.Map<string, number>();
        const score = new globalThis.Map<string, number>();
        ranked.forEach((item: any, index: number) => {
          const key = String(item.career || '').toLowerCase();
          order.set(key, index);
          score.set(key, Math.round((Number(item.score) || 0) * 100));
        });

        const profileSkills = new Set((profile?.skills || []).map((skill) => skill.toLowerCase()));
        const nextRecommendations = [...mockCareerRecommendations]
          .sort((a, b) => {
            const aIndex = order.get(a.title.toLowerCase()) ?? 999;
            const bIndex = order.get(b.title.toLowerCase()) ?? 999;
            return aIndex - bIndex;
          })
          .map((career) => {
            const matchedSkillCount = career.requiredSkills.filter((skill) =>
              profileSkills.has(skill.toLowerCase())
            ).length;
            const computedSkillReadiness = career.requiredSkills.length > 0
              ? Math.round((matchedSkillCount / career.requiredSkills.length) * 100)
              : career.skillReadinessScore;

            return {
              ...career,
              matchScore: score.get(career.title.toLowerCase()) ?? career.matchScore,
              skillReadinessScore: computedSkillReadiness,
            };
          });

        setDashboardRecommendations(nextRecommendations);
      } catch (_err) {
        // keep local fallback recommendations
      }
    };

    void loadRecommendations();
  }, [base, profile]);

  useEffect(() => {
    const loadJobs = async () => {
      try {
        const roleQuery = selectedCareer?.title || dashboardRecommendations[0]?.title || profile?.interests?.[0] || '';
        const whereQuery = (profile as any)?.location || 'Chennai, India';
        const resp = await fetch(
          `${base}/api/jobs?role=${encodeURIComponent(roleQuery)}&where=${encodeURIComponent(whereQuery)}&live=1`
        );
        if (!resp.ok) return;

        const data = await resp.json();
        setDashboardJobs(Array.isArray(data?.jobs) ? data.jobs : []);
      } catch (_err) {
        setDashboardJobs([]);
      }
    };

    void loadJobs();
  }, [base, dashboardRecommendations, profile, selectedCareer]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-hero p-8"
        >
          <div className="relative z-10">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-3 py-1 text-sm font-medium text-primary-foreground backdrop-blur-sm">
              <Sparkles className="h-4 w-4" />
              Welcome back!
            </div>
            <h1 className="mb-2 font-display text-3xl font-bold text-primary-foreground">
              Hello, {greetingName}! 👋
            </h1>
            <p className="max-w-xl text-primary-foreground/80">
              Your career journey is progressing well. Here's your personalized dashboard
              with recommendations and opportunities.
            </p>
          </div>
          <div className="absolute right-8 top-1/2 hidden -translate-y-1/2 md:block">
            <ScoreRing score={analytics.overallReadiness} size="lg" />
            <p className="mt-2 text-center text-sm font-medium text-primary-foreground">
              Career Readiness
            </p>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          {[
            {
              icon: Target,
              label: 'Top Career Match',
              value: `${topCareer.matchScore}%`,
              color: 'bg-primary',
            },
            {
              icon: Award,
              label: 'Skill Readiness',
              value: `${topCareer.skillReadinessScore}%`,
              color: 'bg-secondary',
            },
            {
              icon: MapIcon,
              label: 'Milestones Done',
              value: `${analytics.completedMilestones}/${analytics.totalMilestones}`,
              color: 'bg-success',
            },
            {
              icon: Briefcase,
              label: 'Job Matches',
              value: dashboardJobs.length.toString(),
              color: 'bg-accent',
            },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl ${stat.color} text-primary-foreground`}>
                <stat.icon className="h-6 w-6" />
              </div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Top Career Recommendation */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">
                Your Top Career Match
              </h2>
              <Link to="/recommendations">
                <Button variant="ghost" size="sm">
                  View All
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="flex items-start gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-primary text-3xl">
                {topCareer.icon}
              </div>
              <div className="flex-1">
                <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
                  {topCareer.title}
                </h3>
                <p className="mb-3 text-sm text-muted-foreground line-clamp-2">
                  {topCareer.description}
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1">
                    <TrendingUp className="h-4 w-4 text-success" />
                    <span className="text-sm font-medium text-success">
                      {topCareer.growthOutlook} Growth
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {topCareer.averageSalary}
                  </span>
                </div>
              </div>
              <ScoreRing score={topCareer.matchScore} size="sm" />
            </div>

            <div className="mt-4">
              <Link to="/recommendations">
                <Button className="w-full">
                  Explore Career Options
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">Real-Time Alerts</h2>
              <Button
                size="sm"
                variant="outline"
                onClick={async () => {
                  try {
                    await fetch(`${base}/api/alerts/generate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: 'user-1' }),
                    });
                    const resp = await fetch(`${base}/api/alerts?userId=${encodeURIComponent('user-1')}`);
                    if (!resp.ok) return;
                    setAlerts(await resp.json());
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                Refresh Alerts
              </Button>
            </div>
            <div className="space-y-3">
              {alerts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No live alerts yet. Run a fresh fetch cycle.</p>
              ) : (
                alerts.slice(0, 4).map((alert) => (
                  <div key={alert.id} className="rounded-lg bg-muted/60 p-3">
                    <p className="text-sm font-medium text-foreground">{alert.title}</p>
                    <p className="text-xs text-muted-foreground">{alert.detail}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      {alert.source && (
                        <span className="rounded-full bg-background px-2 py-0.5">
                          Source: {alert.source}
                        </span>
                      )}
                      {alert.verificationStatus && (
                        <span className="rounded-full bg-background px-2 py-0.5">
                          {alert.verificationStatus === 'verified_live'
                            ? 'Verified live'
                            : alert.verificationStatus === 'live_unverified'
                            ? 'Live, unverified'
                            : 'System alert'}
                        </span>
                      )}
                      {alert.fetchedAt && (
                        <span className="rounded-full bg-background px-2 py-0.5">
                          Fetched: {new Date(alert.fetchedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>

          {/* Skills Progress */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">
                Skill Progress
              </h2>
              <Link to="/analytics">
                <Button variant="ghost" size="sm">
                  View Details
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="space-y-4">
              {analytics.skillProgress.slice(0, 4).map((skill) => (
                <div key={skill.skill}>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">{skill.skill}</span>
                    <span className="text-sm text-muted-foreground">
                      {skill.current}%
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-gradient-primary"
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.current}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Recent Job Opportunities */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card lg:col-span-2"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">
                Latest Job Matches
              </h2>
              <Link to="/jobs">
                <Button variant="ghost" size="sm">
                  View All Jobs
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {(dashboardJobs.length > 0 ? dashboardJobs : mockJobOpportunities).slice(0, 3).map((job) => (
                <div
                  key={job.id}
                  className="rounded-xl border border-border bg-muted/50 p-4 transition-all hover:border-primary hover:shadow-md"
                >
                  <div className="mb-3 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-xl">
                      {job.logo}
                    </div>
                    <div>
                      <h4 className="font-medium text-foreground line-clamp-1">{job.title}</h4>
                      <p className="text-sm text-muted-foreground">{job.company}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                      {job.matchScore}% Match
                    </span>
                    <span className="text-xs text-muted-foreground">{job.postedDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Advanced Tools */}
        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Bot className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-success/10 px-2 py-1 text-xs font-bold text-success">
                AI Coach
              </span>
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
              Career Copilot
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Ask anything about your roadmap, resume, or interviews and get instant, personalized guidance.
            </p>
            <Link to="/coach">
              <Button className="w-full" variant="secondary">
                Start a Coaching Session
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-secondary/10 text-secondary">
                <FileSearch className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                ATS Scan
              </span>
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
              Resume Analyzer
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Score: <span className="font-semibold text-foreground">{resumeInsights.score}/100</span> • ATS Risk: {resumeInsights.atsRisk}
            </p>
            <div className="mb-4 flex flex-wrap gap-2">
              {resumeInsights.missingKeywords.map((keyword) => (
                <span
                  key={keyword}
                  className="rounded-full bg-warning/10 px-3 py-1 text-xs font-medium text-warning"
                >
                  Add {keyword}
                </span>
              ))}
            </div>
            <Link to="/profile">
              <Button className="w-full" variant="outline">
                Run Full Resume Scan
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Mail className="h-6 w-6" />
              </div>
              <span className="rounded-full bg-accent/10 px-2 py-1 text-xs font-bold text-accent">
                Job Alerts
              </span>
            </div>
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
              Daily Digest
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              {feedStatus.newMatches} new matches since last sync. Sources: {feedStatus.sources.join(', ')}.
            </p>
            <div className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
              <Activity className="h-4 w-4 text-success" />
              Live sync: {feedStatus.lastSync}
            </div>
            <Link to="/jobs">
              <Button className="w-full" variant="accent">
                Configure Email Alerts
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        {/* Weekly Focus */}
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">
                Weekly Action Plan
              </h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                <CalendarCheck className="h-4 w-4" />
                Auto-prioritized
              </div>
            </div>
            <div className="space-y-3">
              {weeklyTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/40 px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-semibold text-foreground">{task.title}</p>
                    <p className="text-xs text-muted-foreground">ETA: {task.eta}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                    task.priority === 'High'
                      ? 'bg-destructive/10 text-destructive'
                      : task.priority === 'Medium'
                      ? 'bg-warning/10 text-warning'
                      : 'bg-success/10 text-success'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.65 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-xl font-bold text-foreground">
                Market Pulse
              </h2>
              <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <BarChart3 className="h-4 w-4" />
                Hiring Trends
              </div>
            </div>
            <div className="space-y-4">
              {marketSignals.map((signal) => (
                <div key={signal.skill} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{signal.skill}</p>
                    <p className="text-xs text-muted-foreground">Demand: {signal.demand}</p>
                  </div>
                  <span className="rounded-full bg-success/10 px-3 py-1 text-xs font-bold text-success">
                    {signal.change}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
              <ShieldCheck className="h-4 w-4 text-primary" />
              Signals are anonymized and derived from verified job boards.
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
