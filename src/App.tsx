/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  ChevronRight, 
  Trophy, 
  Timer, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  BrainCircuit,
  ArrowLeft,
  GraduationCap,
  Atom,
  FlaskConical,
  Dna,
  Calculator,
  Upload,
  FileText,
  X,
  Sun,
  Moon,
  PlayCircle,
  Sparkles,
  Layout,
  BarChart3,
  PieChart as PieChartIcon,
  Clock,
  Target,
  TrendingUp,
  Zap,
  Copy,
  Link
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie,
  LineChart,
  Line,
  Legend
} from 'recharts';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Question, Language, ExamType } from './types';
import { generateQuestions } from './services/geminiService';
import { cn } from './utils';
import { DPPView } from './DPPView';

const SUBJECTS = [
  { 
    id: 'Physics', 
    icon: Atom, 
    color: 'text-cyan-600', 
    bg: 'bg-cyan-50', 
    border: 'border-cyan-100',
    darkBg: 'bg-cyan-950/20',
    darkBorder: 'border-cyan-900/50'
  },
  { 
    id: 'Chemistry', 
    icon: FlaskConical, 
    color: 'text-amber-600', 
    bg: 'bg-amber-50', 
    border: 'border-amber-100',
    darkBg: 'bg-amber-950/20',
    darkBorder: 'border-amber-900/50'
  },
  { 
    id: 'Biology', 
    icon: Dna, 
    color: 'text-rose-600', 
    bg: 'bg-rose-50', 
    border: 'border-rose-100',
    darkBg: 'bg-rose-950/20',
    darkBorder: 'border-rose-900/50'
  },
  { 
    id: 'Mathematics', 
    icon: Calculator, 
    color: 'text-fuchsia-600', 
    bg: 'bg-fuchsia-50', 
    border: 'border-fuchsia-100',
    darkBg: 'bg-fuchsia-950/20',
    darkBorder: 'border-fuchsia-900/50'
  },
  { 
    id: 'JEE Main Mock', 
    icon: Layout, 
    color: 'text-indigo-600', 
    bg: 'bg-indigo-50', 
    border: 'border-indigo-100',
    darkBg: 'bg-indigo-950/20',
    darkBorder: 'border-indigo-900/50'
  },
  { 
    id: 'NEET 2026 Mock', 
    icon: Layout, 
    color: 'text-rose-600', 
    bg: 'bg-rose-50', 
    border: 'border-rose-100',
    darkBg: 'bg-rose-950/20',
    darkBorder: 'border-rose-900/50'
  },
];

const LANGUAGES: { id: Language; label: string }[] = [
  { id: 'English', label: 'English Medium' },
  { id: 'Hindi', label: 'Hindi Medium' },
];

const EXAM_TYPES: { id: ExamType; label: string; desc: string }[] = [
  { id: 'NEET', label: 'NEET Exam', desc: 'Based on previous year patterns' },
  { id: 'JEE', label: 'JEE Exam', desc: '2019-2025 PYQ Pattern' },
  { id: 'Combined', label: '12th Board Exam', desc: 'Based on NCERT and previous year' },
  { id: 'JEE_BOOKS', label: 'JEE Exam question from books', desc: 'Standard textbook problems' },
  { id: 'NEET_BOOKS', label: 'Neet Exam question from books', desc: 'NCERT & Reference book level' },
  { id: 'MS_CHOUHAN', label: 'M.S. Chouhan Organic', desc: 'Advanced Organic Chemistry Problems' },
  { id: 'BLACK_BOOK', label: 'Black Book Math', desc: 'Advanced Problems in Mathematics for JEE' },
  { id: 'NARENDRA_AVASTHI', label: 'N. Avasthi Physical', desc: 'Problems in Physical Chemistry for JEE' },
  { id: 'JEE_MAIN_MOCK', label: 'JEE Main 2026 Mock', desc: 'Customizable Qs (P, C, M) | 3 Hours | +4/-1' },
  { id: 'NEET_MOCK', label: 'NEET 2026 Mock', desc: 'Customizable Qs | 3h 20m | 2025-Style Conceptual Difficulty' },
  { id: 'DPP', label: 'Daily Practice Paper', desc: 'Custom DPP from your notes or syllabus' },
];

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<'home' | 'quiz' | 'results' | 'report' | 'ready' | 'dpp'>('home');
  const [language, setLanguage] = useState<Language>('English');
  const [examType, setExamType] = useState<ExamType>('NEET');
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<(number | string | null)[]>([]);
  const [loading, setLoading] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<{ name: string, data: string, mimeType: string }[]>([]);
  const [questionCount, setQuestionCount] = useState(15);
  const [isDragging, setIsDragging] = useState(false);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [lastQuestionStartTime, setLastQuestionStartTime] = useState<number>(0);
  const [timeLimit, setTimeLimit] = useState(0);
  const reportRef = React.useRef<HTMLDivElement>(null);

  // Handle shareable links
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const subjectParam = params.get('subject');
    const examTypeParam = params.get('examType') as ExamType;
    
    if (subjectParam && examTypeParam) {
      setExamType(examTypeParam);
      setSelectedSubject(subjectParam);
      // We don't auto-start to avoid accidental API calls on every load, 
      // but we could if we wanted to. Let's just pre-select.
    }
  }, []);

  // Auto-set question count for Mock Tests
  useEffect(() => {
    if (examType === 'JEE_MAIN_MOCK' || selectedSubject === 'JEE Main Mock') {
      setQuestionCount(75);
    } else if (examType === 'NEET_MOCK' || selectedSubject === 'NEET 2026 Mock') {
      setQuestionCount(200);
    }
  }, [examType, selectedSubject]);

  // Timer logic
  useEffect(() => {
    let interval: number;
    if (view === 'quiz') {
      interval = window.setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setTimeElapsed(elapsed);
        
        // Auto-end quiz if time limit reached
        if (timeLimit > 0 && elapsed >= timeLimit) {
          setView('results');
          clearInterval(interval);
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [view, startTime, timeLimit]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => {
    const files = 'target' in e ? (e.target as HTMLInputElement).files : (e as React.DragEvent).dataTransfer.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach(file => {
      if (file.size > 20 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Please upload files smaller than 20MB.`);
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setUploadedFiles(prev => [...prev, {
          name: file.name,
          data: base64,
          mimeType: file.type
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetQuiz = () => {
    setView('home');
    setSelectedSubject(null);
    setQuestions([]);
    setCurrentIndex(0);
    setUserAnswers([]);
    setStartTime(0);
    setTimeElapsed(0);
    setQuestionTimes([]);
    setLastQuestionStartTime(0);
  };

  const beginTest = () => {
    setStartTime(Date.now());
    setLastQuestionStartTime(Date.now());
    setView('quiz');
  };

  const startQuiz = async (subject: string, overrideExamType?: ExamType) => {
    setLoading(true);
    setSelectedSubject(subject);
    try {
      // Small initial delay to ensure quota is fresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let displaySubject = subject;
      let currentExamType = overrideExamType || examType;
      let currentCount = questionCount;

      let qs: Question[] = [];
      
      if (subject === 'JEE Main Mock' || examType === 'JEE_MAIN_MOCK') {
        // Parallel generation for JEE Mock subjects
        const subjects = ['Physics', 'Chemistry', 'Mathematics'];
        const countPerSubject = Math.floor(currentCount / 3);
        const remainder = currentCount % 3;
        
        const subjectPromises = subjects.map((sub, i) => {
          const subCount = countPerSubject + (i < remainder ? 1 : 0);
          if (subCount > 0) {
            return generateQuestions(sub, language, 'JEE_MAIN_MOCK', subCount, undefined);
          }
          return Promise.resolve([]);
        });

        const results = await Promise.all(subjectPromises);
        qs = results.flat();
      } else if (subject === 'NEET 2026 Mock' || examType === 'NEET_MOCK') {
        // Parallel generation for NEET Mock subjects
        const subjectConfigs = [
          { name: 'Physics' },
          { name: 'Chemistry' },
          { name: 'Biology (Botany)' },
          { name: 'Biology (Zoology)' }
        ];
        const countPerSubject = Math.floor(currentCount / 4);
        const remainder = currentCount % 4;

        const subjectPromises = subjectConfigs.map((config, i) => {
          const subCount = countPerSubject + (i < remainder ? 1 : 0);
          if (subCount > 0) {
            return generateQuestions(config.name, language, 'NEET_MOCK', subCount, undefined);
          }
          return Promise.resolve([]);
        });

        const results = await Promise.all(subjectPromises);
        qs = results.flat();
      } else {
        if (examType === 'MS_CHOUHAN') displaySubject = 'Organic Chemistry';
        if (examType === 'BLACK_BOOK') displaySubject = 'Mathematics';
        if (examType === 'NARENDRA_AVASTHI') displaySubject = 'Physical Chemistry';
        
        qs = await generateQuestions(
          displaySubject, 
          language,
          currentExamType,
          currentCount, 
          uploadedFiles.length > 0 ? uploadedFiles.map(f => ({ data: f.data, mimeType: f.mimeType })) : undefined
        );
      }
      
      setQuestions(qs);
      setUserAnswers(new Array(qs.length).fill(null));
      setQuestionTimes(new Array(qs.length).fill(0));
      setCurrentIndex(0);
      setTimeElapsed(0);
      
      let minutesPerQuestion = (examType === 'NEET' || examType === 'NEET_BOOKS') ? 1 : 2;
      if (currentExamType === 'JEE_MAIN_MOCK') {
        setTimeLimit(180 * 60); // 3 hours
      } else if (currentExamType === 'NEET_MOCK') {
        setTimeLimit(200 * 60); // 3 hours 20 minutes (200 minutes)
      } else {
        setTimeLimit(currentCount * minutesPerQuestion * 60);
      }
      
      if (currentExamType === 'DPP') {
        setView('dpp');
      } else {
        setView('ready');
      }
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      let errorMessage = "Failed to load questions. ";
      
      if (error?.message?.includes("Rpc failed") || error?.message?.includes("xhr error")) {
        errorMessage += "The JonyBhai service is currently experiencing high latency. We've tried retrying, but the connection is still unstable. Please try again in a few moments.";
      } else if (error?.status === "RESOURCE_EXHAUSTED" || error?.message?.includes("429") || error?.message?.includes("quota")) {
        errorMessage = "API Rate Limit Exceeded. You've made too many requests in a short time. Please wait about 60 seconds and try again.";
      } else if (error?.message?.includes("exceeds the supported page limit of 1000")) {
        errorMessage = "The uploaded document is too large. Gemini API supports a maximum of 1000 pages per document. Please upload a smaller file or split your PDF.";
      } else if (error?.message?.includes("INTERNAL") || error?.status === "INTERNAL") {
        errorMessage += "The JonyBhai service encountered an internal error. This often happens if the request is too complex. Try selecting a specific subject or uploading a smaller file.";
      } else {
        errorMessage += "Please ensure your internet connection is stable and try again.";
      }
      
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer: number | string) => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = answer;
    setUserAnswers(newAnswers);
  };

  const nextQuestion = () => {
    const now = Date.now();
    const timeSpent = Math.floor((now - lastQuestionStartTime) / 1000);
    const newTimes = [...questionTimes];
    newTimes[currentIndex] += timeSpent;
    setQuestionTimes(newTimes);
    setLastQuestionStartTime(now);

    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setView('results');
    }
  };

  const prevQuestion = () => {
    const now = Date.now();
    const timeSpent = Math.floor((now - lastQuestionStartTime) / 1000);
    const newTimes = [...questionTimes];
    newTimes[currentIndex] += timeSpent;
    setQuestionTimes(newTimes);
    setLastQuestionStartTime(now);

    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateResults = () => {
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    userAnswers.forEach((answer, index) => {
      const q = questions[index];
      if (answer === null || answer === '') {
        unattempted++;
      } else {
        const isCorrect = String(answer).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
        if (isCorrect) {
          correct++;
        } else {
          incorrect++;
        }
      }
    });

    const totalMarks = (correct * 4) - (incorrect * 1);
    const maxMarks = examType === 'NEET_MOCK' ? 720 : questions.length * 4;

    return { correct, incorrect, unattempted, totalMarks, maxMarks };
  };

  const LatexMarkdown = ({ content }: { content: string }) => {
    if (!content) return null;
    return (
      <div className={cn(
        "markdown-body max-w-none",
        theme === 'light' ? "text-slate-900" : "text-slate-100"
      )}>
        <Markdown 
          remarkPlugins={[remarkMath]} 
          rehypePlugins={[rehypeKatex]}
        >
          {content}
        </Markdown>
      </div>
    );
  };

  if (loading) {
    return (
      <div className={cn(
        "min-h-screen flex flex-col items-center justify-center transition-colors duration-300",
        theme === 'light' ? "bg-white text-slate-900" : "bg-slate-900 text-white"
      )}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="mb-4"
        >
          <BrainCircuit className="w-12 h-12 text-indigo-600" />
        </motion.div>
        <h2 className="text-xl font-semibold">Generating your personalized quiz...</h2>
        <p className="text-slate-500 mt-2">The quiz creation process usually takes 1 to 3 minutes.</p>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen pb-12 transition-colors duration-300",
      theme === 'light' ? "bg-white text-slate-900" : "bg-slate-900 text-slate-100"
    )}>
      {/* Navigation */}
      <nav className={cn(
        "border-b sticky top-0 z-10 transition-colors duration-300",
        theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetQuiz}>
            <GraduationCap className={cn("w-8 h-8", theme === 'light' ? "text-indigo-600" : "text-indigo-400")} />
            <span className={cn("text-xl font-bold tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>Masterbate with Jonybhai</span>
          </div>
          <div className="flex items-center gap-4">
            <span className={cn("text-sm font-bold hidden md:block", theme === 'light' ? "text-slate-500" : "text-slate-400")}>
              Jonybhai(Niraj YADAV)
            </span>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={cn(
                "p-2 rounded-xl transition-colors",
                theme === 'light' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
            </button>
            {view === 'quiz' && (
              <div className={cn(
                "flex items-center gap-1.5 font-mono text-sm px-3 py-1 rounded-full transition-all",
                timeLimit - timeElapsed < 60 
                  ? "bg-rose-100 text-rose-600 animate-pulse font-bold" 
                  : (theme === 'light' ? "bg-slate-100 text-slate-600" : "bg-slate-800 text-slate-300")
              )}>
                <Timer className="w-4 h-4" />
                {timeLimit > 0 ? formatTime(Math.max(0, timeLimit - timeElapsed)) : formatTime(timeElapsed)}
              </div>
            )}
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-4 mt-8">
        <AnimatePresence mode="wait">
          {view === 'home' && (
            <motion.div
              key="home"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-8"
            >
              <div className="text-center space-y-4">
                <h1 className={cn(
                  "text-4xl md:text-5xl font-bold tracking-tight",
                  theme === 'light' ? "text-slate-900" : "text-white"
                )}>
                  Masterbate your exams with <span className="text-indigo-600">Jonybhai(Niraj YADAV)</span>
                </h1>
                <p className={cn(
                  "text-lg max-w-2xl mx-auto",
                  theme === 'light' ? "text-slate-600" : "text-slate-400"
                )}>
                  Get instant JEE and NEET level questions generated. Detailed explanations for every answer.
                </p>
              </div>

              {/* Selection Options */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Language Selection */}
                <div className={cn(
                  "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <h3 className={cn("font-bold flex items-center gap-2", theme === 'light' ? "text-slate-900" : "text-white")}>
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    Select Medium
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    {LANGUAGES.map((lang) => (
                      <button
                        key={lang.id}
                        onClick={() => setLanguage(lang.id)}
                        className={cn(
                          "py-3 px-4 rounded-xl border-2 font-semibold transition-all",
                          language === lang.id 
                            ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                            : "border-slate-100 text-slate-500 hover:border-slate-200"
                        )}
                      >
                        {lang.label}
                      </button>
                    ))}
                  </div>
                  <div className="pt-2 border-t border-slate-100/50">
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Jonybhai</span>
                  </div>
                </div>

                {/* Exam Type Selection */}
                <div className={cn(
                  "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <h3 className={cn("font-bold flex items-center gap-2", theme === 'light' ? "text-slate-900" : "text-white")}>
                    <Trophy className="w-5 h-5 text-indigo-600" />
                    Select Exam Level
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {EXAM_TYPES.map((type) => (
                      <button
                        key={type.id}
                        onClick={() => setExamType(type.id)}
                        className={cn(
                          "py-2 px-4 rounded-xl border-2 text-left transition-all flex flex-col",
                          examType === type.id 
                            ? "border-indigo-600 bg-indigo-50" 
                            : "border-slate-100 hover:border-slate-200"
                        )}
                      >
                        <span className={cn("font-bold", examType === type.id ? "text-indigo-700" : "text-slate-700")}>
                          {type.label}
                        </span>
                        <span className="text-xs text-slate-500">{type.desc}</span>
                        {type.id === 'MS_CHOUHAN' && (
                          <div className="mt-1 text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                            Specifically for Organic Chemistry
                          </div>
                        )}
                        {type.id === 'BLACK_BOOK' && (
                          <div className="mt-1 text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                            Specifically for Mathematics
                          </div>
                        )}
                        {type.id === 'NARENDRA_AVASTHI' && (
                          <div className="mt-1 text-[10px] font-bold text-indigo-500 uppercase tracking-tighter">
                            Specifically for Physical Chemistry
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Theme Selection */}
                <div className={cn(
                  "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <h3 className={cn("font-bold flex items-center gap-2", theme === 'light' ? "text-slate-900" : "text-white")}>
                    <Sun className="w-5 h-5 text-indigo-600" />
                    Select Theme
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      onClick={() => setTheme('light')}
                      className={cn(
                        "py-3 px-4 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2",
                        theme === 'light' 
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700" 
                          : "border-slate-800 text-slate-500 hover:border-slate-700"
                      )}
                    >
                      <Sun className="w-4 h-4" />
                      Light Mode
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={cn(
                        "py-3 px-4 rounded-xl border-2 font-semibold transition-all flex items-center justify-center gap-2",
                        theme === 'dark' 
                          ? "border-indigo-600 bg-indigo-900/20 text-indigo-400" 
                          : "border-slate-100 text-slate-500 hover:border-slate-200"
                      )}
                    >
                      <Moon className="w-4 h-4" />
                      Dark Mode
                    </button>
                  </div>
                </div>
              </div>

              {/* File Upload Section */}
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4 items-stretch">
                  <div 
                    className={cn(
                      "flex-1 p-6 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center text-center",
                      theme === 'light' ? "bg-white" : "bg-slate-900",
                      isDragging ? "border-indigo-600 bg-indigo-50" : (theme === 'light' ? "border-slate-200 hover:border-slate-300" : "border-slate-700 hover:border-slate-600"),
                      uploadedFiles.length > 0 && "border-emerald-500 bg-emerald-50/30"
                    )}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDragging(false); handleFileUpload(e); }}
                  >
                    <div className={cn("p-3 rounded-full mb-3", theme === 'light' ? "bg-indigo-50" : "bg-indigo-900/30")}>
                      <Upload className="w-6 h-6 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className={cn("text-base font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Upload Study Materials for quiz creations</h3>
                      <p className={cn("text-xs mb-4", theme === 'light' ? "text-slate-500" : "text-slate-400")}>
                        {uploadedFiles.length > 0 
                          ? `${uploadedFiles.length} file(s) selected. Drop more to add.` 
                          : "Drop multiple PDFs or Images here"}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <label className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100">
                        Select Files
                        <input type="file" multiple className="hidden" accept=".pdf,image/*" onChange={handleFileUpload} />
                      </label>
                      {uploadedFiles.length > 0 && (
                        <button 
                          onClick={() => setUploadedFiles([])}
                          className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-lg text-sm font-bold hover:bg-rose-100 transition-all"
                        >
                          Clear All
                        </button>
                      )}
                    </div>
                  </div>

                  <div className={cn(
                    "w-full md:w-72 p-6 rounded-3xl border-2 flex flex-col justify-between",
                    theme === 'light' ? "bg-white border-slate-100" : "bg-slate-900 border-slate-800"
                  )}>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Number of Questions</label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="1"
                              max="200"
                              value={questionCount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) setQuestionCount(Math.min(200, Math.max(1, val)));
                              }}
                              className={cn(
                                "w-16 text-center text-sm font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border-none focus:ring-1 focus:ring-indigo-500",
                              )}
                            />
                          </div>
                        </div>
                        <input 
                          type="range" 
                          min="1" 
                          max="200" 
                          step="1"
                          value={questionCount} 
                          onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                          className={cn(
                            "w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          )}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                          <span>1</span>
                          <span>200</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => startQuiz(uploadedFiles.length > 0 ? 'Uploaded Material' : (selectedSubject || 'General'))}
                        disabled={uploadedFiles.length === 0 && !selectedSubject}
                        className={cn(
                          "py-4 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-lg",
                          (uploadedFiles.length > 0 || selectedSubject)
                            ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100" 
                            : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <PlayCircle className="w-5 h-5" />
                          <span className="text-sm">Exam Quiz</span>
                        </div>
                      </button>

                      <button
                        onClick={() => startQuiz(uploadedFiles.length > 0 ? 'Uploaded Material' : (selectedSubject || 'General'), 'DPP')}
                        disabled={uploadedFiles.length === 0 && !selectedSubject}
                        className={cn(
                          "py-4 rounded-xl font-bold transition-all flex flex-col items-center justify-center gap-1 shadow-lg",
                          (uploadedFiles.length > 0 || selectedSubject)
                            ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100" 
                            : "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="w-5 h-5" />
                          <span className="text-sm">Create DPP</span>
                        </div>
                      </button>
                    </div>

                    <div className="mt-2 text-center">
                      <span className={cn("text-[10px] opacity-80 font-medium", theme === 'light' ? "text-slate-500" : "text-slate-400")}>
                        {uploadedFiles.length > 0 
                          ? `From ${uploadedFiles.length} uploaded file(s)` 
                          : selectedSubject ? `For ${selectedSubject}` : "Select a subject or upload files"}
                      </span>
                    </div>
                  </div>
                </div>

                {uploadedFiles.length > 0 && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {uploadedFiles.map((file, idx) => (
                      <div key={idx} className={cn(
                        "flex items-center justify-between p-3 border rounded-xl shadow-sm",
                        theme === 'light' ? "bg-white border-slate-100" : "bg-slate-800 border-slate-700"
                      )}>
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="p-2 bg-emerald-50 rounded-lg shrink-0">
                            <FileText className="w-4 h-4 text-emerald-600" />
                          </div>
                          <span className={cn("text-xs font-medium truncate", theme === 'light' ? "text-slate-700" : "text-slate-200")}>{file.name}</span>
                        </div>
                        <button 
                          onClick={() => removeFile(idx)}
                          className="p-1.5 hover:bg-rose-50 hover:text-rose-600 rounded-md transition-colors text-slate-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {SUBJECTS.map((subject) => (
                  <motion.button
                    key={subject.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setSelectedSubject(subject.id)}
                    className={cn(
                      "flex items-center p-6 rounded-2xl border-2 transition-all text-left group relative",
                      selectedSubject === subject.id 
                        ? (theme === 'light' ? "border-indigo-600 ring-2 ring-indigo-600/20" : "border-indigo-400 ring-2 ring-indigo-400/20")
                        : (theme === 'light' ? cn(subject.bg, subject.border) : cn(subject.darkBg, subject.darkBorder)),
                      "hover:shadow-lg hover:shadow-indigo-500/5"
                    )}
                  >
                    <div className={cn("p-4 rounded-xl mr-4 shadow-sm", theme === 'light' ? "bg-white" : "bg-slate-800")}>
                      <subject.icon className={cn("w-8 h-8", subject.color)} />
                    </div>
                    <div className="flex-1">
                      <h3 className={cn("text-xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>{subject.id}</h3>
                      <p className={cn("text-sm", theme === 'light' ? "text-slate-500" : "text-slate-400")}>Select to practice</p>
                    </div>
                    {selectedSubject === subject.id ? (
                      <div className="bg-indigo-600 text-white p-1 rounded-full">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                    ) : (
                      <ChevronRight className="w-6 h-6 text-slate-400 group-hover:text-slate-600 transition-colors" />
                    )}
                  </motion.button>
                ))}
              </div>

              <div className={cn(
                "p-8 rounded-3xl border shadow-sm transition-colors",
                theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              )}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className={cn("text-xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Why Masterbate with Jonybhai?</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className={cn("font-semibold", theme === 'light' ? "text-slate-800" : "text-slate-200")}>Dynamic Questions</h4>
                    <p className={cn("text-sm", theme === 'light' ? "text-slate-600" : "text-slate-400")}>Never see the same question twice. JonyBhai generates fresh content every time.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className={cn("font-semibold", theme === 'light' ? "text-slate-800" : "text-slate-200")}>Detailed Solutions</h4>
                    <p className={cn("text-sm", theme === 'light' ? "text-slate-600" : "text-slate-400")}>Step-by-step explanations to help you understand the core concepts.</p>
                  </div>
                  <div className="space-y-2">
                    <h4 className={cn("font-semibold", theme === 'light' ? "text-slate-800" : "text-slate-200")}>Performance Tracking</h4>
                    <p className={cn("text-sm", theme === 'light' ? "text-slate-600" : "text-slate-400")}>Analyze your strengths and weaknesses across different subjects.</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'dpp' && (
            <motion.div
              key="dpp"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-5xl mx-auto"
            >
              <DPPView 
                questions={questions} 
                subject={selectedSubject || 'General'} 
                onBack={() => setView('home')}
                theme={theme}
              />
            </motion.div>
          )}

          {view === 'ready' && (
            <motion.div
              key="ready"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-2xl mx-auto"
            >
              <div className={cn(
                "p-10 rounded-3xl border shadow-xl text-center space-y-8",
                theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              )}>
                <div className="inline-flex p-5 bg-indigo-50 rounded-3xl mb-2">
                  <Sparkles className="w-12 h-12 text-indigo-600" />
                </div>
                
                <div className="space-y-3">
                  <h2 className={cn("text-3xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Quiz is Ready!</h2>
                  <p className="text-slate-500">
                    We've generated <span className="font-bold text-indigo-600">{questions.length}</span> high-quality questions for <span className="font-bold text-slate-700">{selectedSubject}</span>.
                  </p>
                  <div className="text-indigo-500 font-bold text-lg">+4/-1</div>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4">
                  <div className={cn("p-4 rounded-2xl border", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800/50 border-slate-700")}>
                    <Timer className="w-5 h-5 text-indigo-600 mb-2 mx-auto" />
                    <div className={cn("text-lg font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>
                      {timeLimit > 0 ? formatTime(timeLimit) : 'No Limit'}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Time Limit</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800/50 border-slate-700")}>
                    <Target className="w-5 h-5 text-emerald-600 mb-2 mx-auto" />
                    <div className={cn("text-lg font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>
                      +{questions.length * 4} / -{questions.length}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Marking Scheme</div>
                  </div>
                </div>

                <div className="space-y-4">
                  <button
                    onClick={beginTest}
                    className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-3 group"
                  >
                    <PlayCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    Start Test Now
                  </button>
                  
                  <div className="relative group">
                    <button
                      onClick={() => {
                        const url = new URL(window.location.href);
                        url.searchParams.set('subject', selectedSubject || '');
                        url.searchParams.set('examType', examType);
                        navigator.clipboard.writeText(url.toString());
                        alert('Quiz link copied to clipboard!');
                      }}
                      className={cn(
                        "w-full py-3 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-2 border-2",
                        theme === 'light' ? "border-slate-100 text-slate-600 hover:bg-slate-50" : "border-slate-800 text-slate-400 hover:bg-slate-800"
                      )}
                    >
                      <Copy className="w-4 h-4" />
                      Copy Quiz Link
                    </button>
                  </div>
                </div>

                <button
                  onClick={resetQuiz}
                  className="text-slate-400 text-sm font-medium hover:text-slate-600 transition-colors"
                >
                  Cancel and go back
                </button>
              </div>
            </motion.div>
          )}

          {view === 'quiz' && questions.length > 0 && (
            <motion.div
              key="quiz"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6 relative z-50"
            >
              <div className="flex items-center justify-between mb-2">
                <button 
                  onClick={resetQuiz}
                  className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-all font-medium"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Exit Quiz
                </button>
                <div className="text-sm font-medium text-slate-500">
                  Question {currentIndex + 1} of {questions.length}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-indigo-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
                />
              </div>

              <div className={cn(
                "p-8 rounded-3xl border shadow-sm space-y-8 transition-colors",
                theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              )}>
                <div className="space-y-4">
                  <div className={cn("text-2xl font-semibold leading-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
                    <LatexMarkdown content={questions[currentIndex].text} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3">
                  {questions[currentIndex].type === 'NUMERICAL' ? (
                    <div className="space-y-4">
                      <p className={cn("text-sm font-medium", theme === 'light' ? "text-slate-500" : "text-slate-400")}>
                        Enter your numerical answer below:
                      </p>
                      <input 
                        type="text"
                        value={userAnswers[currentIndex] || ''}
                        onChange={(e) => handleAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className={cn(
                          "w-full p-5 rounded-2xl border-2 text-xl font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all",
                          theme === 'light' ? "bg-white border-slate-100" : "bg-slate-800 border-slate-700 text-white"
                        )}
                      />
                    </div>
                  ) : (
                    questions[currentIndex].options?.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(idx)}
                        className={cn(
                          "p-5 rounded-2xl border-2 text-left transition-all flex items-center justify-between group",
                          userAnswers[currentIndex] === idx
                            ? (theme === 'light' ? "border-indigo-600 bg-indigo-50" : "border-indigo-500 bg-indigo-950/30")
                            : (theme === 'light' ? "border-slate-100 hover:border-slate-200 hover:bg-slate-50" : "border-slate-800 hover:border-slate-700 hover:bg-slate-800/50")
                        )}
                      >
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm shrink-0",
                            userAnswers[currentIndex] === idx
                              ? "bg-indigo-600 text-white"
                              : (theme === 'light' ? "bg-slate-100 text-slate-500 group-hover:bg-slate-200" : "bg-slate-800 text-slate-400 group-hover:bg-slate-700")
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </span>
                          <div className={cn(
                            "font-bold text-lg",
                            userAnswers[currentIndex] === idx 
                              ? (theme === 'light' ? "text-indigo-900" : "text-indigo-100") 
                              : (theme === 'light' ? "text-slate-800" : "text-slate-200")
                          )}>
                            <LatexMarkdown content={option} />
                          </div>
                        </div>
                        {userAnswers[currentIndex] === idx && (
                          <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                  <button
                    onClick={prevQuestion}
                    disabled={currentIndex === 0}
                    className="px-6 py-2 rounded-xl font-semibold text-slate-600 disabled:opacity-30 hover:bg-slate-50 transition-colors"
                  >
                    Previous
                  </button>
                  <button
                    onClick={nextQuestion}
                    disabled={userAnswers[currentIndex] === null}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
                  >
                    {currentIndex === questions.length - 1 ? 'Finish Quiz' : 'Next Question'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {view === 'report' && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-8 pb-20"
              ref={reportRef}
            >
              <div className="flex items-center justify-between no-print">
                <button 
                  onClick={() => setView('results')}
                  className="flex items-center gap-2 text-slate-500 font-bold hover:text-indigo-600 transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" /> Back to Results
                </button>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full text-indigo-600 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> FullyPass Smart Report
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-8">
                {/* Difficulty Wise Distribution Table */}
                <div className={cn(
                  "p-8 rounded-3xl border shadow-sm overflow-hidden",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <h3 className={cn("text-xl font-bold mb-6", theme === 'light' ? "text-slate-900" : "text-white")}>Question Wise Difficulty</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#D9EAD3] text-[#274E13]">
                          <th rowSpan={2} className="border border-slate-300 p-3 text-left font-bold">Subject</th>
                          <th colSpan={2} className="border border-slate-300 p-3 text-center font-bold">Easy Level</th>
                          <th colSpan={2} className="border border-slate-300 p-3 text-center font-bold">Medium Level</th>
                          <th colSpan={2} className="border border-slate-300 p-3 text-center font-bold">Difficult Level</th>
                        </tr>
                        <tr className="bg-[#D9EAD3] text-[#274E13]">
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">No of Questions</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">Total Marks</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">No of Questions</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">Total Marks</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">No of Questions</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">Total Marks</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(questions.map(q => q.subject))).map((sub, idx) => {
                          const subQs = questions.filter(q => q.subject === sub);
                          const easy = subQs.filter(q => q.difficulty === 'Easy');
                          const medium = subQs.filter(q => q.difficulty === 'Moderate');
                          const hard = subQs.filter(q => q.difficulty === 'Hard');
                          
                          return (
                            <tr key={idx} className={theme === 'light' ? "hover:bg-slate-50" : "hover:bg-slate-800"}>
                              <td className={cn("border border-slate-300 p-3 font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>{sub}</td>
                              <td className="border border-slate-300 p-3 text-center">{easy.length}</td>
                              <td className="border border-slate-300 p-3 text-center">{easy.length * 4}</td>
                              <td className="border border-slate-300 p-3 text-center">{medium.length}</td>
                              <td className="border border-slate-300 p-3 text-center">{medium.length * 4}</td>
                              <td className="border border-slate-300 p-3 text-center">{hard.length}</td>
                              <td className="border border-slate-300 p-3 text-center">{hard.length * 4}</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-[#D9EAD3] text-[#274E13] font-bold">
                          <td className="border border-slate-300 p-3">Grand Total</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.difficulty === 'Easy').length}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.difficulty === 'Easy').length * 4}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.difficulty === 'Moderate').length}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.difficulty === 'Moderate').length * 4}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.difficulty === 'Hard').length}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.difficulty === 'Hard').length * 4}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Difficulty Stacked Bar Chart */}
                <div className={cn(
                  "p-8 rounded-3xl border shadow-sm",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <h3 className={cn("text-xl font-bold mb-6 text-center", theme === 'light' ? "text-slate-900" : "text-white")}>Question Wise Difficulty Chart</h3>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Array.from(new Set(questions.map(q => q.subject))).map(sub => ({
                          name: sub,
                          Easy: questions.filter(q => q.subject === sub && q.difficulty === 'Easy').length,
                          Medium: questions.filter(q => q.subject === sub && q.difficulty === 'Moderate').length,
                          Difficult: questions.filter(q => q.subject === sub && q.difficulty === 'Hard').length
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} fontWeight="bold" />
                        <YAxis fontSize={12} fontWeight="bold" />
                        <RechartsTooltip cursor={{ fill: 'transparent' }} />
                        <Legend verticalAlign="top" align="right" layout="vertical" />
                        <Bar dataKey="Easy" stackId="a" fill="#4A86B8" barSize={60} />
                        <Bar dataKey="Medium" stackId="a" fill="#B85450" barSize={60} />
                        <Bar dataKey="Difficult" stackId="a" fill="#92D050" barSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Professional Data Table */}
                <div className={cn(
                  "p-8 rounded-3xl border shadow-sm overflow-hidden",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <h3 className={cn("text-xl font-bold mb-6", theme === 'light' ? "text-slate-900" : "text-white")}>Subject Wise Distribution</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-[#E8F3E8] text-[#2D4A2D]">
                          <th rowSpan={2} className="border border-slate-300 p-3 text-left font-bold">Subject</th>
                          <th colSpan={2} className="border border-slate-300 p-3 text-center font-bold">Class 11</th>
                          <th colSpan={2} className="border border-slate-300 p-3 text-center font-bold">Class 12</th>
                          <th colSpan={2} className="border border-slate-300 p-3 text-center font-bold">Total Percentage</th>
                        </tr>
                        <tr className="bg-[#E8F3E8] text-[#2D4A2D]">
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">No of Questions</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">Total Marks</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">No of Questions</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">Total Marks</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">Class 11</th>
                          <th className="border border-slate-300 p-2 text-center text-xs font-bold">Class 12</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from(new Set(questions.map(q => q.subject))).map((sub, idx) => {
                          const subQs = questions.filter(q => q.subject === sub);
                          const c11 = subQs.filter(q => q.grade === 'Class 11');
                          const c12 = subQs.filter(q => q.grade === 'Class 12');
                          const c11Total = questions.filter(q => q.grade === 'Class 11').length;
                          const c12Total = questions.filter(q => q.grade === 'Class 12').length;
                          
                          return (
                            <tr key={idx} className={theme === 'light' ? "hover:bg-slate-50" : "hover:bg-slate-800"}>
                              <td className={cn("border border-slate-300 p-3 font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>{sub}</td>
                              <td className="border border-slate-300 p-3 text-center">{c11.length}</td>
                              <td className="border border-slate-300 p-3 text-center">{c11.length * 4}</td>
                              <td className="border border-slate-300 p-3 text-center">{c12.length}</td>
                              <td className="border border-slate-300 p-3 text-center">{c12.length * 4}</td>
                              <td className="border border-slate-300 p-3 text-center">{(c11Total > 0 ? (c11.length / c11Total) * 100 : 0).toFixed(2)}%</td>
                              <td className="border border-slate-300 p-3 text-center">{(c12Total > 0 ? (c12.length / c12Total) * 100 : 0).toFixed(2)}%</td>
                            </tr>
                          );
                        })}
                        <tr className="bg-[#E8F3E8] text-[#2D4A2D] font-bold">
                          <td className="border border-slate-300 p-3">Grand Total</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.grade === 'Class 11').length}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.grade === 'Class 11').length * 4}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.grade === 'Class 12').length}</td>
                          <td className="border border-slate-300 p-3 text-center">{questions.filter(q => q.grade === 'Class 12').length * 4}</td>
                          <td className="border border-slate-300 p-3 text-center">100.00%</td>
                          <td className="border border-slate-300 p-3 text-center">100.00%</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Stacked Bar Chart */}
                <div className={cn(
                  "p-8 rounded-3xl border shadow-sm",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <h3 className={cn("text-xl font-bold mb-6 text-center", theme === 'light' ? "text-slate-900" : "text-white")}>Class Wise Number of Questions</h3>
                  <div className="h-[400px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={Array.from(new Set(questions.map(q => q.subject))).map(sub => ({
                          name: sub,
                          XI: questions.filter(q => q.subject === sub && q.grade === 'Class 11').length,
                          XII: questions.filter(q => q.subject === sub && q.grade === 'Class 12').length
                        }))}
                        margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" fontSize={12} fontWeight="bold" />
                        <YAxis fontSize={12} fontWeight="bold" />
                        <RechartsTooltip cursor={{ fill: 'transparent' }} />
                        <Legend verticalAlign="top" align="right" layout="vertical" />
                        <Bar dataKey="XI" stackId="a" fill="#4A86B8" barSize={60} />
                        <Bar dataKey="XII" stackId="a" fill="#B85450" barSize={60} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className={cn(
                  "md:col-span-2 p-8 rounded-3xl border shadow-sm space-y-6",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className={cn("text-2xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Performance Analysis</h2>
                      <p className="text-slate-500 text-sm">Know your strengths in 30 seconds</p>
                    </div>
                    <div className="p-3 bg-indigo-50 rounded-2xl">
                      <TrendingUp className="w-6 h-6 text-indigo-600" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Accuracy', value: `${Math.round((calculateResults().correct / questions.length) * 100)}%`, icon: Target, color: 'text-emerald-600' },
                      { label: 'Avg Time/Q', value: `${Math.round(timeElapsed / questions.length)}s`, icon: Clock, color: 'text-indigo-600' },
                      { label: 'Score', value: `${calculateResults().totalMarks}`, icon: Trophy, color: 'text-amber-500' },
                      { label: 'Efficiency', value: calculateResults().correct > 0 ? `${Math.round((calculateResults().correct / (timeElapsed / 60)) * 10) / 10} Q/m` : '0 Q/m', icon: Zap, color: 'text-fuchsia-600' }
                    ].map((stat, i) => (
                      <div key={i} className={cn("p-4 rounded-2xl border", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800/50 border-slate-700")}>
                        <stat.icon className={cn("w-5 h-5 mb-2", stat.color)} />
                        <div className={cn("text-xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>{stat.value}</div>
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{stat.label}</div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4 pt-4">
                    <h3 className={cn("font-bold text-sm uppercase tracking-wider", theme === 'light' ? "text-slate-400" : "text-slate-500")}>Topic Performance Breakdown</h3>
                    <div className="h-[350px] w-full mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={Array.from(new Set(questions.map(q => q.topic))).map(topic => {
                            const topicQs = questions.filter(q => q.topic === topic);
                            const correct = topicQs.filter((q) => {
                              const qIdx = questions.findIndex(item => item.id === q.id);
                              return String(userAnswers[qIdx]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                            }).length;
                            return { name: topic, correct, total: topicQs.length };
                          })}
                          margin={{ top: 20, right: 30, left: 0, bottom: 70 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'light' ? '#f1f5f9' : '#1e293b'} />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            interval={0} 
                            height={80}
                            fontSize={12}
                            fontWeight="bold"
                            stroke={theme === 'light' ? '#475569' : '#94a3b8'}
                          />
                          <YAxis 
                            fontSize={12}
                            fontWeight="bold"
                            stroke={theme === 'light' ? '#475569' : '#94a3b8'}
                            allowDecimals={false}
                          />
                          <RechartsTooltip 
                            cursor={{ fill: 'rgba(79, 70, 229, 0.05)' }}
                            contentStyle={{ 
                              borderRadius: '16px', 
                              border: 'none', 
                              boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
                              backgroundColor: theme === 'light' ? '#fff' : '#0f172a',
                              color: theme === 'light' ? '#1e293b' : '#f8fafc'
                            }}
                          />
                          <Bar dataKey="correct" radius={[6, 6, 0, 0]} barSize={32}>
                            {Array.from(new Set(questions.map(q => q.topic))).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={['#6366f1', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4'][index % 6]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={cn(
                    "p-8 rounded-3xl border shadow-sm",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  )}>
                    <h3 className={cn("font-bold mb-6 flex items-center gap-2", theme === 'light' ? "text-slate-900" : "text-white")}>
                      <PieChartIcon className="w-5 h-5 text-indigo-600" /> Accuracy Distribution
                    </h3>
                    <div className="h-[200px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Correct', value: calculateResults().correct, color: '#10b981' },
                              { name: 'Incorrect', value: calculateResults().incorrect, color: '#f43f5e' },
                              { name: 'Unattempted', value: calculateResults().unattempted, color: '#94a3b8' }
                            ]}
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {[
                              { color: '#10b981' },
                              { color: '#f43f5e' },
                              { color: '#94a3b8' }
                            ].map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <RechartsTooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2 mt-4">
                      {[
                        { label: 'Correct', value: calculateResults().correct, color: 'bg-emerald-500' },
                        { label: 'Incorrect', value: calculateResults().incorrect, color: 'bg-rose-500' },
                        { label: 'Unattempted', value: calculateResults().unattempted, color: 'bg-slate-400' }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-xs font-bold">
                          <div className="flex items-center gap-2">
                            <div className={cn("w-2 h-2 rounded-full", item.color)} />
                            <span className="text-slate-500">{item.label}</span>
                          </div>
                          <span className={theme === 'light' ? "text-slate-900" : "text-white"}>{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={cn(
                    "p-8 rounded-3xl border shadow-sm",
                    theme === 'light' ? "bg-indigo-600 text-white" : "bg-indigo-900 border-indigo-800 text-indigo-100"
                  )}>
                    <div className="flex items-center gap-2 mb-4">
                      <BrainCircuit className="w-6 h-6" />
                      <h3 className="font-bold">Smart Summary</h3>
                    </div>
                    <p className="text-sm opacity-90 leading-relaxed">
                      You completed the {selectedSubject} quiz in {formatTime(timeElapsed)}. 
                      Your strongest topic was <span className="font-bold underline">
                        {Array.from(new Set(questions.map(q => q.topic))).map(topic => {
                          const topicQs = questions.filter(q => q.topic === topic);
                          const correct = topicQs.filter((q, i) => {
                            const qIdx = questions.indexOf(q);
                            return String(userAnswers[qIdx]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                          }).length;
                          return { name: topic, accuracy: correct / topicQs.length };
                        }).sort((a, b) => b.accuracy - a.accuracy)[0]?.name || 'N/A'}
                      </span>. 
                      {calculateResults().incorrect > 0 ? " Focus on reviewing your incorrect answers to improve conceptual clarity." : " Perfect accuracy! You have a strong grasp of these concepts."}
                    </p>
                    <button 
                      onClick={() => setView('results')}
                      className="w-full mt-6 py-3 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm transition-all"
                    >
                      Review Answers
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}

          {view === 'results' && (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-8"
            >
              <div className={cn(
                "p-10 rounded-3xl border shadow-sm text-center space-y-6 transition-colors",
                theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
              )}>
                <div className="inline-flex p-4 bg-amber-50 rounded-full mb-2">
                  <Trophy className="w-12 h-12 text-amber-500" />
                </div>
                <div className="space-y-2">
                  <h2 className={cn("text-3xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Quiz Completed!</h2>
                  <p className={cn("text-slate-500", theme === 'light' ? "" : "text-slate-400")}>Great job completing the {selectedSubject} {examType} practice session in {language}.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-6">
                  <div className={cn("p-4 rounded-2xl", theme === 'light' ? "bg-slate-50" : "bg-slate-800")}>
                    <div className={cn("text-2xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>
                      {calculateResults().totalMarks}/{calculateResults().maxMarks}
                    </div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Total Marks</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl", theme === 'light' ? "bg-slate-50" : "bg-slate-800")}>
                    <div className={cn("text-2xl font-bold text-emerald-600")}>+{calculateResults().correct * 4}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Correct ({calculateResults().correct})</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl", theme === 'light' ? "bg-slate-50" : "bg-slate-800")}>
                    <div className={cn("text-2xl font-bold text-rose-600")}>-{calculateResults().incorrect}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Incorrect ({calculateResults().incorrect})</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl", theme === 'light' ? "bg-slate-50" : "bg-slate-800")}>
                    <div className={cn("text-2xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>{formatTime(timeElapsed)}</div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Time Taken</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl", theme === 'light' ? "bg-slate-50" : "bg-slate-800")}>
                    <div className={cn("text-2xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>
                      {Math.round((calculateResults().correct / questions.length) * 100)}%
                    </div>
                    <div className="text-xs text-slate-500 font-medium uppercase tracking-wider">Accuracy</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <button
                    onClick={() => setView('report')}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Performance Report
                  </button>
                  <button
                    onClick={() => startQuiz(selectedSubject!)}
                    className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    <RefreshCw className="w-5 h-5" />
                    Try Again
                  </button>
                  <button
                    onClick={resetQuiz}
                    className="px-8 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                  >
                    Home
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className={cn("text-xl font-bold px-2", theme === 'light' ? "text-slate-900" : "text-white")}>Review Answers</h3>
                <div className="space-y-4">
                  {questions.map((q, idx) => (
                    <div key={q.id} className={cn(
                      "p-6 rounded-2xl border shadow-sm space-y-4 transition-colors",
                      theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-xs font-bold text-slate-400 uppercase">Question {idx + 1}</div>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider",
                              q.difficulty === 'Easy' ? 'bg-emerald-100 text-emerald-700' :
                              q.difficulty === 'Moderate' ? 'bg-amber-100 text-amber-700' :
                              'bg-rose-100 text-rose-700'
                            )}>
                              {q.difficulty}
                            </span>
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                              {q.topic}
                            </span>
                            <span className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1">
                              <Timer className="w-2.5 h-2.5" /> {questionTimes[idx]}s
                            </span>
                          </div>
                          <div className={cn("font-semibold", theme === 'light' ? "text-slate-900" : "text-slate-100")}>
                            <LatexMarkdown content={q.text} />
                          </div>
                        </div>
                        {(() => {
                          const isCorrect = userAnswers[idx] !== null && String(userAnswers[idx]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                          return isCorrect ? (
                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded text-xs font-bold shrink-0">
                              <CheckCircle2 className="w-4 h-4" /> Correct
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-1 rounded text-xs font-bold shrink-0">
                              <XCircle className="w-4 h-4" /> {userAnswers[idx] === null ? 'Unattempted' : 'Incorrect'}
                            </div>
                          );
                        })()}
                      </div>

                      {q.type === 'NUMERICAL' ? (
                        <div className="space-y-2">
                          <div className={cn(
                            "p-4 rounded-xl border text-sm",
                            theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700"
                          )}>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-500 font-medium">Your Answer:</span>
                              <span className={cn(
                                "font-bold",
                                String(userAnswers[idx]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase() ? "text-emerald-600" : "text-rose-600"
                              )}>
                                {userAnswers[idx] === null ? 'None' : userAnswers[idx]}
                              </span>
                            </div>
                            <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-200/50">
                              <span className="text-slate-500 font-medium">Correct Answer:</span>
                              <span className="font-bold text-emerald-600">
                                <LatexMarkdown content={String(q.correctAnswer)} />
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {q.options?.map((opt, oIdx) => (
                            <div 
                              key={oIdx}
                              className={cn(
                                "p-3 rounded-xl text-sm border",
                                String(oIdx) === String(q.correctAnswer) ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-medium" :
                                String(oIdx) === String(userAnswers[idx]) ? "bg-rose-50 border-rose-200 text-rose-900" :
                                theme === 'light' ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-slate-800 border-slate-700 text-slate-400"
                              )}
                            >
                              <span className="font-bold mr-2">{String.fromCharCode(65 + oIdx)}.</span>
                              <LatexMarkdown content={opt} />
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={cn(
                        "p-4 rounded-xl border",
                        theme === 'light' ? "bg-indigo-50/50 border-indigo-100" : "bg-indigo-900/20 border-indigo-900/50"
                      )}>
                        <div className="flex items-center gap-2 mb-2 text-indigo-700 font-bold text-xs uppercase tracking-wider">
                          <BookOpen className="w-4 h-4" /> Explanation
                        </div>
                        <div className={theme === 'light' ? "text-slate-700" : "text-slate-300"}>
                          <LatexMarkdown content={q.explanation} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
