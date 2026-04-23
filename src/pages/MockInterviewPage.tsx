import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, PlayCircle, Send, CheckCircle2, AlertCircle, Globe } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/useAppStore';

type CompanyItem = {
  company: string;
  slug: string;
  domains: string[];
};

export default function MockInterviewPage() {
  const { profile } = useAppStore();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const [companies, setCompanies] = useState<CompanyItem[]>([]);
  const [company, setCompany] = useState('zoho');
  const [companyFilter, setCompanyFilter] = useState('');
  const [customCompany, setCustomCompany] = useState('');
  const [domain, setDomain] = useState('qa testing');
  const [pattern, setPattern] = useState<any | null>(null);
  const [session, setSession] = useState<any | null>(null);
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [email, setEmail] = useState(profile?.email || '');

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`${base}/api/interview/companies`);
        if (!resp.ok) return;
        const data = await resp.json();
        setCompanies(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    };
    void load();
  }, [base]);

  useEffect(() => {
    const selected = companies.find((c) => c.slug === company);
    if (selected && !selected.domains.includes(domain)) {
      setDomain(selected.domains[0] || 'qa testing');
    }
  }, [companies, company, domain]);

  const filteredCompanies = useMemo(() => {
    if (!companyFilter.trim()) return companies;
    return companies.filter((c) => c.company.toLowerCase().includes(companyFilter.toLowerCase()));
  }, [companies, companyFilter]);

  const activeCompanyValue = customCompany.trim() || company;
  const activeCompanyLabel = customCompany.trim()
    ? customCompany.trim()
    : companies.find((item) => item.slug === company)?.company || company;

  const selectedDomains = useMemo(
    () => companies.find((c) => c.slug === company)?.domains || [],
    [companies, company]
  );

  const fetchPattern = async () => {
      try {
        setLoading(true);
        const resp = await fetch(
        `${base}/api/interview/pattern?company=${encodeURIComponent(activeCompanyValue)}&domain=${encodeURIComponent(domain)}`
      );
      if (!resp.ok) return;
      const data = await resp.json();
      setPattern(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startInterview = async () => {
    const newTab = window.open('', '_blank');
    try {
      if (!newTab) {
        alert('Please allow popups for this site to start the mock interview in a new tab.');
        return;
      }
      setLoading(true);
      const resp = await fetch(`${base}/api/interview/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company,
          customCompany: customCompany.trim() || undefined,
          domain,
          userId: profile?.id || 'user-1',
          candidateName: profile?.name || 'Student',
          email: email || profile?.email || '',
        }),
      });
      if (!resp.ok) {
        newTab.close();
        return;
      }
      const data = await resp.json();
      setSession(data);
      setResult(null);
      const testUrl = new URL('/mock-interview/test', window.location.origin);
      testUrl.searchParams.set('company', activeCompanyValue);
      testUrl.searchParams.set('domain', domain);
      testUrl.searchParams.set('email', email || profile?.email || '');
      testUrl.searchParams.set('sessionId', data.sessionId);
      newTab.location.href = testUrl.toString();
    } catch (err) {
      console.error(err);
      newTab.close();
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!session?.sessionId || !answer.trim()) return;
    try {
      setLoading(true);
      const resp = await fetch(`${base}/api/interview/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: session.sessionId,
          answer,
        }),
      });
      if (!resp.ok) return;
      const data = await resp.json();
      setAnswer('');
      if (data.complete) {
        setResult(data);
        setSession(null);
      } else {
        setSession(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">
            <PlayCircle className="h-4 w-4" />
            Company Interview Simulator
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground">Mock Interview Lab</h1>
          <p className="text-muted-foreground">
            Select company + domain, fetch interview pattern from web, and attend round-wise mock interview.
          </p>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="font-display text-lg font-semibold text-foreground">Interview Setup</h3>
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <label className="text-sm text-muted-foreground">Search Company</label>
                <input
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                  placeholder="Filter company list"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Company</label>
                <select
                  className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={company}
                  onChange={(e) => {
                    setCompany(e.target.value);
                    setCustomCompany('');
                  }}
                >
                  {filteredCompanies.map((c) => (
                    <option key={c.slug} value={c.slug}>
                      {c.company}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Custom Company</label>
              <Input
                value={customCompany}
                onChange={(e) => setCustomCompany(e.target.value)}
                placeholder="Type any company name if it is not in the list"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                If you enter a custom company, the interview lab will use that instead of the dropdown selection.
              </p>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Domain</label>
              <select
                className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
              >
                {selectedDomains.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm text-muted-foreground">Result Email</label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" disabled={loading} onClick={fetchPattern}>
                <Globe className="mr-2 h-4 w-4" />
                Load Pattern
              </Button>
              <Button disabled={loading} onClick={startInterview}>
                <Building2 className="mr-2 h-4 w-4" />
                Start Mock Interview
              </Button>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h3 className="mb-3 font-display text-lg font-semibold text-foreground">Pattern Overview</h3>
            {!pattern ? (
              <p className="text-sm text-muted-foreground">Load pattern to see rounds and sources.</p>
            ) : (
              <div className="space-y-3 text-sm">
                <p className="text-muted-foreground">{pattern.summary}</p>
                <div className="rounded-md bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                  Active company: <span className="font-semibold text-foreground">{activeCompanyLabel}</span>
                </div>
                {pattern.inferredTopics?.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {pattern.inferredTopics.map((topic: string) => (
                      <span key={topic} className="rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-2">
                  {pattern.rounds?.map((round: any) => (
                    <div key={round.round} className="rounded-md bg-muted/60 px-3 py-2">
                      <p className="font-medium text-foreground">{round.round}</p>
                      <p className="text-xs text-muted-foreground">{round.questionCount} questions</p>
                    </div>
                  ))}
                </div>
                {pattern.sources?.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Pattern Sources</p>
                    <div className="space-y-1">
                      {pattern.sources.slice(0, 4).map((source: string) => (
                        <a key={source} href={source} target="_blank" rel="noreferrer" className="block truncate text-xs text-primary hover:underline">
                          {source}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {session && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Current Round</p>
            <h3 className="mt-1 font-display text-xl font-semibold text-foreground">{session.round}</h3>
            <p className="mt-3 rounded-md bg-muted/60 p-3 text-sm text-foreground">{session.question}</p>
            <Textarea
              className="mt-3 min-h-[120px]"
              placeholder="Type your answer..."
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
            />
            <Button className="mt-3" disabled={loading || !answer.trim()} onClick={submitAnswer}>
              <Send className="mr-2 h-4 w-4" />
              Submit Answer
            </Button>
            {session.latestFeedback && <p className="mt-2 text-sm text-muted-foreground">Feedback: {session.latestFeedback}</p>}
          </div>
        )}

        {result && (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="flex items-center gap-2">
              {result.selected ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <h3 className="font-display text-xl font-semibold text-foreground">
                Result: {result.decision} ({result.overallScore}/100)
              </h3>
            </div>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {result.roundScores?.map((r: any) => (
                <div key={r.round} className="rounded-md bg-muted/60 px-3 py-2 text-sm">
                  {r.round}: {r.score} ({r.cleared ? 'Cleared' : 'Not Cleared'})
                </div>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Interview result has been emailed if SMTP is configured and email was provided.
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
