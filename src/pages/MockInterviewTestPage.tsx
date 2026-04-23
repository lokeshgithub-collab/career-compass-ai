import { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { getApiBaseUrl } from '@/lib/api';

type MCQQuestion = {
  question: string;
  options: string[];
  answerIndex: number;
};

const getQuestionsForDomain = (domain: string): MCQQuestion[] => {
  const normalized = domain.toLowerCase();
  if (normalized.includes('qa')) {
    return [
      {
        question: 'Which phase of software testing focuses on finding integration issues between modules?',
        options: ['Unit Testing', 'Integration Testing', 'System Testing', 'Acceptance Testing'],
        answerIndex: 1,
      },
      {
        question: 'What is the primary goal of regression testing?',
        options: [
          'Validate new features',
          'Check performance',
          'Ensure changes did not break existing behavior',
          'Verify UI consistency',
        ],
        answerIndex: 2,
      },
      {
        question: 'Which test type verifies how the system behaves under high load?',
        options: ['Smoke Testing', 'Stress Testing', 'Sanity Testing', 'Alpha Testing'],
        answerIndex: 1,
      },
      {
        question: 'Which artifact maps requirements to test cases and execution status?',
        options: ['Traceability matrix', 'Sprint retrospective', 'Bug bash note', 'Release branch'],
        answerIndex: 0,
      },
      {
        question: 'What should a good automation suite prioritize first?',
        options: ['Random UI animation paths', 'Critical user journeys repeated often', 'Only admin pages', 'One-time migration scripts'],
        answerIndex: 1,
      },
      {
        question: 'A flaky test primarily harms:',
        options: ['Design consistency', 'Trust in automation results', 'IDE startup speed', 'Repository size'],
        answerIndex: 1,
      },
    ];
  }
  if (normalized.includes('data') || normalized.includes('analytics')) {
    return [
      {
        question: 'What is the purpose of feature engineering in machine learning?',
        options: [
          'Scale models for deployment',
          'Create new input variables from raw data',
          'Build user interfaces',
          'Optimize SQL queries'],
        answerIndex: 1,
      },
      {
        question: 'Which metric is best for imbalanced classification?',
        options: ['Accuracy', 'Precision', 'Recall', 'F1 Score'],
        answerIndex: 3,
      },
      {
        question: 'What does ETL stand for?',
        options: ['Evaluate, Transform, Load', 'Extract, Transform, Load', 'Encrypt, Transfer, Log', 'Execute, Test, Launch'],
        answerIndex: 1,
      },
      {
        question: 'Why is a validation set used in model development?',
        options: ['To replace training data', 'To tune models before final testing', 'To increase feature count', 'To avoid preprocessing'],
        answerIndex: 1,
      },
      {
        question: 'Which SQL clause filters aggregated results?',
        options: ['WHERE', 'JOIN', 'HAVING', 'LIMIT'],
        answerIndex: 2,
      },
      {
        question: 'A confusion matrix is mainly used for evaluating:',
        options: ['Classification models', 'Cloud spend', 'Data pipelines', 'API schemas'],
        answerIndex: 0,
      },
    ];
  }
  if (normalized.includes('product') || normalized.includes('pm')) {
    return [
      {
        question: 'What is the most important outcome of a good product roadmap?',
        options: ['Marketing buzz', 'Clear customer value and priorities', 'More meetings', 'Higher revenue immediately'],
        answerIndex: 1,
      },
      {
        question: 'Which artifact helps align stakeholders on product vision?',
        options: ['Competitive analysis', 'User story map', 'Code review', 'System architecture'],
        answerIndex: 1,
      },
      {
        question: 'A good MVP should:',
        options: ['Include every desired feature', 'Be launched without testing', 'Solve one core user problem', 'Focus on design only'],
        answerIndex: 2,
      },
      {
        question: 'Which metric best reflects activation?',
        options: ['Users completing a key first success action', 'Number of meetings', 'Logo impressions', 'Total status emails'],
        answerIndex: 0,
      },
      {
        question: 'What is the purpose of stakeholder alignment?',
        options: ['Remove all disagreement instantly', 'Create shared clarity on priorities and tradeoffs', 'Skip research', 'Delay shipping'],
        answerIndex: 1,
      },
      {
        question: 'Which is the strongest reason to reject a feature request?',
        options: ['It came from one user', 'It does not align with the problem or strategy', 'It needs design work', 'It sounds difficult'],
        answerIndex: 1,
      },
    ];
  }
  return [
    {
      question: 'Which of the following best describes a strong technical interview answer?',
      options: ['A short yes/no response', 'A structured answer with examples', 'An unrelated story', 'A single buzzword'],
      answerIndex: 1,
    },
    {
      question: 'What should you emphasize when answering a design question?',
      options: ['Only the final solution', 'The tradeoffs and decision process', 'That you wrote all code yourself', 'That you prefer one framework'],
      answerIndex: 1,
    },
    {
      question: 'If a question asks for an assumption, you should:',
      options: ['Ignore it', 'Make a reasonable assumption and state it', 'Ask the interviewer to choose', 'Use a random assumption'],
      answerIndex: 1,
    },
    {
      question: 'What is the best recovery when you get stuck in an interview?',
      options: ['Stay silent', 'Explain your thinking and reset with a smaller case', 'Switch topics', 'Guess instantly'],
      answerIndex: 1,
    },
    {
      question: 'Why do interviewers ask follow-up questions?',
      options: ['To waste time', 'To test depth, clarity, and reasoning', 'To avoid evaluation', 'To force memorized answers'],
      answerIndex: 1,
    },
    {
      question: 'A professional technical answer should include:',
      options: ['Only jargon', 'Context, reasoning, tradeoffs, and conclusion', 'A very long story', 'A framework name only'],
      answerIndex: 1,
    },
  ];
};

const formatTime = (seconds: number) => {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return `${minutes}:${String(remainder).padStart(2, '0')}`;
};

export default function MockInterviewTestPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const company = params.get('company') || 'custom';
  const domain = params.get('domain') || 'qa testing';
  const email = params.get('email') || '';
  const sessionId = params.get('sessionId') || '';
  const base = getApiBaseUrl();

  const questions = useMemo(() => getQuestionsForDomain(domain), [domain]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [timeLeft, setTimeLeft] = useState(180);
  const [status, setStatus] = useState<'active' | 'finished'>('active');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (status !== 'active') return;
    const timer = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setStatus('finished');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  useEffect(() => {
    if (status === 'finished' && !submittedRef.current) {
      void completeTest();
    }
  }, [status]);

  const currentQuestion = questions[currentIndex];

  const handleAnswer = () => {
    if (selectedOption === null) return;
    setAnswers((prev) => [...prev, selectedOption]);
    setSelectedOption(null);
    if (currentIndex + 1 >= questions.length) {
      setStatus('finished');
      return;
    }
    setCurrentIndex((prev) => prev + 1);
  };

  const completeTest = async () => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setLoading(true);
    try {
      const finalAnswers = [...answers];
      if (selectedOption !== null && finalAnswers.length < questions.length) {
        finalAnswers.push(selectedOption);
      }
      const correct = finalAnswers.reduce((sum, answerIndex, index) => {
        const question = questions[index];
        return sum + (question?.answerIndex === answerIndex ? 1 : 0);
      }, 0);
      const totalScore = questions.length;
      const percentage = Math.round((correct / totalScore) * 100);
      const resp = await fetch(`${base}/api/interview/mcq/result`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          company,
          domain,
          email,
          candidateName: 'Candidate',
          answers: finalAnswers,
          score: percentage,
          totalScore: 100,
        }),
      });
      const data = await resp.json();
      setResult({
        ...data,
        score: percentage,
        correct,
        totalQuestions: totalScore,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    navigate('/mock-interview');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-6 shadow-card">
          <h1 className="font-display text-3xl font-bold text-foreground">Timed MCQ Interview</h1>
          <p className="text-sm text-muted-foreground">
            Company: {company.toUpperCase()} · Domain: {domain} · Time remaining: {formatTime(timeLeft)}
          </p>
        </div>

        {!result ? (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <div className="mb-4 rounded-md bg-muted/60 p-4">
              <p className="text-sm font-medium text-foreground">Question {currentIndex + 1} of {questions.length}</p>
              <p className="mt-2 text-sm text-muted-foreground">Answer the question by selecting the best option below.</p>
            </div>
            <div className="space-y-4">
              <div className="rounded-md bg-background p-4 text-sm text-foreground">
                {currentQuestion.question}
              </div>
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <button
                    key={option}
                    type="button"
                    className={`w-full rounded-lg border px-4 py-3 text-left text-sm transition ${
                      selectedOption === index ? 'border-primary bg-primary/10' : 'border-border bg-background'
                    }`}
                    onClick={() => setSelectedOption(index)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted-foreground">Time remaining: {formatTime(timeLeft)}</p>
              <Button disabled={selectedOption === null || loading} onClick={handleAnswer}>
                {currentIndex + 1 >= questions.length ? 'Submit Test' : 'Next Question'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-border bg-card p-6 shadow-card">
            <h2 className="font-display text-2xl font-semibold text-foreground">Test Complete</h2>
            <p className="mt-2 text-sm text-muted-foreground">Your result has been submitted and emailed if SMTP is configured.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-md bg-muted/60 p-4 text-sm">
                <p className="text-muted-foreground">Score</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{result.score}%</p>
              </div>
              <div className="rounded-md bg-muted/60 p-4 text-sm">
                <p className="text-muted-foreground">Result</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{result.decision}</p>
              </div>
              <div className="rounded-md bg-muted/60 p-4 text-sm">
                <p className="text-muted-foreground">Correct Answers</p>
                <p className="mt-2 text-xl font-semibold text-foreground">{result.correct}/{result.totalQuestions}</p>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={restart}>Back to Interview Hub</Button>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
