import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Briefcase, 
  MapPin, 
  Clock, 
  ExternalLink,
  Search,
  Filter,
  Building2
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SkillBadge } from '@/components/ui/skill-badge';
import { useAppStore } from '@/store/useAppStore';
import { getApiBaseUrl } from '@/lib/api';
// Jobs are now fetched from backend

export default function JobsPage() {
  const { selectedCareer, profile: localProfile } = useAppStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [jobs, setJobs] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<string>('unknown');

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const base = getApiBaseUrl();
        
        // Fetch user profile
        const profileResp = await fetch(`${base}/api/user/profile`);
        if (!profileResp.ok) throw new Error('Failed to fetch profile');
        const profileData = await profileResp.json();
        setProfile(profileData);

        const roleQuery = selectedCareer?.title || localProfile?.interests?.[0] || profileData?.targetRoles?.[0] || '';
        const whereQuery = (localProfile as any)?.location || 'Chennai, India';

        // Fetch jobs
        const jobsResp = await fetch(
          `${base}/api/jobs?role=${encodeURIComponent(roleQuery)}&where=${encodeURIComponent(whereQuery)}&live=1`
        );
        const jobsData = await jobsResp.json();
        if (!jobsResp.ok) {
          const detail = jobsData?.details ? ` - ${jobsData.details}` : '';
          throw new Error(`HTTP ${jobsResp.status}: Failed to fetch jobs${detail}`);
        }
        setJobs(jobsData.jobs || []);
        setSource(jobsData.source || 'unknown');
      } catch (err: any) {
        console.error('Load error:', err);
        setJobs([]);
        setError(err?.message || 'Failed to load jobs. Check that VITE_API_BASE_URL points to your backend.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [selectedCareer, localProfile]);

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.company.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || job.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-sm font-medium text-accent">
            <Briefcase className="h-4 w-4" />
            Career-Matched Jobs
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            Job Opportunities
          </h1>
          <p className="text-muted-foreground">
            Discover job openings and internships that match your career path and skills
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4 md:flex-row"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs, companies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-12 pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-12 w-full md:w-48">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Job Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="Full-time">Full-time</SelectItem>
              <SelectItem value="Part-time">Part-time</SelectItem>
              <SelectItem value="Internship">Internship</SelectItem>
              <SelectItem value="Remote">Remote</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* User Profile Info */}
        {profile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-border bg-muted/30 p-4 text-sm"
          >
            <strong>Your Profile:</strong> {profile.name} | Skills: {profile.skills?.join(', ')} | Interests: {profile.interests?.join(', ')} | CGPA: {profile.cgpa}
          </motion.div>
        )}

        {/* Status Messages */}
        {loading && <div className="text-sm text-muted-foreground animate-pulse">Loading jobs matched to your profile...</div>}
        {!loading && !error && source === 'none' && (
          <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm text-warning">
            Live job feed is not active. Check backend provider configuration.
          </div>
        )}
        {error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive"
          >
            <strong>Error:</strong> {error}
          </motion.div>
        )}

        {/* Job Count */}
        <div className="text-sm text-muted-foreground">
          Showing {filteredJobs.length} {filteredJobs.length === 1 ? 'opportunity' : 'opportunities'} matched to your profile
        </div>

        {/* Job Cards */}
        <div className="grid gap-6 md:grid-cols-2">
          {filteredJobs.map((job, index) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + index * 0.05 }}
              className="group rounded-xl border border-border bg-card p-6 shadow-card transition-all hover:border-primary hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-muted text-2xl">
                    {job.logo || 'CO'}
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-primary transition-colors">
                      {job.title}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4" />
                      {job.company}
                    </div>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold ${
                  job.matchScore >= 85
                    ? 'bg-success/10 text-success'
                    : job.matchScore >= 70
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}>
                  {job.matchScore}% Match
                </span>
              </div>

              <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {job.location}
                </div>
                <div className="flex items-center gap-1">
                  <Briefcase className="h-4 w-4" />
                  {job.type}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {job.postedDate}
                </div>
              </div>

              <div className="mb-4">
                <p className="mb-2 text-sm font-medium text-foreground">Required Skills:</p>
                <div className="flex flex-wrap gap-2">
                  {job.requiredSkills.map((skill) => (
                    <SkillBadge key={skill} skill={skill} variant="outline" size="sm" />
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-border pt-4">
                <span className="font-display text-lg font-bold text-foreground">
                  {job.salary}
                </span>
                <Button
                  size="sm"
                  className="group-hover:bg-primary group-hover:text-primary-foreground"
                  disabled={!job.applyUrl}
                  onClick={async () => {
                    try {
                      if (!job.applyUrl) return;
                      const base = getApiBaseUrl();
                      const url = job.applyUrl;
                      window.open(url, '_blank');
                      // record application
                      await fetch(`${base}/api/apply`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ jobId: job.id, applicant: { id: 'student-1', name: 'Student' } }),
                      });
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                >
                  {job.applyUrl ? 'Apply Now' : 'Link Unavailable'}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredJobs.length === 0 && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-xl border border-border bg-card p-12 text-center"
          >
            <Briefcase className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <h3 className="mb-2 font-display text-lg font-semibold text-foreground">
              No jobs found
            </h3>
            <p className="text-muted-foreground">
              Try adjusting your search or filters
            </p>
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
