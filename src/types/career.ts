export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  course: string;
  year: number;
  cgpa: number;
  interests: string[];
  skills: string[];
  targetRoles?: string[];
  strongestSkills?: string[];
  weakestSkills?: string[];
  targetLocations?: string[];
  projectCount?: number;
  internshipCount?: number;
  certificationsCount?: number;
  expectedSalaryLpa?: number;
  githubUrl?: string;
  linkedinUrl?: string;
  logicalResponses?: LogicalResponse[];
  logicalScore?: number;
  aptitudeResponses: AptitudeResponse[];
  aptitude?: Record<string, number>;
  preferredWorkMode?: 'Remote' | 'Hybrid' | 'Onsite';
  weeklyStudyHours?: number;
  targetPlacementTimeline?: '3_months' | '6_months' | '12_months';
  resumeUrl?: string;
  createdAt: Date;
}

export interface WeeklyCheckIn {
  id: string;
  userId: string;
  weekLabel: string;
  studyHours: number;
  topicsCompleted: string[];
  projectWorkSummary: string;
  applicationsSubmitted: number;
  interviewsAttended: number;
  confidenceLevel: number;
  blockers: string;
  createdAt: string;
}

export interface PlacementOutcome {
  id: string;
  userId: string;
  company: string;
  role: string;
  status: 'Applied' | 'Shortlisted' | 'Interviewing' | 'Rejected' | 'Offered' | 'Accepted';
  roundsCleared: number;
  packageLpa?: number;
  notes?: string;
  createdAt: string;
}

export interface AptitudeResponse {
  questionId: string;
  category:
    | 'analytical'
    | 'creative'
    | 'leadership'
    | 'technical'
    | 'communication'
    | 'collaboration'
    | 'adaptability'
    | 'business';
  answer: number; // 1-5 scale
}

export interface LogicalResponse {
  questionId: string;
  topic: 'quantitative' | 'qualitative';
  answer: string;
  isCorrect: boolean;
}

export interface CareerRecommendation {
  id: string;
  title: string;
  description: string;
  matchScore: number; // 0-100
  skillReadinessScore: number; // 0-100
  reasoning: string[];
  requiredSkills: string[];
  matchedSkills: string[];
  gapSkills: string[];
  averageSalary: string;
  growthOutlook: 'High' | 'Medium' | 'Low';
  icon: string;
}

export interface RoadmapMilestone {
  id: string;
  year: number;
  semester: 1 | 2;
  title: string;
  description: string;
  importance?: number; // 1-5, higher means more essential
  skills: string[];
  courses: RoadmapCourse[];
  projects: string[];
  internships?: string[];
  certifications?: string[];
  completed: boolean;
}

export interface RoadmapCourse {
  title: string;
  provider: string;
  url: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  duration: string;
}

export interface CareerRoadmap {
  careerId: string;
  careerTitle: string;
  milestones: RoadmapMilestone[];
  totalDuration: string;
}

export interface JobOpportunity {
  id: string;
  title: string;
  company: string;
  location: string;
  type: 'Full-time' | 'Part-time' | 'Internship' | 'Remote';
  salary: string;
  requiredSkills: string[];
  matchScore: number;
  postedDate: string;
  applyUrl: string;
  logo: string;
}

export interface ProgressAnalytics {
  overallReadiness: number;
  skillProgress: {
    skill: string;
    current: number;
    target: number;
  }[];
  completedMilestones: number;
  totalMilestones: number;
  weeklyProgress: {
    week: string;
    progress: number;
  }[];
}
