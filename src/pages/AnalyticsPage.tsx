import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Target,
  Award,
  Calendar,
  Database,
  Activity,
  RefreshCcw,
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ScoreRing } from '@/components/ui/score-ring';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { generateRoadmap, mockCareerRecommendations } from '@/lib/mockData';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

export default function AnalyticsPage() {
  const { selectedCareer, completedMilestones, profile } = useAppStore();
  const career = selectedCareer || mockCareerRecommendations[0];
  const allMilestones = generateRoadmap(career.title);
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const [quality, setQuality] = useState<any | null>(null);
  const [kpis, setKpis] = useState<any | null>(null);
  const [health, setHealth] = useState<any | null>(null);
  const [readiness, setReadiness] = useState<any | null>(null);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  const analytics = useMemo(() => {
    const total = allMilestones.length;
    const completed = allMilestones.filter((m) => completedMilestones[m.id]).length;
    const overallReadiness = total > 0 ? Math.round((completed / total) * 100) : 0;

    const skillCounts = new Map<string, { total: number; completed: number }>();
    allMilestones.forEach((m) => {
      m.skills.forEach((s) => {
        const item = skillCounts.get(s) || { total: 0, completed: 0 };
        item.total += 1;
        if (completedMilestones[m.id]) item.completed += 1;
        skillCounts.set(s, item);
      });
    });

    const rankedSkills = Array.from(skillCounts.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .slice(0, 6)
      .map(([skill, data]) => ({
        skill,
        current: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
        target: 100,
      }));

    const completions = Object.values(completedMilestones).map((d) => new Date(d));
    const now = new Date();
    const weeks: { week: string; progress: number }[] = [];
    const weeklyCompleted: number[] = [];

    for (let i = 5; i >= 0; i -= 1) {
      const end = new Date(now);
      end.setDate(now.getDate() - i * 7);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      const count = completions.filter((d) => d >= start && d <= end).length;
      weeklyCompleted.push(count);
      const prevTotal = weeks.length > 0 ? weeks[weeks.length - 1].progress : 0;
      weeks.push({ week: `Week ${6 - i}`, progress: Math.min(100, prevTotal + count * 10) });
    }

    const weekOverWeek = weeklyCompleted.length >= 2
      ? weeklyCompleted[weeklyCompleted.length - 1] - weeklyCompleted[weeklyCompleted.length - 2]
      : 0;

    const activeDays = new Set(completions.map((d) => d.toDateString())).size;

    return {
      overallReadiness,
      completedMilestones: completed,
      totalMilestones: total,
      skillProgress: rankedSkills,
      weeklyProgress: weeks,
      weekOverWeek,
      activeDays,
    };
  }, [allMilestones, completedMilestones]);

  const loadDataEngineering = async () => {
    try {
      const [q, k, h] = await Promise.all([
        fetch(`${base}/api/data/quality`).then((r) => r.json()),
        fetch(`${base}/api/data/kpis`).then((r) => r.json()),
        fetch(`${base}/api/data/pipeline/health`).then((r) => r.json()),
      ]);
      setQuality(q);
      setKpis(k);
      setHealth(h);
    } catch (_err) {
      // silent fallback for local dev when backend endpoint is unavailable
    }
  };

  useEffect(() => {
    void loadDataEngineering();
  }, [base]);

  useEffect(() => {
    const loadReadiness = async () => {
      try {
        const resp = await fetch(`${base}/api/readiness-index`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            completedMilestones: analytics.completedMilestones,
            totalMilestones: analytics.totalMilestones,
            resumeScore: 76,
            interviewScore: 68,
            applications7d: kpis?.totals?.applied || 0,
            skillReadiness: career.skillReadinessScore,
          }),
        });
        if (!resp.ok) return;
        setReadiness(await resp.json());
      } catch (_err) {
        // local fallback
      }
    };
    void loadReadiness();
  }, [
    analytics.completedMilestones,
    analytics.totalMilestones,
    base,
    career.skillReadinessScore,
    kpis?.totals?.applied,
  ]);

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
            <BarChart3 className="h-4 w-4" />
            Progress Analytics
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            Your Progress Dashboard
          </h1>
          <p className="text-muted-foreground">
            Track your career readiness and skill development over time
          </p>
        </motion.div>

        {/* Key Metrics */}
        <div className="grid gap-6 md:grid-cols-4">
          {[
            {
              icon: Target,
              label: 'Career Readiness',
              value: analytics.overallReadiness,
              suffix: '%',
              color: 'bg-primary',
            },
            {
              icon: Award,
              label: 'Milestones Complete',
              value: analytics.completedMilestones,
              suffix: `/${analytics.totalMilestones}`,
              color: 'bg-success',
            },
            {
              icon: TrendingUp,
              label: 'Week-over-Week',
              value: analytics.weekOverWeek >= 0 ? `+${analytics.weekOverWeek}` : `${analytics.weekOverWeek}`,
              suffix: '%',
              color: 'bg-secondary',
            },
            {
              icon: Calendar,
              label: 'Days Active',
              value: analytics.activeDays,
              suffix: '',
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
              <p className="font-display text-3xl font-bold text-foreground">
                {stat.value}
                <span className="text-lg text-muted-foreground">{stat.suffix}</span>
              </p>
            </motion.div>
          ))}
        </div>

        {readiness && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Placement Readiness Index</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {readiness.score}
                  <span className="text-lg text-muted-foreground">/100</span>
                </p>
                <p className="text-sm font-medium text-primary">{readiness.band}</p>
              </div>
              <ScoreRing score={readiness.score} size="sm" label="PRI" />
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-display text-lg font-semibold text-foreground">
              Data Engineering Health
            </h3>
            <Button
              size="sm"
              variant="outline"
              disabled={pipelineLoading}
              onClick={async () => {
                setPipelineLoading(true);
                try {
                  await fetch(`${base}/api/data/pipeline/run`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ role: career.title, where: 'Chennai, India' }),
                  });
                  await loadDataEngineering();
                } finally {
                  setPipelineLoading(false);
                }
              }}
            >
              <RefreshCcw className="mr-2 h-4 w-4" />
              {pipelineLoading ? 'Running...' : 'Run Pipeline'}
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Pipeline Status</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Activity className="h-4 w-4" />
                {health?.status || 'unknown'}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Bronze / Silver / Gold</p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {quality?.counts?.bronze ?? 0} / {quality?.counts?.silver ?? 0} / {quality?.counts?.gold ?? 0}
              </p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Dedup Ratio</p>
              <p className="mt-1 text-sm font-semibold text-foreground">{quality?.dedupRatio ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-4">
              <p className="text-xs text-muted-foreground">Freshness (mins)</p>
              <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-foreground">
                <Database className="h-4 w-4" />
                {quality?.freshnessMinutes ?? 'n/a'}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-4">
            <div className="rounded-lg border border-border/60 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Job Applies (7d)</p>
              <p className="font-semibold text-foreground">{kpis?.totals?.applied ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Messages (7d)</p>
              <p className="font-semibold text-foreground">{kpis?.totals?.messages ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Posts (7d)</p>
              <p className="font-semibold text-foreground">{kpis?.totals?.posts ?? 0}</p>
            </div>
            <div className="rounded-lg border border-border/60 p-3 text-sm">
              <p className="text-xs text-muted-foreground">Connections (7d)</p>
              <p className="font-semibold text-foreground">{kpis?.totals?.connections ?? 0}</p>
            </div>
          </div>
        </motion.div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Weekly Progress Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
              Weekly Progress
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analytics.weeklyProgress}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    dataKey="week" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="progress"
                    stroke="hsl(var(--primary))"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Skill Progress Chart */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
              Skill Development
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analytics.skillProgress} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis 
                    type="number" 
                    domain={[0, 100]}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis 
                    type="category" 
                    dataKey="skill"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Bar 
                    dataKey="current" 
                    fill="hsl(var(--primary))" 
                    radius={[0, 4, 4, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Detailed Skills */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-6 font-display text-lg font-semibold text-foreground">
            Skill Progress Details
          </h3>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {analytics.skillProgress.map((skill, index) => (
                      <motion.div
                key={skill.skill}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + index * 0.1 }}
                className="flex items-center gap-4 rounded-xl border border-border bg-muted/30 p-4"
              >
                <ScoreRing score={skill.current} size="sm" />
                <div className="flex-1">
                  <p className="font-medium text-foreground">{skill.skill}</p>
                  <p className="text-sm text-muted-foreground">
                    Target: {skill.target}%
                  </p>
                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-primary"
                      style={{ width: `${(skill.current / skill.target) * 100}%` }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Career Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-xl border border-border bg-gradient-hero p-8 text-primary-foreground"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="mb-2 font-display text-2xl font-bold">
                On Track for {career.title}
              </h3>
              <p className="text-primary-foreground/80">
                You're making excellent progress! Keep up the momentum to reach your career goals.
              </p>
            </div>
            <div className="hidden md:block">
              <ScoreRing score={analytics.overallReadiness} size="lg" />
            </div>
          </div>
        </motion.div>
      </div>
    </DashboardLayout>
  );
}
