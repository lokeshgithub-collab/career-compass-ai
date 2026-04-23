import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ClipboardList, CalendarDays, Brain, Send } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { WeeklyCheckIn } from '@/types/career';
import { getApiBaseUrl } from '@/lib/api';

export default function WeeklyCheckInPage() {
  const { profile } = useAppStore();
  const { toast } = useToast();
  const base = getApiBaseUrl();
  const userId = profile?.id || 'user-1';
  const [history, setHistory] = useState<WeeklyCheckIn[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    weekLabel: '',
    studyHours: '',
    topicsCompleted: '',
    projectWorkSummary: '',
    applicationsSubmitted: '',
    interviewsAttended: '',
    confidenceLevel: '3',
    blockers: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`${base}/api/student/checkins?userId=${encodeURIComponent(userId)}`);
        if (!resp.ok) return;
        setHistory(await resp.json());
      } catch (_err) {
        // silent fallback
      }
    };
    void load();
  }, [base, userId]);

  const submit = async () => {
    setIsSaving(true);
    try {
      const resp = await fetch(`${base}/api/student/checkins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          weekLabel: formData.weekLabel,
          studyHours: Number(formData.studyHours || 0),
          topicsCompleted: formData.topicsCompleted.split(',').map((item) => item.trim()).filter(Boolean),
          projectWorkSummary: formData.projectWorkSummary,
          applicationsSubmitted: Number(formData.applicationsSubmitted || 0),
          interviewsAttended: Number(formData.interviewsAttended || 0),
          confidenceLevel: Number(formData.confidenceLevel || 3),
          blockers: formData.blockers,
        }),
      });
      if (!resp.ok) throw new Error('Unable to save check-in');
      const saved = await resp.json();
      setHistory((prev) => [saved, ...prev]);
      setFormData({
        weekLabel: '',
        studyHours: '',
        topicsCompleted: '',
        projectWorkSummary: '',
        applicationsSubmitted: '',
        interviewsAttended: '',
        confidenceLevel: '3',
        blockers: '',
      });
      toast({ title: 'Weekly check-in saved', description: 'Your progress was added to the simulator history.' });
    } catch (_err) {
      toast({ title: 'Save failed', description: 'Could not save your weekly check-in.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <ClipboardList className="h-4 w-4" />
            Weekly Progress Logging
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Weekly Check-In</h1>
          <p className="text-muted-foreground">Track learning momentum, applications, and confidence so the simulator can learn from real progress.</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Log This Week</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="weekLabel">Week Label</Label>
                <Input id="weekLabel" placeholder="Week of Apr 21" value={formData.weekLabel} onChange={(e) => setFormData({ ...formData, weekLabel: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="studyHours">Study Hours</Label>
                <Input id="studyHours" type="number" min="0" value={formData.studyHours} onChange={(e) => setFormData({ ...formData, studyHours: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicationsSubmitted">Applications Submitted</Label>
                <Input id="applicationsSubmitted" type="number" min="0" value={formData.applicationsSubmitted} onChange={(e) => setFormData({ ...formData, applicationsSubmitted: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interviewsAttended">Interviews Attended</Label>
                <Input id="interviewsAttended" type="number" min="0" value={formData.interviewsAttended} onChange={(e) => setFormData({ ...formData, interviewsAttended: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="topicsCompleted">Topics Completed</Label>
                <Input id="topicsCompleted" placeholder="React hooks, SQL joins, Docker basics" value={formData.topicsCompleted} onChange={(e) => setFormData({ ...formData, topicsCompleted: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="projectWorkSummary">Project Work</Label>
                <Textarea id="projectWorkSummary" placeholder="Built a mini REST API and deployed it locally..." value={formData.projectWorkSummary} onChange={(e) => setFormData({ ...formData, projectWorkSummary: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confidenceLevel">Confidence Level (1-5)</Label>
                <Input id="confidenceLevel" type="number" min="1" max="5" value={formData.confidenceLevel} onChange={(e) => setFormData({ ...formData, confidenceLevel: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="blockers">Blockers</Label>
                <Textarea id="blockers" placeholder="Time management, DB design, interview nerves..." value={formData.blockers} onChange={(e) => setFormData({ ...formData, blockers: e.target.value })} />
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={submit} disabled={isSaving}>
              <Send className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Weekly Check-In'}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Recent History</h2>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No check-ins yet. Your first one will start building progress history for better predictions.</p>
              ) : history.slice(0, 6).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border/60 bg-muted/40 p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="font-semibold text-foreground">{entry.weekLabel || 'Weekly Check-In'}</p>
                    <span className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-background px-2 py-1">{entry.studyHours} hrs</span>
                    <span className="rounded-full bg-background px-2 py-1">{entry.applicationsSubmitted} applications</span>
                    <span className="rounded-full bg-background px-2 py-1">{entry.interviewsAttended} interviews</span>
                    <span className="rounded-full bg-background px-2 py-1">Confidence {entry.confidenceLevel}/5</span>
                  </div>
                  {entry.topicsCompleted?.length > 0 && (
                    <p className="mt-2 text-sm text-muted-foreground">Topics: {entry.topicsCompleted.join(', ')}</p>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-primary/5 p-4 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Brain className="h-4 w-4 text-primary" />
                Why this matters
              </div>
              Consistent weekly logs give the simulator a much better signal than static profile data alone.
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
