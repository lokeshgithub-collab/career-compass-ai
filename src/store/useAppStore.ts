import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { StudentProfile, CareerRecommendation, AptitudeResponse } from '@/types/career';

interface AppState {
  // Auth state
  isAuthenticated: boolean;
  currentStep: 'landing' | 'auth' | 'profile' | 'aptitude' | 'dashboard' | 'recommendations' | 'roadmap' | 'jobs' | 'analytics';
  
  // User data
  profile: Partial<StudentProfile> | null;
  selectedCareer: CareerRecommendation | null;
  completedMilestones: Record<string, string>;
  
  // Actions
  setAuthenticated: (value: boolean) => void;
  setCurrentStep: (step: AppState['currentStep']) => void;
  updateProfile: (data: Partial<StudentProfile>) => void;
  setSelectedCareer: (career: CareerRecommendation | null) => void;
  toggleMilestoneComplete: (id: string) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      currentStep: 'landing',
      profile: null,
      selectedCareer: null,
      completedMilestones: {},
      
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setCurrentStep: (step) => set({ currentStep: step }),
      updateProfile: (data) => set((state) => ({
        profile: { ...state.profile, ...data }
      })),
      setSelectedCareer: (career) => set({ selectedCareer: career }),
      toggleMilestoneComplete: (id) => set((state) => {
        const existing = state.completedMilestones[id];
        const next = { ...state.completedMilestones };
        if (existing) {
          delete next[id];
        } else {
          next[id] = new Date().toISOString();
        }
        return { completedMilestones: next };
      }),
      logout: () => set({
        isAuthenticated: false,
        currentStep: 'landing',
        profile: null,
        selectedCareer: null,
        completedMilestones: {},
      }),
    }),
    {
      name: 'career-path-storage',
    }
  )
);
