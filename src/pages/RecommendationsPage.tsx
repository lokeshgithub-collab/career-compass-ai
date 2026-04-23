import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  TrendingUp, 
  Check, 
  AlertCircle,
  ArrowRight,
  Sparkles,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScoreRing } from '@/components/ui/score-ring';
import { SkillBadge } from '@/components/ui/skill-badge';
import { useAppStore } from '@/store/useAppStore';
import { mockCareerRecommendations } from '@/lib/mockData';
import { CareerRecommendation } from '@/types/career';

export default function RecommendationsPage() {
  const navigate = useNavigate();
  const { setSelectedCareer, profile } = useAppStore();
  const [recommendations, setRecommendations] = useState<CareerRecommendation[]>(mockCareerRecommendations);
  const [simTargetRole, setSimTargetRole] = useState('Full Stack Developer');
  const [simWeeks, setSimWeeks] = useState(8);
  const [simResult, setSimResult] = useState<any | null>(null);
  const [expandedCareer, setExpandedCareer] = useState<string | null>(
    mockCareerRecommendations[0].id
  );

  useEffect(() => {
    const loadMlRanking = async () => {
      try {
        const base = import.meta.env.VITE_API_BASE_URL || '';
        let normalizedAptitude: Record<string, number> = profile?.aptitude || {};
        if (Object.keys(normalizedAptitude).length === 0) {
          const grouped = (profile?.aptitudeResponses || []).reduce((acc: Record<string, number[]>, item) => {
            if (!acc[item.category]) acc[item.category] = [];
            acc[item.category].push(item.answer);
            return acc;
          }, {} as Record<string, number[]>);
          normalizedAptitude = Object.fromEntries(
            Object.entries(grouped).map(([key, vals]) => [
              key,
              Number((vals.reduce((sum, v) => sum + v, 0) / Math.max(vals.length, 1)).toFixed(2)),
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
            aptitude: normalizedAptitude || {},
          }),
        });
        if (!resp.ok) return;
        const data = await resp.json();
        const ranked = Array.isArray(data?.ranked) ? data.ranked : [];
        if (ranked.length === 0) return;

        const order = new Map<string, number>();
        const score = new Map<string, number>();
        ranked.forEach((r: any, idx: number) => {
          order.set(String(r.career || '').toLowerCase(), idx);
          score.set(String(r.career || '').toLowerCase(), Math.round((Number(r.score) || 0) * 100));
        });

        const next = [...mockCareerRecommendations]
          .sort((a, b) => {
            const ai = order.get(a.title.toLowerCase()) ?? 999;
            const bi = order.get(b.title.toLowerCase()) ?? 999;
            return ai - bi;
          })
          .map((c) => ({
            ...c,
            matchScore: score.get(c.title.toLowerCase()) ?? c.matchScore,
          }));

        setRecommendations(next);
        setExpandedCareer(next[0]?.id || null);
      } catch (_err) {
        // fall back to local ranking
      }
    };
    void loadMlRanking();
  }, [profile]);

  const handleSelectCareer = (career: CareerRecommendation) => {
    setSelectedCareer(career);
    navigate('/roadmap');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <Sparkles className="h-4 w-4" />
            AI-Powered Analysis
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            Your Career Recommendations
          </h1>
          <p className="text-muted-foreground">
            Based on your profile, skills, and aptitude assessment, here are your top career matches
          </p>
        </motion.div>

        {/* AI Explanation */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-primary/20 bg-primary/5 p-6"
        >
          <h3 className="mb-2 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Target className="h-5 w-5 text-primary" />
            How We Calculate Your Matches
          </h3>
          <p className="text-sm text-muted-foreground">
            Our AI analyzes your profile using a <strong>multi-factor matching algorithm</strong> that considers:
            skill alignment (40%), aptitude scores (25%), interest correlation (20%), and academic background (15%).
            Each career is scored transparently so you understand exactly why it's recommended.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-3 font-display text-lg font-semibold text-foreground">
            Skill-Gap Simulator
          </h3>
          <p className="mb-4 text-sm text-muted-foreground">
            Simulate readiness growth by focusing on the right skills for a limited timeline.
          </p>
          <div className="grid gap-3 md:grid-cols-3">
            <Input value={simTargetRole} onChange={(e) => setSimTargetRole(e.target.value)} />
            <Input
              type="number"
              min="2"
              max="24"
              value={simWeeks}
              onChange={(e) => setSimWeeks(Number(e.target.value || 8))}
            />
            <Button
              onClick={async () => {
                try {
                  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
                  const resp = await fetch(`${base}/api/skills/simulate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      targetRole: simTargetRole,
                      weeks: simWeeks,
                      profile,
                    }),
                  });
                  if (!resp.ok) return;
                  const data = await resp.json();
                  setSimResult(data);
                } catch (err) {
                  console.error(err);
                }
              }}
            >
              Run Simulation
            </Button>
          </div>
          {simResult && (
            <div className="mt-4 rounded-lg bg-muted/60 p-4 text-sm">
              <p className="font-semibold text-foreground">
                Readiness: {simResult.baselineReadiness}% {'->'} {simResult.projectedReadiness}% in {simResult.weeks} weeks
              </p>
              <p className="mt-1 text-muted-foreground">
                Missing: {(simResult.missingSkills || []).slice(0, 6).join(', ') || 'No major gaps'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Mode: {simResult.mode === 'ml' ? 'ML model' : 'Fallback estimate'}
                {typeof simResult.confidence === 'number' ? ` • Confidence: ${Math.round(simResult.confidence * 100)}%` : ''}
              </p>
              {simResult.explanation && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on skill coverage {simResult.explanation.skillCoverage}%,
                  role aptitude {simResult.explanation.roleAptitude}/5,
                  and {simResult.explanation.studyHoursPerWeek} study hrs/week.
                </p>
              )}
              {simResult.context && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Recent signals: {simResult.context.recentApplications} applications,
                  {` ${simResult.context.recentInterviews}`} interviews,
                  {` ${Math.round((simResult.context.checkInConsistency || 0) * 100)}%`} check-in consistency.
                </p>
              )}
            </div>
          )}
        </motion.div>

        {/* Career Cards */}
        <div className="space-y-6">
          {recommendations.map((career, index) => (
            <motion.div
              key={career.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + index * 0.1 }}
              className={`rounded-2xl border bg-card shadow-card transition-all ${
                index === 0 ? 'border-primary' : 'border-border'
              }`}
            >
              {/* Main Card Header */}
              <div className="p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-gradient-primary text-3xl">
                    {career.icon}
                  </div>
                  
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      {index === 0 && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          #1 MATCH
                        </span>
                      )}
                      {index === 1 && (
                        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-bold text-secondary-foreground">
                          #2 MATCH
                        </span>
                      )}
                      {index === 2 && (
                        <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-bold text-accent-foreground">
                          #3 MATCH
                        </span>
                      )}
                    </div>
                    <h2 className="mb-1 font-display text-xl font-bold text-foreground">
                      {career.title}
                    </h2>
                    <p className="mb-3 text-muted-foreground">{career.description}</p>
                    
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-success" />
                        <span className="text-sm font-medium text-success">
                          {career.growthOutlook} Growth
                        </span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        Avg. Salary: {career.averageSalary}
                      </span>
                    </div>
                  </div>

                  <div className="hidden items-center gap-6 md:flex">
                    <ScoreRing score={career.matchScore} size="sm" label="Match" />
                    <ScoreRing score={career.skillReadinessScore} size="sm" label="Ready" />
                  </div>
                </div>

                {/* Expand/Collapse Button */}
                <button
                  onClick={() => setExpandedCareer(
                    expandedCareer === career.id ? null : career.id
                  )}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg border border-border py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
                >
                  {expandedCareer === career.id ? (
                    <>
                      Hide Details
                      <ChevronUp className="h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show AI Analysis
                      <ChevronDown className="h-4 w-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Expanded Details */}
              {expandedCareer === career.id && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="border-t border-border bg-muted/30 p-6"
                >
                  {/* Why This Career */}
                  <div className="mb-6">
                    <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                      <Sparkles className="h-5 w-5 text-primary" />
                      Why This Career Fits You
                    </h3>
                    <ul className="space-y-2">
                      {career.reasoning.map((reason, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                          <span className="text-sm text-foreground">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Skills Analysis */}
                  <div className="grid gap-6 md:grid-cols-2">
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-medium text-foreground">
                        <Check className="h-4 w-4 text-success" />
                        Skills You Have ({career.matchedSkills.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {career.matchedSkills.map((skill) => (
                          <SkillBadge key={skill} skill={skill} variant="matched" />
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="mb-3 flex items-center gap-2 font-medium text-foreground">
                        <AlertCircle className="h-4 w-4 text-accent" />
                        Skills to Develop ({career.gapSkills.length})
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {career.gapSkills.map((skill) => (
                          <SkillBadge key={skill} skill={skill} variant="gap" />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="mt-6">
                    <Button
                      size="lg"
                      className="w-full md:w-auto"
                      onClick={() => handleSelectCareer(career)}
                    >
                      Choose This Career Path
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
