import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import ProfileSetupPage from "./pages/ProfileSetupPage";
import AptitudeTestPage from "./pages/AptitudeTestPage";
import DashboardPage from "./pages/DashboardPage";
import RecommendationsPage from "./pages/RecommendationsPage";
import RoadmapPage from "./pages/RoadmapPage";
import JobsPage from "./pages/JobsPage";
import AICoachPage from "./pages/AICoachPage";
import MockInterviewPage from "./pages/MockInterviewPage";
import MockInterviewTestPage from "./pages/MockInterviewTestPage";
import AnalyticsPage from "./pages/AnalyticsPage";
import CommunityPage from "./pages/CommunityPage";
import ProfilePage from "./pages/ProfilePage";
import WeeklyCheckInPage from "./pages/WeeklyCheckInPage";
import OutcomesPage from "./pages/OutcomesPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding/profile" element={<ProfileSetupPage />} />
          <Route path="/onboarding/aptitude" element={<AptitudeTestPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/recommendations" element={<RecommendationsPage />} />
          <Route path="/roadmap" element={<RoadmapPage />} />
          <Route path="/jobs" element={<JobsPage />} />
          <Route path="/coach" element={<AICoachPage />} />
          <Route path="/mock-interview" element={<MockInterviewPage />} />
          <Route path="/mock-interview/test" element={<MockInterviewTestPage />} />
          <Route path="/analytics" element={<AnalyticsPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/checkins" element={<WeeklyCheckInPage />} />
          <Route path="/outcomes" element={<OutcomesPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
