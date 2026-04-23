import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  User, 
  Mail, 
  BookOpen, 
  Award,
  Edit,
  Save,
  GraduationCap,
  FileSearch,
  Github,
  Briefcase,
  MapPin,
  Link as LinkIcon,
  LogOut
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { SkillBadge } from '@/components/ui/skill-badge';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, updateProfile, logout } = useAppStore();
  const { toast } = useToast();
  const base = getApiBaseUrl();
  const aptitudeCategoryValues = profile?.aptitude ? Object.values(profile.aptitude) : [];
  const aptitudeOverallScore = aptitudeCategoryValues.length > 0
    ? Math.round((aptitudeCategoryValues.reduce((sum, value) => sum + Number(value), 0) / aptitudeCategoryValues.length / 5) * 100)
    : 0;
  const logicalScore = Number(profile?.logicalScore || 0);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    cgpa: profile?.cgpa?.toString() || '',
    targetRoles: profile?.targetRoles?.join(', ') || '',
    targetLocations: profile?.targetLocations?.join(', ') || '',
    strongestSkills: profile?.strongestSkills?.join(', ') || '',
    weakestSkills: profile?.weakestSkills?.join(', ') || '',
    projectCount: profile?.projectCount?.toString() || '0',
    internshipCount: profile?.internshipCount?.toString() || '0',
    certificationsCount: profile?.certificationsCount?.toString() || '0',
    expectedSalaryLpa: profile?.expectedSalaryLpa?.toString() || '',
    githubUrl: profile?.githubUrl || '',
    linkedinUrl: profile?.linkedinUrl || '',
  });
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [atsResult, setAtsResult] = useState<any | null>(null);
  const [githubUrl, setGithubUrl] = useState('');
  const [portfolioReport, setPortfolioReport] = useState<any | null>(null);

  const handleSave = async () => {
    const payload = {
      ...profile,
      name: editData.name,
      email: editData.email,
      cgpa: parseFloat(editData.cgpa),
      targetRoles: editData.targetRoles.split(',').map((item) => item.trim()).filter(Boolean),
      targetLocations: editData.targetLocations.split(',').map((item) => item.trim()).filter(Boolean),
      strongestSkills: editData.strongestSkills.split(',').map((item) => item.trim()).filter(Boolean),
      weakestSkills: editData.weakestSkills.split(',').map((item) => item.trim()).filter(Boolean),
      projectCount: Number(editData.projectCount || 0),
      internshipCount: Number(editData.internshipCount || 0),
      certificationsCount: Number(editData.certificationsCount || 0),
      expectedSalaryLpa: Number(editData.expectedSalaryLpa || 0),
      githubUrl: editData.githubUrl,
      linkedinUrl: editData.linkedinUrl,
    };

    try {
      const resp = await fetch(`${base}/api/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const saved = resp.ok ? await resp.json() : payload;
      updateProfile(saved);
    } catch (_err) {
      updateProfile(payload);
    }

    setIsEditing(false);
    toast({
      title: 'Profile Updated',
      description: 'Your richer career profile is now available to the simulator.',
    });
  };

  const handleLogout = () => {
    logout();
    toast({
      title: 'Logged Out',
      description: 'You have been successfully logged out.',
    });
    navigate('/');
  };

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            My Profile
          </h1>
          <p className="text-muted-foreground">
            Manage your personal information and preferences
          </p>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card shadow-card"
        >
          {/* Header */}
          <div className="relative h-32 rounded-t-xl bg-gradient-hero">
            <div className="absolute -bottom-12 left-8">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl border-4 border-card bg-gradient-primary text-4xl font-bold text-primary-foreground shadow-lg">
                {profile?.name?.charAt(0) || 'S'}
              </div>
            </div>
          </div>

          <div className="px-8 pb-8 pt-16">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="font-display text-2xl font-bold text-foreground">
                  {profile?.name || 'Student Name'}
                </h2>
                <p className="text-muted-foreground">{profile?.email || 'email@university.edu'}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={isEditing ? 'default' : 'outline'}
                  onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                >
                  {isEditing ? (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  ) : (
                    <>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>

            {isEditing ? (
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cgpa">CGPA</Label>
                  <Input
                    id="cgpa"
                    type="number"
                    step="0.01"
                    value={editData.cgpa}
                    onChange={(e) => setEditData({ ...editData, cgpa: e.target.value })}
                  />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="targetRoles">Target Roles</Label>
                  <Input id="targetRoles" value={editData.targetRoles} onChange={(e) => setEditData({ ...editData, targetRoles: e.target.value })} placeholder="Full Stack Developer, Frontend Developer" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="targetLocations">Target Locations</Label>
                  <Input id="targetLocations" value={editData.targetLocations} onChange={(e) => setEditData({ ...editData, targetLocations: e.target.value })} placeholder="Chennai, Bangalore, Remote" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="strongestSkills">Strongest Skills</Label>
                  <Input id="strongestSkills" value={editData.strongestSkills} onChange={(e) => setEditData({ ...editData, strongestSkills: e.target.value })} placeholder="React, JavaScript, Problem Solving" />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="weakestSkills">Weakest Skills</Label>
                  <Input id="weakestSkills" value={editData.weakestSkills} onChange={(e) => setEditData({ ...editData, weakestSkills: e.target.value })} placeholder="SQL, Docker, System Design" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="projectCount">Projects</Label>
                  <Input id="projectCount" type="number" min="0" value={editData.projectCount} onChange={(e) => setEditData({ ...editData, projectCount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="internshipCount">Internships</Label>
                  <Input id="internshipCount" type="number" min="0" value={editData.internshipCount} onChange={(e) => setEditData({ ...editData, internshipCount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="certificationsCount">Certifications</Label>
                  <Input id="certificationsCount" type="number" min="0" value={editData.certificationsCount} onChange={(e) => setEditData({ ...editData, certificationsCount: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedSalaryLpa">Expected Salary (LPA)</Label>
                  <Input id="expectedSalaryLpa" type="number" min="0" step="0.1" value={editData.expectedSalaryLpa} onChange={(e) => setEditData({ ...editData, expectedSalaryLpa: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="githubUrl">GitHub URL</Label>
                  <Input id="githubUrl" value={editData.githubUrl} onChange={(e) => setEditData({ ...editData, githubUrl: e.target.value })} />
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                  <Input id="linkedinUrl" value={editData.linkedinUrl} onChange={(e) => setEditData({ ...editData, linkedinUrl: e.target.value })} />
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-3">
                <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <GraduationCap className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Course</p>
                    <p className="font-medium text-foreground">{profile?.course || 'Not set'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/10">
                    <BookOpen className="h-5 w-5 text-secondary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Year</p>
                    <p className="font-medium text-foreground">
                      {profile?.year ? `${profile.year}${profile.year === 1 ? 'st' : profile.year === 2 ? 'nd' : profile.year === 3 ? 'rd' : 'th'} Year` : 'Not set'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl bg-muted p-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                    <Award className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">CGPA</p>
                    <p className="font-medium text-foreground">{profile?.cgpa || 'Not set'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.16 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
              Assessment Scores
            </h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Aptitude Score</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {aptitudeOverallScore > 0 ? `${aptitudeOverallScore}%` : 'Not taken'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on your stage-1 aptitude responses.
                </p>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <p className="text-sm text-muted-foreground">Logical Score</p>
                <p className="font-display text-3xl font-bold text-foreground">
                  {logicalScore > 0 ? `${logicalScore}%` : 'Not taken'}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Based on your stage-2 quantitative and qualitative test.
                </p>
              </div>
            </div>
            {aptitudeCategoryValues.length > 0 && (
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {Object.entries(profile?.aptitude || {}).map(([category, value]) => (
                  <div key={category} className="rounded-lg bg-muted/50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">{category}</p>
                    <p className="text-sm font-semibold text-foreground">{value}/5</p>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>

        {/* Skills & Interests */}
        <div className="grid gap-6 md:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
              Your Skills
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile?.skills?.length ? (
                profile.skills.map((skill) => (
                  <SkillBadge key={skill} skill={skill} variant="matched" />
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills added yet</p>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
              Your Interests
            </h3>
            <div className="flex flex-wrap gap-2">
              {profile?.interests?.length ? (
                profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary"
                  >
                    {interest}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No interests added yet</p>
              )}
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
          className="rounded-xl border border-border bg-card p-6 shadow-card"
        >
          <h3 className="mb-4 font-display text-lg font-semibold text-foreground">
            Simulation Inputs
          </h3>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-xl bg-muted p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <Briefcase className="h-4 w-4 text-primary" />
                Target Roles
              </div>
              <p className="text-sm text-muted-foreground">{profile?.targetRoles?.join(', ') || 'Not set'}</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <MapPin className="h-4 w-4 text-primary" />
                Target Locations
              </div>
              <p className="text-sm text-muted-foreground">{profile?.targetLocations?.join(', ') || 'Not set'}</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <div className="mb-2 flex items-center gap-2 font-medium text-foreground">
                <LinkIcon className="h-4 w-4 text-primary" />
                Career Assets
              </div>
              <p className="text-sm text-muted-foreground">
                Projects {profile?.projectCount ?? 0} • Internships {profile?.internshipCount ?? 0} • Certs {profile?.certificationsCount ?? 0}
              </p>
            </div>
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-xl bg-muted p-4">
              <p className="mb-2 font-medium text-foreground">Strongest Skills</p>
              <p className="text-sm text-muted-foreground">{profile?.strongestSkills?.join(', ') || 'Not set'}</p>
            </div>
            <div className="rounded-xl bg-muted p-4">
              <p className="mb-2 font-medium text-foreground">Weakest Skills</p>
              <p className="text-sm text-muted-foreground">{profile?.weakestSkills?.join(', ') || 'Not set'}</p>
            </div>
          </div>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <FileSearch className="h-5 w-5 text-primary" />
              Resume ATS Optimizer
            </h3>
            <div className="space-y-3">
              <Textarea
                className="min-h-[110px]"
                placeholder="Paste your resume text..."
                value={resumeText}
                onChange={(e) => setResumeText(e.target.value)}
              />
              <Textarea
                className="min-h-[110px]"
                placeholder="Paste target job description..."
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!resumeText || !jobDescription}
                onClick={async () => {
                  try {
                    const base = getApiBaseUrl();
                    const resp = await fetch(`${base}/api/resume/ats-optimize`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ resumeText, jobDescription }),
                    });
                    if (!resp.ok) return;
                    const data = await resp.json();
                    setAtsResult(data);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                Analyze ATS Fit
              </Button>
              {atsResult && (
                <div className="rounded-lg bg-muted/60 p-3 text-sm">
                  <p className="font-semibold text-foreground">ATS Score: {atsResult.atsScore}/100</p>
                  <p className="mt-1 text-muted-foreground">
                    Missing keywords: {(atsResult.missingKeywords || []).slice(0, 8).join(', ')}
                  </p>
                </div>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <h3 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Github className="h-5 w-5 text-primary" />
              Portfolio Verifier
            </h3>
            <div className="space-y-3">
              <Input
                placeholder="https://github.com/your-username"
                value={githubUrl}
                onChange={(e) => setGithubUrl(e.target.value)}
              />
              <Button
                className="w-full"
                disabled={!githubUrl}
                onClick={async () => {
                  try {
                    const base = getApiBaseUrl();
                    const resp = await fetch(`${base}/api/portfolio/verify`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ githubUrl }),
                    });
                    if (!resp.ok) return;
                    const data = await resp.json();
                    setPortfolioReport(data);
                  } catch (err) {
                    console.error(err);
                  }
                }}
              >
                Verify Portfolio
              </Button>
              {portfolioReport && (
                <div className="rounded-lg bg-muted/60 p-3 text-sm">
                  <p className="font-semibold text-foreground">Portfolio Score: {portfolioReport.score}/100</p>
                  <p className="mt-1 text-muted-foreground">
                    Repos: {portfolioReport.stats?.repos} | Active 30d: {portfolioReport.stats?.activeLast30Days}
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
