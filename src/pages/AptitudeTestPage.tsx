import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, GraduationCap, Brain, Sigma } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/store/useAppStore';
import { useToast } from '@/hooks/use-toast';
import { aptitudeQuestions } from '@/lib/mockData';
import { getApiBaseUrl } from '@/lib/api';
import { AptitudeResponse, LogicalResponse } from '@/types/career';

type AptitudeQuestion = {
  id: string;
  category: AptitudeResponse['category'];
  question: string;
};

type CodingQuestion = {
  id: string;
  type: 'coding';
  domain: string;
  language: string;
  difficulty: string;
  title: string;
  description: string;
  problem: string;
  examples: { input: string; output: string }[];
  boilerplate: string;
  category: 'coding';
};

type LogicalQuestion = {
  id: string;
  topic: 'quantitative' | 'qualitative';
  question: string;
  options: string[];
  correctAnswer: string;
};

const logicalQuestions: LogicalQuestion[] = [
  { id: 'logic-1', topic: 'quantitative', question: 'If a train travels 120 km in 2 hours, what is its speed per hour?', options: ['40 km/h', '50 km/h', '60 km/h', '70 km/h'], correctAnswer: '60 km/h' },
  { id: 'logic-2', topic: 'quantitative', question: 'A shop gives 20% discount on a 500 rupee item. What is the final price?', options: ['350', '375', '400', '425'], correctAnswer: '400' },
];

export default function AptitudeTestPage() {
  const navigate = useNavigate();
  const { profile, updateProfile, setCurrentStep } = useAppStore();
  const { toast } = useToast();
  const base = getApiBaseUrl();

  const [stage, setStage] = useState<'aptitude' | 'logical'>('aptitude');
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [aptitudeResponsesMap, setAptitudeResponsesMap] = useState<Record<string, number>>({});
  const [logicalResponsesMap, setLogicalResponsesMap] = useState<Record<string, string>>({});
  const [questions, setQuestions] = useState<AptitudeQuestion[]>(aptitudeQuestions.slice(0, 10));
  const [codingQuestions, setCodingQuestions] = useState<CodingQuestion[]>([]);
  const [codeOutput, setCodeOutput] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchQuestions = async () => {
      try {
        const response = await fetch(`${base}/api/questionnaire?userId=${encodeURIComponent(profile?.id || 'user-1')}&email=${encodeURIComponent(profile?.email || '')}`);
        if (!response.ok) throw new Error('Unable to load questionnaire');
        const data = await response.json();
        
        // Handle new format with metadata
        if (data.questions && Array.isArray(data.questions)) {
          const technicalQuestions = data.questions.filter((q: any) => q.type === 'mcq').slice(0, 13);
          const coding = data.questions.filter((q: any) => q.type === 'coding').slice(0, 2);
          setQuestions(technicalQuestions);
          setCodingQuestions(coding);
        } else if (Array.isArray(data) && data.length > 0) {
          // Handle old format for backwards compatibility
          setQuestions(data.slice(0, 13));
          setCodingQuestions([]);
        } else {
          setQuestions(aptitudeQuestions.slice(0, 13));
          setCodingQuestions([]);
        }
      } catch {
        setQuestions(aptitudeQuestions.slice(0, 13));
        setCodingQuestions([]);
      }
    };

    void fetchQuestions();
  }, [base, profile?.email, profile?.id]);

  // Use coding questions if available, otherwise fall back to logical questions
  const questionsForStage2 = codingQuestions.length > 0 ? codingQuestions : logicalQuestions;
  const isCodingStage = codingQuestions.length > 0;

  const totalQuestions = questions.length + questionsForStage2.length;
  const answeredCount = Object.keys(aptitudeResponsesMap).length + Object.keys(logicalResponsesMap).length;
  const progress = totalQuestions ? (answeredCount / totalQuestions) * 100 : 0;
  const currentAptitudeQuestion = questions[currentQuestion] || questions[0];
  const currentLogicalQuestion = questionsForStage2[currentQuestion] || questionsForStage2[0];

  const stageTitle = useMemo(
    () => stage === 'aptitude' ? 'Domain-Based Aptitude Assessment' : isCodingStage ? 'Coding & Activities' : 'Logical Assessment',
    [stage, isCodingStage]
  );

  const handleAptitudeAnswer = (value: number | string) => {
    const question = currentAptitudeQuestion;
    if (!question) return;

    // Store the answer (either index for MCQ or Likert value)
    setAptitudeResponsesMap((prev) => ({ ...prev, [question.id]: value }));

    // Auto-advance to next question
    if (currentQuestion < questions.length - 1) {
      setTimeout(() => setCurrentQuestion((prev) => prev + 1), 220);
      return;
    }

    // All questions done, move to logical stage
    setTimeout(() => {
      setStage('logical');
      setCurrentQuestion(0);
    }, 220);
  };

  const handleLogicalAnswer = (value: string) => {
    const question = currentLogicalQuestion;
    if (!question) return;

    setLogicalResponsesMap((prev) => ({ ...prev, [question.id]: value }));

    if (currentQuestion < questionsForStage2.length - 1) {
      setTimeout(() => setCurrentQuestion((prev) => prev + 1), 220);
    }
  };

  const handleRunCode = async () => {
    const code = logicalResponsesMap[currentLogicalQuestion.id];
    if (!code) {
      toast({
        title: 'Empty Code',
        description: 'Please write some code before running',
      });
      return;
    }

    setIsRunning(true);
    try {
      const response = await fetch(`${base}/api/code/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language: (currentLogicalQuestion as CodingQuestion).language,
          questionId: currentLogicalQuestion.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to execute code');
      }

      const result = await response.json();
      setCodeOutput(result.output || 'No output');
      
      if (result.success) {
        toast({
          title: '✓ Code Executed',
          description: 'Code has been executed successfully',
        });
      }
    } catch (error) {
      setCodeOutput(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast({
        title: 'Execution Error',
        description: 'Failed to execute code',
        variant: 'destructive',
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmit = async () => {
    // Check if user has answered or skipped all questions
    const answeredAptitude = Object.keys(aptitudeResponsesMap).length === questions.length;
    const answeredLogical = Object.keys(logicalResponsesMap).length === questionsForStage2.length;
    
    if (!answeredAptitude || !answeredLogical) {
      toast({
        title: 'Incomplete Assessment',
        description: 'Please answer or skip all questions before continuing.',
        variant: 'destructive',
      });
      return;
    }

    const aptitudeResponses: AptitudeResponse[] = questions.map((q) => ({
      questionId: q.id,
      category: q.category,
      answer: aptitudeResponsesMap[q.id],
    }));

    const categoryTotals: Record<string, { sum: number; count: number }> = {};
    aptitudeResponses.forEach((resp) => {
      if (!categoryTotals[resp.category]) {
        categoryTotals[resp.category] = { sum: 0, count: 0 };
      }
      categoryTotals[resp.category].sum += resp.answer;
      categoryTotals[resp.category].count += 1;
    });

    const aptitude = Object.fromEntries(
      Object.entries(categoryTotals).map(([category, total]) => [
        category,
        Number((total.sum / total.count).toFixed(2)),
      ])
    );

    const logicalResponses: LogicalResponse[] = logicalQuestions.map((q) => ({
      questionId: q.id,
      topic: q.topic,
      answer: logicalResponsesMap[q.id],
      isCorrect: logicalResponsesMap[q.id] === q.correctAnswer,
    }));

    const logicalCorrect = logicalResponses.filter((item) => item.isCorrect).length;
    const logicalScore = Math.round((logicalCorrect / logicalQuestions.length) * 100);

    setIsLoading(true);
    try {
      const response = await fetch(`${base}/api/questionnaire/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile?.id,
          email: profile?.email,
          answers: aptitudeResponses,
          aptitude,
          logicalResponses,
          logicalScore,
        }),
      });

      if (!response.ok) {
        throw new Error('Unable to submit assessment');
      }

      updateProfile({ aptitudeResponses, aptitude, logicalResponses, logicalScore });
      setCurrentStep('dashboard');

      toast({
        title: 'Assessment Complete!',
        description: 'Your aptitude and logical thinking results were saved successfully.',
      });

      navigate('/dashboard');
    } catch {
      toast({
        title: 'Submission Failed',
        description: 'There was an issue saving your assessment. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const canGoPrevious = currentQuestion > 0 || stage === 'logical';
  const isLastLogicalQuestion = stage === 'logical' && currentQuestion === questionsForStage2.length - 1;

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto max-w-3xl px-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
              <GraduationCap className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-display text-xl font-bold text-foreground">CareerPath</span>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-foreground">{answeredCount}/{totalQuestions} completed</p>
            <p className="text-xs text-muted-foreground">{stage === 'aptitude' ? 'Stage 1 of 2' : 'Stage 2 of 2'}</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl border border-border bg-card p-8 shadow-card"
        >
          <div className="mb-8">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {stage === 'aptitude' ? <Brain className="h-5 w-5 text-primary" /> : <Sigma className="h-5 w-5 text-primary" />}
                <span className="font-medium text-foreground">{stageTitle}</span>
              </div>
              <span className="text-sm text-muted-foreground">
                Question {currentQuestion + 1} of {stage === 'aptitude' ? questions.length : questionsForStage2.length}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          <AnimatePresence mode="wait">
            {stage === 'aptitude' ? (
              <motion.div
                key={currentAptitudeQuestion?.id || 'aptitude-empty'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <div className="mb-2 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                  {currentAptitudeQuestion?.category}
                </div>
                <h2 className="mb-8 font-display text-2xl font-bold text-foreground">
                  {currentAptitudeQuestion?.question}
                </h2>

                <div className="space-y-3">
                  {(currentAptitudeQuestion as any)?.options ? (
                    // MCQ with actual options from backend
                    (currentAptitudeQuestion as any).options.map((option: string, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => handleAptitudeAnswer(idx)}
                        className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                          aptitudeResponsesMap[currentAptitudeQuestion.id] === idx
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors ${
                          aptitudeResponsesMap[currentAptitudeQuestion.id] === idx
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <span className="font-medium text-foreground">{option}</span>
                      </button>
                    ))
                  ) : (
                    // Fallback to Likert scale if no options
                    [
                      { value: 1, label: 'Strongly Disagree' },
                      { value: 2, label: 'Disagree' },
                      { value: 3, label: 'Neutral' },
                      { value: 4, label: 'Agree' },
                      { value: 5, label: 'Strongly Agree' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        onClick={() => handleAptitudeAnswer(option.value)}
                        className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                          aptitudeResponsesMap[currentAptitudeQuestion.id] === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border'
                        }`}
                      >
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold transition-colors ${
                          aptitudeResponsesMap[currentAptitudeQuestion.id] === option.value
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-foreground'
                        }`}>
                          {option.value}
                        </div>
                        <span className="font-medium text-foreground">{option.label}</span>
                      </button>
                    ))
                  )}
                </div>
                
                <div className="mt-4 flex items-center justify-between">
                  <div className="text-xs text-muted-foreground">
                    {aptitudeResponsesMap[currentAptitudeQuestion.id] !== 'SKIPPED' ? (
                      '✓ Question answered'
                    ) : (
                      '⊘ Question skipped'
                    )}
                  </div>
                  <button
                    onClick={() => {
                      setAptitudeResponsesMap((prev) => ({ ...prev, [currentAptitudeQuestion.id]: 'SKIPPED' }));
                      if (currentQuestion < questions.length - 1) {
                        setTimeout(() => setCurrentQuestion((prev) => prev + 1), 220);
                        return;
                      }
                      setTimeout(() => {
                        setStage('logical');
                        setCurrentQuestion(0);
                      }, 220);
                    }}
                    className="rounded bg-gray-600 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700"
                  >
                    ⊘ Skip Question
                  </button>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key={currentLogicalQuestion?.id || 'logical-empty'}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {isCodingStage && (currentLogicalQuestion as CodingQuestion)?.type === 'coding' ? (
                  <>
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                          {(currentLogicalQuestion as CodingQuestion).language}
                        </span>
                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700 capitalize">
                          {(currentLogicalQuestion as CodingQuestion).difficulty}
                        </span>
                        {logicalResponsesMap[currentLogicalQuestion.id] === 'SKIPPED' && (
                          <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-medium text-yellow-700">
                            ⊘ Skipped
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <h2 className="mb-2 font-display text-2xl font-bold text-foreground">
                      {(currentLogicalQuestion as any).title}
                    </h2>
                    
                    <p className="mb-4 text-sm text-muted-foreground">
                      {(currentLogicalQuestion as any).description}
                    </p>

                    <div className="mb-4 rounded-lg bg-muted p-4">
                      <h3 className="mb-2 font-semibold text-foreground">Problem:</h3>
                      <p className="text-sm leading-relaxed text-foreground">
                        {(currentLogicalQuestion as any).problem}
                      </p>
                    </div>

                    {(currentLogicalQuestion as any).examples?.length > 0 && (
                      <div className="mb-4 rounded-lg bg-muted p-4">
                        <h3 className="mb-3 font-semibold text-foreground">Examples:</h3>
                        <div className="space-y-2">
                          {(currentLogicalQuestion as any).examples.map((ex: { input: string; output: string }, idx: number) => (
                            <div key={idx} className="rounded border border-border bg-background p-2 text-xs font-mono">
                              <div className="text-muted-foreground">Input: {ex.input}</div>
                              <div className="text-green-600">Output: {ex.output}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mb-4 rounded-lg border border-border bg-black p-3">
                      <div className="mb-2 flex items-center justify-between">
                        <label className="text-xs font-semibold text-gray-300">Code Editor</label>
                        <div className="flex gap-2">
                          <button
                            onClick={handleRunCode}
                            disabled={isRunning}
                            className="rounded bg-green-600 px-3 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:bg-gray-600"
                          >
                            {isRunning ? '⏳ Running...' : '▶ Run Code'}
                          </button>
                          <button
                            onClick={() => {
                              setLogicalResponsesMap((prev) => ({ ...prev, [currentLogicalQuestion.id]: 'SKIPPED' }));
                              if (currentQuestion < questionsForStage2.length - 1) {
                                setTimeout(() => setCurrentQuestion((prev) => prev + 1), 220);
                              }
                            }}
                            className="rounded bg-gray-600 px-3 py-1 text-xs font-semibold text-white hover:bg-gray-700"
                          >
                            ⊘ Skip
                          </button>
                        </div>
                      </div>
                      <textarea
                        value={
                          logicalResponsesMap[currentLogicalQuestion.id] === 'SKIPPED'
                            ? (currentLogicalQuestion as any).boilerplate || ''
                            : logicalResponsesMap[currentLogicalQuestion.id] || (currentLogicalQuestion as any).boilerplate || ''
                        }
                        onChange={(e) => handleLogicalAnswer(e.target.value)}
                        className="h-64 w-full resize-none rounded bg-gray-900 font-mono text-sm text-green-400 placeholder-gray-500"
                        placeholder="Write your code here..."
                      />
                      
                      {codeOutput && (
                        <div className="mt-3 rounded bg-gray-900 p-2">
                          <div className="text-xs font-semibold text-gray-300">Output:</div>
                          <div className="mt-1 font-mono text-xs text-green-400 whitespace-pre-wrap break-words">
                            {codeOutput}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="text-xs text-muted-foreground">
                      💡 Hint: Start with the provided boilerplate code or click "Skip" if you want to move to the next question
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-2 inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium capitalize text-muted-foreground">
                      {(currentLogicalQuestion as LogicalQuestion)?.topic}
                    </div>
                    <h2 className="mb-8 font-display text-2xl font-bold text-foreground">
                      {currentLogicalQuestion?.question}
                    </h2>

                    <div className="space-y-3">
                      {(currentLogicalQuestion as LogicalQuestion)?.options?.map((option) => (
                        <button
                          key={option}
                          onClick={() => handleLogicalAnswer(option)}
                          className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all hover:border-primary hover:bg-primary/5 ${
                            logicalResponsesMap[currentLogicalQuestion.id] === option
                              ? 'border-primary bg-primary/10'
                              : 'border-border'
                          }`}
                        >
                          <div className={`h-4 w-4 rounded-full ${
                            logicalResponsesMap[currentLogicalQuestion.id] === option ? 'bg-primary' : 'bg-muted'
                          }`} />
                          <span className="font-medium text-foreground">{option}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-8 flex justify-between">
            <Button
              variant="ghost"
              onClick={() => {
                if (stage === 'logical' && currentQuestion === 0) {
                  setStage('aptitude');
                  setCurrentQuestion(questions.length - 1);
                } else if (currentQuestion > 0) {
                  setCurrentQuestion((prev) => prev - 1);
                } else {
                  navigate('/onboarding/profile');
                }
              }}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              {canGoPrevious ? 'Previous' : 'Back to Profile'}
            </Button>

            {isLastLogicalQuestion ? (
              <Button
                onClick={handleSubmit}
                size="lg"
                disabled={!logicalResponsesMap[currentLogicalQuestion.id] || isLoading}
              >
                {isLoading ? 'Submitting...' : 'Complete Assessment'}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (stage === 'logical' && logicalResponsesMap[currentLogicalQuestion.id]) {
                    setCurrentQuestion((prev) => prev + 1);
                  }
                }}
                disabled={stage !== 'logical' || !logicalResponsesMap[currentLogicalQuestion.id]}
              >
                Next Question
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
