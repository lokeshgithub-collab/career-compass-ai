import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Briefcase, CheckCircle2, Send } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { PlacementOutcome } from '@/types/career';

const outcomeStatuses = ['Applied', 'Shortlisted', 'Interviewing', 'Rejected', 'Offered', 'Accepted'] as const;

export default function OutcomesPage() {
  const { profile } = useAppStore();
  const { toast } = useToast();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const userId = profile?.id || 'user-1';
  const [history, setHistory] = useState<PlacementOutcome[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    company: '',
    role: '',
    status: 'Applied',
    roundsCleared: '0',
    packageLpa: '',
    notes: '',
  });

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`${base}/api/student/outcomes?userId=${encodeURIComponent(userId)}`);
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
      const resp = await fetch(`${base}/api/student/outcomes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          company: formData.company,
          role: formData.role,
          status: formData.status,
          roundsCleared: Number(formData.roundsCleared || 0),
          packageLpa: formData.packageLpa ? Number(formData.packageLpa) : undefined,
          notes: formData.notes,
        }),
      });
      if (!resp.ok) throw new Error('Unable to save outcome');
      const saved = await resp.json();
      setHistory((prev) => [saved, ...prev]);
      setFormData({
        company: '',
        role: '',
        status: 'Applied',
        roundsCleared: '0',
        packageLpa: '',
        notes: '',
      });
      toast({ title: 'Outcome saved', description: 'This result will now improve placement-based modeling.' });
    } catch (_err) {
      toast({ title: 'Save failed', description: 'Could not save your outcome.', variant: 'destructive' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1 text-sm font-medium text-success">
            <Trophy className="h-4 w-4" />
            Placement Signal Tracking
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">Outcomes Tracker</h1>
          <p className="text-muted-foreground">Log real application and interview outcomes so readiness predictions can be calibrated against actual results.</p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Log an Outcome</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Input id="role" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <select
                  id="status"
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {outcomeStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="roundsCleared">Rounds Cleared</Label>
                <Input id="roundsCleared" type="number" min="0" value={formData.roundsCleared} onChange={(e) => setFormData({ ...formData, roundsCleared: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="packageLpa">Package (LPA, optional)</Label>
                <Input id="packageLpa" type="number" min="0" step="0.1" value={formData.packageLpa} onChange={(e) => setFormData({ ...formData, packageLpa: e.target.value })} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Round feedback, strengths, weak areas, interviewer comments..." value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} />
              </div>
            </div>
            <Button className="mt-5 w-full" onClick={submit} disabled={isSaving}>
              <Send className="mr-2 h-4 w-4" />
              {isSaving ? 'Saving...' : 'Save Outcome'}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h2 className="mb-4 font-display text-xl font-semibold text-foreground">Recent Outcomes</h2>
            <div className="space-y-3">
              {history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No outcomes logged yet. Even rejections are useful data for improving predictions.</p>
              ) : history.slice(0, 8).map((entry) => (
                <div key={entry.id} className="rounded-lg border border-border/60 bg-muted/40 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-foreground">{entry.role}</p>
                      <p className="text-sm text-muted-foreground">{entry.company}</p>
                    </div>
                    <span className="rounded-full bg-background px-2 py-1 text-xs font-medium text-foreground">{entry.status}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="rounded-full bg-background px-2 py-1">{entry.roundsCleared} rounds</span>
                    {entry.packageLpa ? <span className="rounded-full bg-background px-2 py-1">{entry.packageLpa} LPA</span> : null}
                    <span className="rounded-full bg-background px-2 py-1">{new Date(entry.createdAt).toLocaleDateString()}</span>
                  </div>
                  {entry.notes ? <p className="mt-2 text-sm text-muted-foreground">{entry.notes}</p> : null}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-lg bg-success/5 p-4 text-sm text-muted-foreground">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <CheckCircle2 className="h-4 w-4 text-success" />
                Why outcome history matters
              </div>
              Real interview and offer outcomes are the strongest signals for calibrating simulated readiness against actual placement performance.
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
