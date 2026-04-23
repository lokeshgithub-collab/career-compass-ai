import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, ArrowLeft, GraduationCap, Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { availableSkills, availableInterests } from '@/lib/mockData';

const courses = [
  'B.Tech Computer Science',
  'B.Tech Information Technology',
  'B.Tech Electronics',
  'B.Tech Mechanical',
  'BCA',
  'MCA',
  'B.Sc Computer Science',
  'MBA',
  'Other',
];

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { profile, updateProfile } = useAppStore();
  const { toast } = useToast();
  const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    course: '',
    year: '',
    cgpa: '',
    preferredWorkMode: '',
    weeklyStudyHours: '',
    targetPlacementTimeline: '',
    skills: [] as string[],
    interests: [] as string[],
  });

  const [resumeFile, setResumeFile] = useState<File | null>(null);

  const toggleSkill = (skill: string) => {
    setFormData((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const toggleInterest = (interest: string) => {
    setFormData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : [...prev.interests, interest],
    }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setResumeFile(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    if (!formData.course || !formData.year || !formData.cgpa) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    if (!formData.preferredWorkMode || !formData.weeklyStudyHours || !formData.targetPlacementTimeline) {
      toast({
        title: 'More Details Needed',
        description: 'Please answer the planning questions for better ML analysis',
        variant: 'destructive',
      });
      return;
    }

    if (formData.skills.length < 3) {
      toast({
        title: 'Select More Skills',
        description: 'Please select at least 3 skills',
        variant: 'destructive',
      });
      return;
    }

    if (formData.interests.length < 2) {
      toast({
        title: 'Select More Interests',
        description: 'Please select at least 2 interests',
        variant: 'destructive',
      });
      return;
    }

    const profileData = {
      id: profile?.id,
      name: profile?.name,
      email: profile?.email,
      course: formData.course,
      year: parseInt(formData.year),
      cgpa: parseFloat(formData.cgpa),
      preferredWorkMode: formData.preferredWorkMode as 'Remote' | 'Hybrid' | 'Onsite',
      weeklyStudyHours: parseInt(formData.weeklyStudyHours),
      targetPlacementTimeline: formData.targetPlacementTimeline as '3_months' | '6_months' | '12_months',
      skills: formData.skills,
      interests: formData.interests,
      resumeUrl: resumeFile ? URL.createObjectURL(resumeFile) : undefined,
    };

    setIsLoading(true);
    try {
      const resp = await fetch(`${base}/api/user/profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData),
      });
      if (!resp.ok) throw new Error('Could not save profile');
      const savedProfile = await resp.json();
      updateProfile(savedProfile);
      navigate('/onboarding/aptitude');
    } catch {
      updateProfile(profileData);
      toast({
        title: 'Offline Save',
        description: 'Profile saved locally. Network save failed.',
        variant: 'warning',
      });
      navigate('/onboarding/aptitude');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-4xl px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>

            {/* Planning Questions */}
            <div>
              <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                Career Planning Questions
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="workMode">Preferred Work Mode *</Label>
                  <Select
                    value={formData.preferredWorkMode}
                    onValueChange={(value) => setFormData({ ...formData, preferredWorkMode: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Remote">Remote</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                      <SelectItem value="Onsite">Onsite</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studyHours">Weekly Study Hours *</Label>
                  <Input
                    id="studyHours"
                    type="number"
                    min="1"
                    max="80"
                    placeholder="e.g., 14"
                    value={formData.weeklyStudyHours}
                    onChange={(e) => setFormData({ ...formData, weeklyStudyHours: e.target.value })}
                    className="h-12"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="timeline">Placement Target Timeline *</Label>
                  <Select
                    value={formData.targetPlacementTimeline}
                    onValueChange={(value) => setFormData({ ...formData, targetPlacementTimeline: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select timeline" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3_months">3 months</SelectItem>
                      <SelectItem value="6_months">6 months</SelectItem>
                      <SelectItem value="12_months">12 months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <span className="font-display text-xl font-bold text-foreground">CareerPath</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
              1
            </div>
            <div className="h-1 w-16 rounded-full bg-muted">
              <div className="h-full w-1/2 rounded-full bg-primary" />
            </div>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
              2
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-8 shadow-card"
        >
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            Let's build your profile
          </h1>
          <p className="mb-8 text-muted-foreground">
            Tell us about your academic background and skills
          </p>

          <div className="space-y-8">
            {/* Academic Details */}
            <div>
              <h2 className="mb-4 font-display text-lg font-semibold text-foreground">
                Academic Details
              </h2>
              <div className="grid gap-6 md:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="course">Course/Program *</Label>
                  <Select
                    value={formData.course}
                    onValueChange={(value) => setFormData({ ...formData, course: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select your course" />
                    </SelectTrigger>
                    <SelectContent>
                      {courses.map((course) => (
                        <SelectItem key={course} value={course}>
                          {course}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year">Current Year *</Label>
                  <Select
                    value={formData.year}
                    onValueChange={(value) => setFormData({ ...formData, year: value })}
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1st Year</SelectItem>
                      <SelectItem value="2">2nd Year</SelectItem>
                      <SelectItem value="3">3rd Year</SelectItem>
                      <SelectItem value="4">4th Year</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cgpa">Current CGPA *</Label>
                  <Input
                    id="cgpa"
                    type="number"
                    step="0.01"
                    min="0"
                    max="10"
                    placeholder="e.g., 8.5"
                    value={formData.cgpa}
                    onChange={(e) => setFormData({ ...formData, cgpa: e.target.value })}
                    className="h-12"
                  />
                </div>
              </div>
            </div>

            {/* Skills */}
            <div>
              <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
                Your Skills
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Select at least 3 skills you're proficient in
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSkills.map((skill) => (
                  <button
                    key={skill}
                    type="button"
                    onClick={() => toggleSkill(skill)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      formData.skills.includes(skill)
                        ? 'bg-primary text-primary-foreground shadow-md'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {formData.skills.includes(skill) && <Check className="h-4 w-4" />}
                    {skill}
                  </button>
                ))}
              </div>
            </div>

            {/* Interests */}
            <div>
              <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
                Career Interests
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Select at least 2 areas you're interested in
              </p>
              <div className="flex flex-wrap gap-2">
                {availableInterests.map((interest) => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => toggleInterest(interest)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                      formData.interests.includes(interest)
                        ? 'bg-secondary text-secondary-foreground shadow-md'
                        : 'bg-muted text-foreground hover:bg-muted/80'
                    }`}
                  >
                    {formData.interests.includes(interest) && <Check className="h-4 w-4" />}
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            {/* Resume Upload */}
            <div>
              <h2 className="mb-2 font-display text-lg font-semibold text-foreground">
                Resume (Optional)
              </h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Upload your resume for better recommendations
              </p>
              <label className="flex cursor-pointer items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border bg-muted/50 p-8 transition-colors hover:border-primary hover:bg-muted">
                <Upload className="h-6 w-6 text-muted-foreground" />
                <span className="text-muted-foreground">
                  {resumeFile ? resumeFile.name : 'Click to upload PDF or DOCX'}
                </span>
                <input
                  type="file"
                  accept=".pdf,.docx"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex justify-between">
            <Button variant="ghost" onClick={() => navigate('/auth')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button onClick={handleSubmit} size="lg" disabled={isLoading}>
              {isLoading ? 'Saving profile...' : 'Continue to Aptitude Test'}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
