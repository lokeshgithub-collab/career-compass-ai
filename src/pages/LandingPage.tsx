import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Target, Map, Briefcase, Sparkles, GraduationCap, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Target,
    title: 'AI-Powered Matching',
    description: 'Our ML algorithms analyze your profile to find careers that truly fit you.',
  },
  {
    icon: Map,
    title: 'Personalized Roadmap',
    description: 'Get a year-wise plan with skills, courses, and projects tailored to your goals.',
  },
  {
    icon: Briefcase,
    title: 'Job Opportunities',
    description: 'Discover relevant job openings and internships matched to your career path.',
  },
];

const steps = [
  'Create your academic profile',
  'Take the aptitude assessment',
  'Get AI-powered career recommendations',
  'Follow your personalized roadmap',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-hero-pattern">
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden">
          <motion.div
            className="absolute top-20 left-10 h-20 w-20 rounded-full bg-primary-foreground/10"
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 6, repeat: Infinity }}
          />
          <motion.div
            className="absolute top-40 right-20 h-32 w-32 rounded-full bg-primary-foreground/5"
            animate={{ y: [0, 20, 0] }}
            transition={{ duration: 8, repeat: Infinity }}
          />
          <motion.div
            className="absolute bottom-20 left-1/4 h-16 w-16 rounded-full bg-primary-foreground/10"
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          />
        </div>

        <div className="container relative mx-auto px-4 py-24 lg:py-32">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/10 px-4 py-2 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
                <span className="text-sm font-medium text-primary-foreground">
                  AI-Powered Career Guidance
                </span>
              </div>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="mb-6 font-display text-4xl font-bold tracking-tight text-primary-foreground sm:text-5xl lg:text-6xl"
            >
              Discover Your Perfect
              <br />
              <span className="text-primary-foreground/90">Career Path</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-10 text-lg text-primary-foreground/80 sm:text-xl"
            >
              Let our AI analyze your skills, interests, and aptitude to recommend
              the best career paths with a personalized roadmap to success.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              className="flex flex-col items-center justify-center gap-4 sm:flex-row"
            >
              <Link to="/auth">
                <Button variant="heroOutline" size="xl" className="group">
                  Get Started Free
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/auth?mode=login">
                <Button variant="heroOutline" size="xl">
                  Sign In
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z"
              className="fill-background"
            />
          </svg>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="mb-16 text-center"
          >
            <h2 className="mb-4 font-display text-3xl font-bold text-foreground sm:text-4xl">
              How It Works
            </h2>
            <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
              Our intelligent system guides you from self-discovery to career success
            </p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="group relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-card transition-all hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground">
                  <feature.icon className="h-7 w-7" />
                </div>
                <h3 className="mb-3 font-display text-xl font-semibold text-foreground">
                  {feature.title}
                </h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Steps Section */}
      <section className="bg-muted py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="mb-12 text-center"
            >
              <h2 className="mb-4 font-display text-3xl font-bold text-foreground">
                Your Journey to Success
              </h2>
            </motion.div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <motion.div
                  key={step}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-4 rounded-xl bg-card p-4 shadow-card"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary font-display font-bold text-primary-foreground">
                    {index + 1}
                  </div>
                  <p className="font-medium text-foreground">{step}</p>
                  <CheckCircle className="ml-auto h-5 w-5 text-success" />
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl bg-gradient-hero p-12 text-center"
          >
            <div className="relative z-10">
              <GraduationCap className="mx-auto mb-6 h-16 w-16 text-primary-foreground" />
              <h2 className="mb-4 font-display text-3xl font-bold text-primary-foreground sm:text-4xl">
                Ready to Shape Your Future?
              </h2>
              <p className="mx-auto mb-8 max-w-xl text-lg text-primary-foreground/80">
                Join thousands of students who have discovered their ideal career path
              </p>
              <Link to="/auth">
                <Button variant="heroOutline" size="xl" className="group">
                  Start Your Journey
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-8">
        <div className="container mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © 2026 CareerPath AI. Built for Academic Excellence.
          </p>
        </div>
      </footer>
    </div>
  );
}
