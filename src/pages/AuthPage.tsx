import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, AlertCircle, Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { getApiBaseUrl } from '@/lib/api';

type AuthStep = 'signup-form' | 'signup-otp' | 'login-form' | 'forgot-password-form' | 'forgot-password-otp' | 'reset-password-form';

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isLoginMode = searchParams.get('mode') === 'login';
  
  const { updateProfile, setAuthenticated, setCurrentStep } = useAppStore();
  const { toast } = useToast();
  const base = getApiBaseUrl();

  const [authStep, setAuthStep] = useState<AuthStep>(isLoginMode ? 'login-form' : 'signup-form');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Signup form state
  const [signupForm, setSignupForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [signupOtp, setSignupOtp] = useState('');
  const [devOtpDisplay, setDevOtpDisplay] = useState('');

  // Login form state
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: '',
  });

  // Forgot password state
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [forgotDevOtp, setForgotDevOtp] = useState('');

  // Signup: Request OTP
  const handleSignupRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setDevOtpDisplay('');
    setForgotDevOtp('');
    setSignupOtp('');

    if (!signupForm.name || !signupForm.email || !signupForm.password || !signupForm.confirmPassword) {
      setError('All fields are required');
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (signupForm.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      if (!base) {
        setError('Backend URL is not configured. Set VITE_API_BASE_URL in Vercel and redeploy.');
        return;
      }

      const resp = await fetch(`${base}/api/auth/signup/request-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: signupForm.name,
          email: signupForm.email,
          password: signupForm.password,
          confirmPassword: signupForm.confirmPassword,
        }),
      });

      const data = await resp.json();
      if (data.accountExists) {
        setLoginForm({
          email: signupForm.email,
          password: signupForm.password,
        });
        setSuccessMessage(data.message || 'This email is already registered. Please sign in instead.');
        setAuthStep('login-form');
        return;
      }

      if (!resp.ok) {
        if (resp.status === 409) {
          setLoginForm({
            email: signupForm.email,
            password: signupForm.password,
          });
          setSuccessMessage(data.error || 'This email is already registered. Please sign in instead.');
          setAuthStep('login-form');
          return;
        }
        setError(data.error || 'Failed to send OTP');
        return;
      }

      setDevOtpDisplay(data.devOtp || '');
      
      setSuccessMessage(data.message || 'OTP sent to your email');
      setAuthStep('signup-otp');
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Signup: Verify OTP
  const handleSignupOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!signupOtp) {
      setError('Please enter the OTP');
      return;
    }

    setIsLoading(true);
    try {
      if (!base) {
        setError('Backend URL is not configured. Set VITE_API_BASE_URL in Vercel and redeploy.');
        return;
      }

      const resp = await fetch(`${base}/api/auth/signup/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: signupForm.email,
          otp: signupOtp,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Invalid OTP');
        return;
      }

      updateProfile(data.user);
      setAuthenticated(true);
      setCurrentStep('dashboard');
      
      toast({
        title: 'Welcome!',
        description: 'Your account has been created successfully.',
      });

      navigate('/onboarding/profile');
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!loginForm.email || !loginForm.password) {
      setError('Email and password are required');
      return;
    }

    setIsLoading(true);
    try {
      if (!base) {
        setError('Backend URL is not configured. Set VITE_API_BASE_URL in Vercel and redeploy.');
        return;
      }

      const resp = await fetch(`${base}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      updateProfile(data.user);
      setAuthenticated(true);
      setCurrentStep('dashboard');

      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
      });

      navigate('/dashboard');
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Request OTP
  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!forgotEmail) {
      setError('Please enter your email');
      return;
    }

    setIsLoading(true);
    try {
      if (!base) {
        setError('Backend URL is not configured. Set VITE_API_BASE_URL in Vercel and redeploy.');
        return;
      }

      const resp = await fetch(`${base}/api/auth/forgot-password/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to send OTP');
        return;
      }

      if (data.devOtp) {
        setForgotDevOtp(data.devOtp);
      }

      setSuccessMessage(data.message || 'OTP sent to your email');
      setAuthStep('forgot-password-otp');
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  // Forgot Password: Verify OTP and Reset
  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');

    if (!forgotOtp) {
      setError('Please enter the OTP');
      return;
    }

    if (!newPassword || !confirmNewPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    try {
      if (!base) {
        setError('Backend URL is not configured. Set VITE_API_BASE_URL in Vercel and redeploy.');
        return;
      }

      const resp = await fetch(`${base}/api/auth/forgot-password/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotOtp,
          newPassword,
          confirmPassword: confirmNewPassword,
        }),
      });

      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Failed to reset password');
        return;
      }

      toast({
        title: 'Password Updated',
        description: 'Your password has been reset successfully. Please log in.',
      });

      // Reset to login form
      setAuthStep('login-form');
      setLoginForm({ email: forgotEmail, password: '' });
      setForgotEmail('');
      setForgotOtp('');
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err) {
      setError('Error: ' + String(err));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-hero opacity-10" />
      
      <div className="container relative mx-auto flex min-h-screen items-center justify-center px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-card"
        >
          {/* Header */}
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold text-foreground">
              {authStep.includes('signup') ? 'Create Account' : authStep.includes('forgot') ? 'Reset Password' : 'Sign In'}
            </h1>
            <p className="mt-2 text-muted-foreground">
              {authStep === 'signup-form' && 'Join Career Compass to discover your perfect career'}
              {authStep === 'signup-otp' && 'Verify your email address'}
              {authStep === 'login-form' && 'Welcome back! Sign in to your account'}
              {authStep === 'forgot-password-form' && 'Enter your email to reset your password'}
              {authStep === 'forgot-password-otp' && 'Verify your email and set a new password'}
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {successMessage && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{successMessage}</AlertDescription>
            </Alert>
          )}

          {/* Dev OTP Display for Testing */}
          {(devOtpDisplay || forgotDevOtp) && (
            <div className="mb-6 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <p className="font-semibold">Test OTP: <span className="font-mono font-bold">{devOtpDisplay || forgotDevOtp}</span></p>
              <p className="mt-1 text-xs">(Email delivery is not configured on this deployment, use this OTP to continue)</p>
            </div>
          )}

          {/* SIGNUP FORM */}
          {authStep === 'signup-form' && (
            <form onSubmit={handleSignupRequest} className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="password">Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    className="pl-10 pr-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Continue
              </Button>
            </form>
          )}

          {/* SIGNUP OTP VERIFICATION */}
          {authStep === 'signup-otp' && (
            <form onSubmit={handleSignupOtpVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to <strong>{signupForm.email}</strong>
              </p>

              <div>
                <Label htmlFor="otp">Verification Code</Label>
                <Input
                  id="otp"
                  placeholder="000000"
                  value={signupOtp}
                  onChange={(e) => setSignupOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  className="mt-1 text-center text-lg tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAuthStep('signup-form');
                    setSignupOtp('');
                    setDevOtpDisplay('');
                  }}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Verify
                </Button>
              </div>
            </form>
          )}

          {/* LOGIN FORM */}
          {authStep === 'login-form' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="login-email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={loginForm.email}
                    onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="login-password">Password</Label>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthStep('forgot-password-form');
                      setForgotEmail(loginForm.email);
                      setError('');
                      setSuccessMessage('');
                    }}
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="login-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={loginForm.password}
                    onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Sign In
              </Button>
            </form>
          )}

          {/* FORGOT PASSWORD FORM */}
          {authStep === 'forgot-password-form' && (
            <form onSubmit={handleForgotPasswordRequest} className="space-y-4">
              <div>
                <Label htmlFor="forgot-email">Email Address</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Send Reset Code
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  setAuthStep('login-form');
                  setError('');
                  setSuccessMessage('');
                }}
              >
                Back to Login
              </Button>
            </form>
          )}

          {/* FORGOT PASSWORD OTP & RESET */}
          {authStep === 'forgot-password-otp' && (
            <form onSubmit={handleForgotPasswordVerify} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                We've sent a verification code to <strong>{forgotEmail}</strong>
              </p>

              <div>
                <Label htmlFor="forgot-otp">Verification Code</Label>
                <Input
                  id="forgot-otp"
                  placeholder="000000"
                  value={forgotOtp}
                  onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  maxLength="6"
                  className="mt-1 text-center text-lg tracking-widest"
                />
              </div>

              <div>
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label htmlFor="confirm-new-password">Confirm New Password</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                  <Input
                    id="confirm-new-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="pl-10 pr-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setAuthStep('forgot-password-form');
                    setForgotOtp('');
                    setNewPassword('');
                    setConfirmNewPassword('');
                    setForgotDevOtp('');
                    setError('');
                    setSuccessMessage('');
                  }}
                >
                  Back
                </Button>
                <Button type="submit" className="flex-1" disabled={isLoading}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Reset Password
                </Button>
              </div>
            </form>
          )}

          {/* Footer Links */}
          <div className="mt-6 text-center text-sm text-muted-foreground">
            {authStep.includes('signup') ? (
              <>
                Already have an account?{' '}
                <button
                  onClick={() => {
                    setAuthStep('login-form');
                    setError('');
                    setSuccessMessage('');
                    setDevOtpDisplay('');
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign In
                </button>
              </>
            ) : authStep === 'login-form' ? (
              <>
                Don't have an account?{' '}
                <button
                  onClick={() => {
                    setAuthStep('signup-form');
                    setError('');
                    setSuccessMessage('');
                  }}
                  className="font-semibold text-primary hover:underline"
                >
                  Sign Up
                </button>
              </>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
