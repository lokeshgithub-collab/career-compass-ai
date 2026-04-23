import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { 
  Map, 
  Check, 
  Clock,
  BookOpen,
  Code,
  Briefcase,
  Award,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/store/useAppStore';
import { generateRoadmap, mockCareerRecommendations } from '@/lib/mockData';
import { RoadmapMilestone } from '@/types/career';
import { getApiBaseUrl } from '@/lib/api';

export default function RoadmapPage() {
  const { selectedCareer, profile, updateProfile, completedMilestones, toggleMilestoneComplete } = useAppStore();
  const career = selectedCareer || mockCareerRecommendations[0];
  const [roadmap, setRoadmap] = useState<RoadmapMilestone[]>(() => generateRoadmap(career.title));
  const allMilestones = roadmap.length > 0 ? roadmap : generateRoadmap(career.title);
  
  // State for year selection
  const [selectedYear, setSelectedYear] = useState<number | null>(profile?.year || null);
  const [isYearEditing, setIsYearEditing] = useState(false);
  const base = getApiBaseUrl();

  useEffect(() => {
    if (!isYearEditing && profile?.year && profile.year !== selectedYear) {
      setSelectedYear(profile.year);
    }
  }, [isYearEditing, profile?.year, selectedYear]);

  useEffect(() => {
    const loadRoadmap = async () => {
      try {
        const resp = await fetch(`${base}/api/roadmap/generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            careerTitle: career.title,
            currentYear: profile?.year || selectedYear || 1,
          }),
        });
        if (!resp.ok) throw new Error('Roadmap fetch failed');
        const data = await resp.json();
        if (Array.isArray(data?.roadmap)) {
          setRoadmap(data.roadmap);
        }
      } catch {
        setRoadmap(generateRoadmap(career.title));
      }
    };

    void loadRoadmap();
  }, [base, career.title, profile?.year, selectedYear]);

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setIsYearEditing(false);
    updateProfile({ year });
  };
  
  const sortedMilestones = useMemo(
    () =>
      [...allMilestones].sort(
        (a, b) => a.year - b.year || a.semester - b.semester
      ),
    [allMilestones]
  );

  const compressionByYear: Record<number, number> = {
    1: 1,
    2: 0.75,
    3: 0.5,
    4: 0.35,
  };

  const selectMilestonesForYear = (milestones: RoadmapMilestone[], year: number) => {
    const ratio = compressionByYear[year] ?? 1;
    const minCount = Math.min(3, milestones.length);
    const targetCount = Math.max(minCount, Math.round(milestones.length * ratio));

    const ranked = [...milestones].sort((a, b) => {
      const aImp = a.importance ?? 3;
      const bImp = b.importance ?? 3;
      if (aImp !== bImp) return bImp - aImp;
      return a.year - b.year || a.semester - b.semester;
    });

    const selectedIds = new Set(ranked.slice(0, targetCount).map((m) => m.id));

    return milestones.filter((m) => selectedIds.has(m.id));
  };

  // Filter milestones based on selected year: earlier years get more detail, later years get only essentials
  const filteredRoadmap = useMemo(
    () => (selectedYear ? selectMilestonesForYear(sortedMilestones, selectedYear) : []),
    [selectedYear, sortedMilestones]
  );

  const hydratedRoadmap = useMemo(
    () =>
      filteredRoadmap.map((m) => ({
        ...m,
        completed: Boolean(completedMilestones[m.id]),
      })),
    [filteredRoadmap, completedMilestones]
  );
  
  const [expandedMilestone, setExpandedMilestone] = useState<string | null>(null);

  // Keep expanded item stable; only auto-select when year/list changes or current id disappears
  useEffect(() => {
    if (hydratedRoadmap.length === 0) {
      setExpandedMilestone(null);
      return;
    }

    const exists = expandedMilestone
      ? hydratedRoadmap.some((m) => m.id === expandedMilestone)
      : false;

    if (!exists) {
      setExpandedMilestone(
        hydratedRoadmap.find((m) => !m.completed)?.id || hydratedRoadmap[0].id
      );
    }
  }, [hydratedRoadmap, expandedMilestone]);

  const completedCount = hydratedRoadmap.filter(m => m.completed).length;
  const progress = hydratedRoadmap.length > 0 ? (completedCount / hydratedRoadmap.length) * 100 : 0;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-secondary/10 px-3 py-1 text-sm font-medium text-secondary">
            <Map className="h-4 w-4" />
            Personalized Roadmap
          </div>
          <h1 className="mb-2 font-display text-3xl font-bold text-foreground">
            Your Path to {career.title}
          </h1>
          <p className="text-muted-foreground">
            A semester-by-semester guide to prepare you for your dream career
          </p>
        </motion.div>

        {/* Year Selection */}
        {!selectedYear && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-xl border border-border bg-card p-6 shadow-card"
          >
            <div className="mb-4">
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">
                Which year are you currently studying?
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                Select your current year to see a customized roadmap tailored to your timeline
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              {[1, 2, 3, 4].map((year) => (
                <Button
                  key={year}
                  onClick={() => handleYearSelect(year)}
                  variant="outline"
                  className="h-12 px-6 text-base font-semibold hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  Year {year}
                </Button>
              ))}
            </div>
          </motion.div>
        )}

        {selectedYear && (
          <>
            {/* Selected Year Display */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center justify-between rounded-lg bg-secondary/10 p-4 border border-secondary/20"
            >
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-secondary" />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Currently in</p>
                  <p className="text-lg font-semibold text-foreground">Year {selectedYear}</p>
                </div>
              </div>
              <Button
                onClick={() => {
                  setIsYearEditing(true);
                  setSelectedYear(null);
                }}
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground"
              >
                Change
              </Button>
            </motion.div>

            {/* Progress Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-xl border border-border bg-card p-6 shadow-card"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-display text-lg font-semibold text-foreground">
                    Overall Progress
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {completedCount} of {filteredRoadmap.length} milestones completed
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span className="font-display text-2xl font-bold text-foreground">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-gradient-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.3 }}
                />
              </div>
            </motion.div>

            {/* Timeline */}
            {filteredRoadmap.length > 0 ? (
              <div className="relative">
                {/* Vertical line */}
                <div className="absolute left-8 top-0 h-full w-0.5 bg-border md:left-1/2 md:-ml-0.5" />

                <div className="space-y-8">
                  {hydratedRoadmap.map((milestone, index) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      index={index}
                      isExpanded={expandedMilestone === milestone.id}
                      onToggle={() => setExpandedMilestone(
                        expandedMilestone === milestone.id ? null : milestone.id
                      )}
                      onComplete={() => toggleMilestoneComplete(milestone.id)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-border p-8 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Select your current year to view the roadmap
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

interface MilestoneCardProps {
  milestone: RoadmapMilestone;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
  onComplete: () => void;
}

function MilestoneCard({ milestone, index, isExpanded, onToggle, onComplete }: MilestoneCardProps) {
  const isEven = index % 2 === 0;

  return (
    <motion.div
      initial={{ opacity: 0, x: isEven ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`relative flex items-start gap-4 md:gap-8 ${
        isEven ? 'md:flex-row' : 'md:flex-row-reverse'
      }`}
    >
      {/* Timeline node */}
      <div className="absolute left-8 z-10 -ml-4 md:left-1/2">
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full border-4 border-background ${
            milestone.completed
              ? 'bg-success text-success-foreground'
              : 'bg-muted text-muted-foreground'
          }`}
        >
          {milestone.completed ? (
            <Check className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
        </div>
      </div>

      {/* Card */}
      <div
        className={`ml-16 flex-1 md:ml-0 ${
          isEven ? 'md:pr-8 md:text-right' : 'md:pl-8'
        }`}
      >
        <div className="md:max-w-md md:ml-auto md:mr-0">
          {!isEven && <div className="hidden md:block md:w-full" />}
        </div>
      </div>

      <div
        className={`absolute left-20 right-0 md:relative md:left-0 md:flex-1 ${
          isEven ? '' : 'md:order-first'
        }`}
      >
        <div
          className={`rounded-xl border bg-card shadow-card transition-all hover:shadow-lg ${
            milestone.completed ? 'border-success/30' : 'border-border'
          } ${isEven ? 'md:ml-auto' : ''} md:max-w-md`}
        >
          <button
            onClick={onToggle}
            className="w-full p-6 text-left"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                milestone.completed
                  ? 'bg-success/10 text-success'
                  : 'bg-primary/10 text-primary'
              }`}>
                Year {milestone.year} • Sem {milestone.semester}
              </span>
              {isExpanded ? (
                <ChevronUp className="h-5 w-5 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <h3 className="mb-1 font-display text-lg font-semibold text-foreground">
              {milestone.title}
            </h3>
            <p className="text-sm text-muted-foreground">{milestone.description}</p>
          </button>

          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="border-t border-border p-6 pt-4"
            >
              <div className="space-y-4">
                {/* Skills */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Code className="h-4 w-4 text-primary" />
                    Skills to Master
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {milestone.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Courses */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <BookOpen className="h-4 w-4 text-secondary" />
                    Recommended Courses
                  </h4>
                  <div className="space-y-2">
                    {milestone.courses.map((course) => (
                      <div
                        key={`${course.title}-${course.provider}`}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 bg-muted/50 px-3 py-2 text-sm"
                      >
                        <div>
                          <div className="font-medium text-foreground">
                            {course.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {course.provider} • {course.level} • {course.duration}
                          </div>
                        </div>
                        <Button asChild size="sm" variant="outline">
                          <a href={course.url} target="_blank" rel="noreferrer">
                            Open Course
                          </a>
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Projects */}
                <div>
                  <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                    <Code className="h-4 w-4 text-accent" />
                    Projects to Build
                  </h4>
                  <ul className="space-y-1">
                    {milestone.projects.map((project) => (
                      <li key={project} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <div className="h-1.5 w-1.5 rounded-full bg-accent" />
                        {project}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Internships */}
                {milestone.internships && milestone.internships.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Briefcase className="h-4 w-4 text-success" />
                      Internship Targets
                    </h4>
                    <ul className="space-y-1">
                      {milestone.internships.map((internship) => (
                        <li key={internship} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-success" />
                          {internship}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Certifications */}
                {milestone.certifications && milestone.certifications.length > 0 && (
                  <div>
                    <h4 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
                      <Award className="h-4 w-4 text-warning" />
                      Certifications to Earn
                    </h4>
                    <ul className="space-y-1">
                      {milestone.certifications.map((cert) => (
                        <li key={cert} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                          {cert}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {!milestone.completed && (
                  <Button size="sm" className="w-full mt-2" onClick={onComplete}>
                    Mark as Complete
                    <Check className="ml-2 h-4 w-4" />
                  </Button>
                )}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
