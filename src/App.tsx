/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Link,
  Download,
  MessageSquare,
  Volume2,
  Users,
  Share2,
  Lock,
  CreditCard,
  Gift,
  Send,
  Bell
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import DppTemplate from './components/DppTemplate';
import LatexMarkdown from './components/LatexMarkdown';
import DoubtSolver from './components/DoubtSolver';
import { generateSpeech } from './services/geminiService';
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
import { Question, Language, ExamType, QuizMode, QuizResult } from './types';
import { generateQuestions, chatDuringLoading } from './services/geminiService';
import { cn } from './utils';
import { DPPView } from './DPPView';
import { SYLLABUS } from './constants/syllabus';
import { db, auth, doc, getDoc, collection, addDoc } from './firebase';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

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

import InstallBanner from './components/InstallBanner';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [view, setView] = useState<'home' | 'quiz' | 'results' | 'report' | 'ready' | 'dpp' | 'doubt'>('home');
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
  const [speakingIndex, setSpeakingIndex] = useState<number | null>(null);
  const [difficulty, setDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [quizMode, setQuizMode] = useState<QuizMode>('standard');
  
  // Monetization State
  const [quizCount, setQuizCount] = useState(() => {
    const saved = localStorage.getItem('quizCount');
    return saved ? parseInt(saved) : 0;
  });
  const [doubtCount, setDoubtCount] = useState(() => {
    const saved = localStorage.getItem('doubtCount');
    return saved ? parseInt(saved) : 0;
  });
  const [isSubscribed, setIsSubscribed] = useState(() => {
    return localStorage.getItem('isSubscribed') === 'true';
  });
  const [showPaywall, setShowPaywall] = useState(false);

  useEffect(() => {
    localStorage.setItem('quizCount', quizCount.toString());
  }, [quizCount]);

  useEffect(() => {
    localStorage.setItem('doubtCount', doubtCount.toString());
  }, [doubtCount]);

  useEffect(() => {
    localStorage.setItem('isSubscribed', isSubscribed.toString());
  }, [isSubscribed]);

  const addNotification = (message: string) => {
    const newNotif = {
      id: Math.random().toString(36).substr(2, 9),
      message,
      time: new Date(),
      read: false
    };
    setNotifications(prev => [newNotif, ...prev]);
  };
  const handleSubjectTabClick = (subject: string) => {
    setActiveSubjectTab(subject);
    const firstIdx = questions.findIndex(q => q.subject === subject);
    if (firstIdx !== -1) {
      goToQuestion(firstIdx);
    }
  };

  const getQuestionStatus = (idx: number) => {
    const isAnswered = userAnswers[idx] !== null;
    const isMarked = markedForReview[idx];
    const isVisited = visitedQuestions[idx];

    if (isAnswered && isMarked) return 'answered-marked';
    if (isMarked) return 'marked';
    if (isAnswered) return 'answered';
    if (isVisited) return 'not-answered';
    return 'not-visited';
  };

  useEffect(() => {
    if (view === 'quiz' && questions[currentIndex]) {
      setActiveSubjectTab(questions[currentIndex].subject);
    }
  }, [currentIndex, view, questions]);

  const incrementQuizCount = () => {
    setQuizCount(prev => prev + 1);
  };

  const incrementDoubtCount = () => {
    setDoubtCount(prev => prev + 1);
  };

  const handleSubscribe = () => {
    window.open("https://razorpay.me/@nitianvisionpointbynirajkumar", "_blank");
  };
  
  // Custom Quiz Builder State (Decoupled)
  const [customSubject, setCustomSubject] = useState(SYLLABUS.Physics[0]);
  const [customExamType, setCustomExamType] = useState<ExamType>('NEET');
  const [customQuestionCount, setCustomQuestionCount] = useState(15);
  const [customDifficulty, setCustomDifficulty] = useState<'EASY' | 'MEDIUM' | 'HARD'>('MEDIUM');
  const [customLanguage, setCustomLanguage] = useState<Language>('English');
  const [customQuizMode, setCustomQuizMode] = useState<QuizMode>('standard');
  const [syllabusSubject, setSyllabusSubject] = useState<keyof typeof SYLLABUS | 'Custom'>('Physics');
  const [syllabusTopic, setSyllabusTopic] = useState<string>(SYLLABUS.Physics[0]);
  const [lastQuizParams, setLastQuizParams] = useState<{
    subject: string,
    examType: ExamType,
    count: number,
    difficulty: 'EASY' | 'MEDIUM' | 'HARD',
    language: Language,
    mode: QuizMode,
    files?: { data: string, mimeType: string }[]
  } | null>(null);

  const [loadingChatMessages, setLoadingChatMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([]);
  const loadingChatEndRef = useRef<HTMLDivElement>(null);
  const [loadingChatInput, setLoadingChatInput] = useState("");
  const [isLoadingChatReplying, setIsLoadingChatReplying] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [loadingStage, setLoadingStage] = useState<'syllabus' | 'questions' | 'explanations' | 'finalizing'>('syllabus');
  const [estimatedTime, setEstimatedTime] = useState(90);

  useEffect(() => {
    if (loadingChatEndRef.current) {
      loadingChatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [loadingChatMessages, isLoadingChatReplying]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (loading) {
      setLoadingProgress(0);
      setLoadingStage('syllabus');
      setEstimatedTime(90);
      interval = setInterval(() => {
        setLoadingProgress(prev => {
          if (prev >= 98) return prev;
          const increment = prev < 50 ? 1.5 : (prev < 80 ? 0.8 : 0.3);
          const next = prev + increment;
          
          if (next < 25) setLoadingStage('syllabus');
          else if (next < 65) setLoadingStage('questions');
          else if (next < 90) setLoadingStage('explanations');
          else setLoadingStage('finalizing');
          
          return next;
        });
        setEstimatedTime(prev => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [loading]);
  const [showMobilePalette, setShowMobilePalette] = useState(false);
  const [markedForReview, setMarkedForReview] = useState<boolean[]>([]);
  const [visitedQuestions, setVisitedQuestions] = useState<boolean[]>([]);
  const [activeSubjectTab, setActiveSubjectTab] = useState<string>("");
  const [notifications, setNotifications] = useState<{ id: string; message: string; time: Date; read: boolean }[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sharedResult, setSharedResult] = useState<QuizResult | null>(null);
  const [isSharing, setIsSharing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const resultId = urlParams.get('resultId');
    if (resultId) {
      loadSharedResult(resultId);
    }
  }, []);

  const loadSharedResult = async (id: string) => {
    setLoading(true);
    try {
      const resultDoc = await getDoc(doc(db, 'results', id));
      if (resultDoc.exists()) {
        const data = resultDoc.data() as QuizResult;
        setSharedResult(data);
        setQuestions(data.questions.map((q, i) => ({
          id: `shared-${i}`,
          text: q.text,
          type: 'MCQ',
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          options: q.options,
          subject: data.subject,
          topic: 'Shared Result',
          grade: 'Class 12',
          difficulty: 'Moderate',
          language: 'English',
          examType: data.examType
        })));
        setUserAnswers(data.questions.map(q => q.userAnswer));
        setSelectedSubject(data.subject);
        setExamType(data.examType);
        setTimeElapsed(data.timeElapsed);
        setView('results');
      }
    } catch (error) {
      console.error("Error loading shared result:", error);
      alert("Failed to load shared result.");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (isSharing) return;
    setIsSharing(true);
    
    const results = calculateResults();
    const resultData: QuizResult = {
      userName: auth.currentUser?.displayName || 'Aspirant',
      userEmail: auth.currentUser?.email || 'anonymous',
      examType,
      subject: selectedSubject || 'Mock Test',
      score: results.totalMarks,
      totalQuestions: questions.length,
      correctAnswers: results.correct,
      wrongAnswers: results.incorrect,
      unanswered: results.unattempted,
      timeElapsed,
      timestamp: Date.now(),
      questions: questions.map((q, i) => ({
        text: q.text,
        userAnswer: userAnswers[i],
        correctAnswer: q.correctAnswer,
        isCorrect: String(userAnswers[i]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase(),
        explanation: q.explanation,
        options: q.options
      }))
    };

    try {
      const docRef = await addDoc(collection(db, 'results'), resultData);
      const shareUrl = `${window.location.origin}${window.location.pathname}?resultId=${docRef.id}`;
      
      if (navigator.share) {
        try {
          await navigator.share({
            title: `My ${selectedSubject} Quiz Results`,
            text: `I scored ${results.totalMarks}/${results.maxMarks} in my ${selectedSubject} quiz on RankBoost with NITian! Check it out:`,
            url: shareUrl,
          });
        } catch (err) {
          // Fallback if share is cancelled or fails
          await navigator.clipboard.writeText(shareUrl);
          addNotification("Shareable link copied to clipboard!");
        }
      } else {
        await navigator.clipboard.writeText(shareUrl);
        addNotification("Shareable link copied to clipboard!");
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'results');
    } finally {
      setIsSharing(false);
    }
  };

  const handleSpeakExplanation = async (text: string, index: number) => {
    if (speakingIndex === index) {
      audioRef.current?.pause();
      setSpeakingIndex(null);
      return;
    }

    setSpeakingIndex(index);
    try {
      const url = await generateSpeech(text);
      if (url && audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (err) {
      console.error(err);
      setSpeakingIndex(null);
    }
  };
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
      setQuestionCount(25);
    } else if (examType === 'NEET_MOCK' || selectedSubject === 'NEET 2026 Mock') {
      setQuestionCount(25);
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

  const [isDownloading, setIsDownloading] = useState(false);

  const downloadDpp = async () => {
    setIsDownloading(true);
    const element = document.getElementById('dpp-template');
    if (!element) {
      setIsDownloading(false);
      return;
    }

    // Temporarily show the element for capture
    const originalStyle = element.style.display;
    const originalPosition = element.style.position;
    const originalLeft = element.style.left;
    
    element.style.display = 'block';
    element.style.position = 'fixed';
    element.style.left = '-9999px';
    
    try {
      // Give it a moment to render any LaTeX and fonts
      await new Promise(resolve => setTimeout(resolve, 2000));

      const canvas = await html2canvas(element, {
        scale: 4, // Higher scale for superior quality
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1000,
        allowTaint: false,
        imageTimeout: 0,
        onclone: (clonedDoc) => {
          const clonedElement = clonedDoc.getElementById('dpp-template');
          if (clonedElement) {
            clonedElement.style.display = 'block';
            clonedElement.style.visibility = 'visible';
          }
        }
      });
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: 'a4',
        compress: true
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = pdfWidth / imgWidth;
      const canvasHeightInMm = imgHeight * ratio;
      
      let heightLeft = canvasHeightInMm;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInMm, undefined, 'SLOW');
      heightLeft -= pdfHeight;

      // Add subsequent pages if content exceeds one page
      while (heightLeft > 0) {
        position = heightLeft - canvasHeightInMm;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, canvasHeightInMm, undefined, 'SLOW');
        heightLeft -= pdfHeight;
      }

      pdf.save(`DPP_${selectedSubject?.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      element.style.display = originalStyle;
      element.style.position = originalPosition;
      element.style.left = originalLeft;
      setIsDownloading(false);
    }
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
    setSharedResult(null);
  };

  const beginTest = () => {
    setStartTime(Date.now());
    setLastQuestionStartTime(Date.now());
    setView('quiz');
  };

  const startQuiz = async (
    subject: string, 
    overrideExamType?: ExamType, 
    overrideCount?: number, 
    overrideDifficulty?: 'EASY' | 'MEDIUM' | 'HARD',
    overrideLanguage?: Language,
    files?: { data: string, mimeType: string }[],
    overrideMode?: QuizMode
  ) => {
    let currentExamType = overrideExamType || examType;
    if (!isSubscribed) {
      if (quizCount >= 5 || currentExamType === 'JEE_MAIN_MOCK' || currentExamType === 'NEET_MOCK') {
        setShowPaywall(true);
        return;
      }
    }
    setLoading(true);
    setSharedResult(null);
    setSelectedSubject(subject);
    try {
      // Small initial delay to ensure quota is fresh
      await new Promise(resolve => setTimeout(resolve, 500));
      
      let displaySubject = subject;
      let currentExamType = overrideExamType || examType;
      let currentCount = overrideCount || questionCount;
      let currentDifficulty = overrideDifficulty || difficulty;
      let currentLanguage = overrideLanguage || language;
      let currentMode = overrideMode || quizMode;
      let currentFiles = files || (uploadedFiles.length > 0 ? uploadedFiles.map(f => ({ data: f.data, mimeType: f.mimeType })) : undefined);

      setLastQuizParams({
        subject: displaySubject,
        examType: currentExamType,
        count: currentCount,
        difficulty: currentDifficulty,
        language: currentLanguage,
        mode: currentMode,
        files: currentFiles
      });

      let qs: Question[] = [];
      
      if (subject === 'JEE Main Mock' || currentExamType === 'JEE_MAIN_MOCK') {
        // Sequential generation for JEE Mock subjects to respect rate limits
        const subjects = ['Physics', 'Chemistry', 'Mathematics'];
        const countPerSubject = Math.floor(currentCount / 3);
        const remainder = currentCount % 3;
        
        for (let i = 0; i < subjects.length; i++) {
          const sub = subjects[i];
          const subCount = countPerSubject + (i < remainder ? 1 : 0);
          if (subCount > 0) {
            const subjectQs = await generateQuestions(sub, currentLanguage, 'JEE_MAIN_MOCK', subCount, undefined, undefined, currentMode);
            qs.push(...subjectQs);
            // Increased gap between subjects to respect 15 RPM
            if (i < subjects.length - 1) await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      } else if (subject === 'NEET 2026 Mock' || currentExamType === 'NEET_MOCK') {
        // Sequential generation for NEET Mock subjects to respect rate limits
        const subjectConfigs = [
          { name: 'Physics' },
          { name: 'Chemistry' },
          { name: 'Biology (Botany)' },
          { name: 'Biology (Zoology)' }
        ];
        const countPerSubject = Math.floor(currentCount / 4);
        const remainder = currentCount % 4;

        for (let i = 0; i < subjectConfigs.length; i++) {
          const config = subjectConfigs[i];
          const subCount = countPerSubject + (i < remainder ? 1 : 0);
          if (subCount > 0) {
            const subjectQs = await generateQuestions(config.name, currentLanguage, 'NEET_MOCK', subCount, undefined, undefined, currentMode);
            qs.push(...subjectQs);
            // Increased gap between subjects to respect 15 RPM
            if (i < subjectConfigs.length - 1) await new Promise(resolve => setTimeout(resolve, 5000));
          }
        }
      } else {
        if (currentExamType === 'MS_CHOUHAN') displaySubject = 'Organic Chemistry';
        if (currentExamType === 'BLACK_BOOK') displaySubject = 'Mathematics';
        if (currentExamType === 'NARENDRA_AVASTHI') displaySubject = 'Physical Chemistry';
        
        qs = await generateQuestions(
          displaySubject, 
          currentLanguage,
          currentExamType,
          currentCount, 
          currentFiles,
          currentDifficulty,
          currentMode
        );
      }
      
      setQuestions(qs);
      if (qs.length > 0) {
        localStorage.setItem('last_attempted_question', qs[0].text);
      }
      setUserAnswers(new Array(qs.length).fill(null));
      setQuestionTimes(new Array(qs.length).fill(0));
      setMarkedForReview(new Array(qs.length).fill(false));
      setVisitedQuestions(new Array(qs.length).fill(false).map((_, i) => i === 0));
      setActiveSubjectTab(qs[0]?.subject || "");
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
        addNotification(`Your DPP for ${displaySubject} is ready!`);
        setView('dpp');
      } else {
        addNotification(`Your ${currentExamType.replace(/_/g, ' ')} Mock Test is ready!`);
        setView('ready');
      }
    } catch (error: any) {
      console.error("Quiz generation error:", error);
      
      const msg = (error?.message || error?.error?.message || (typeof error === 'string' ? error : "")).toLowerCase();
      const status = error?.status || error?.error?.status || "";
      const code = error?.code || error?.error?.code || "";
      
      let errorMessage = "Failed to load questions. ";
      
      if (msg.includes("rpc failed") || msg.includes("xhr error")) {
        errorMessage += "The NITian service is currently experiencing high latency. We've tried retrying, but the connection is still unstable. Please try again in a few moments.";
      } else if (status === "RESOURCE_EXHAUSTED" || msg.includes("429") || msg.includes("quota") || String(code) === "429") {
        errorMessage = "API Rate Limit Exceeded. You've made too many requests in a short time. Please wait about 60 seconds and try again.";
      } else if (msg.includes("exceeds the supported page limit of 1000")) {
        errorMessage = "The uploaded document is too large. Gemini API supports a maximum of 1000 pages per document. Please upload a smaller file or split your PDF.";
      } else if (msg.includes("internal") || status === "INTERNAL" || String(code) === "500") {
        errorMessage += "The NITian service encountered an internal error. This often happens if the request is too complex. Try selecting a specific subject or uploading a smaller file.";
      } else {
        const isMissingKey = msg.includes("api_key_missing") || msg.includes("api key") || !process.env.GEMINI_API_KEY;
        if (isMissingKey) {
          errorMessage = "CRITICAL: Gemini API Key is missing. Please check your environment variables.";
        } else {
          errorMessage += "Please ensure your internet connection is stable and try again. (Error: " + (msg || status || "Unknown") + ")";
        }
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

  const skipQuestion = () => {
    nextQuestion();
  };

  const markForReviewAndNext = () => {
    const newMarked = [...markedForReview];
    newMarked[currentIndex] = true;
    setMarkedForReview(newMarked);
    nextQuestion();
  };

  const clearResponse = () => {
    const newAnswers = [...userAnswers];
    newAnswers[currentIndex] = null;
    setUserAnswers(newAnswers);
  };

  const goToQuestion = (index: number) => {
    // Save current question for offline fallback
    if (questions[index]) {
      localStorage.setItem('last_attempted_question', questions[index].text);
    }
    const now = Date.now();
    const timeSpent = Math.floor((now - lastQuestionStartTime) / 1000);
    const newTimes = [...questionTimes];
    newTimes[currentIndex] += timeSpent;
    setQuestionTimes(newTimes);
    setLastQuestionStartTime(now);

    setCurrentIndex(index);
    setVisitedQuestions(prev => {
      const next = [...prev];
      next[index] = true;
      return next;
    });
  };

  const nextQuestion = () => {
    const now = Date.now();
    const timeSpent = Math.floor((now - lastQuestionStartTime) / 1000);
    const newTimes = [...questionTimes];
    newTimes[currentIndex] += timeSpent;
    setQuestionTimes(newTimes);
    setLastQuestionStartTime(now);

    if (currentIndex < questions.length - 1) {
      const nextIdx = currentIndex + 1;
      setCurrentIndex(nextIdx);
      setVisitedQuestions(prev => {
        const next = [...prev];
        next[nextIdx] = true;
        return next;
      });
    } else {
      incrementQuizCount();
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
      const prevIdx = currentIndex - 1;
      setCurrentIndex(prevIdx);
      setVisitedQuestions(prev => {
        const next = [...prev];
        next[prevIdx] = true;
        return next;
      });
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

  const handleLoadingChatSubmit = async (e?: React.FormEvent, customMsg?: string) => {
    if (e) e.preventDefault();
    const userMsg = customMsg || loadingChatInput.trim();
    if (!userMsg || isLoadingChatReplying) return;

    if (!customMsg) setLoadingChatInput("");
    setLoadingChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoadingChatReplying(true);

    try {
      const reply = await chatDuringLoading([...loadingChatMessages, { role: 'user', content: userMsg }]);
      setLoadingChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (error) {
      setLoadingChatMessages(prev => [...prev, { role: 'assistant', content: "Oops, I had a little hiccup. But don't worry, your quiz is still generating!" }]);
    } finally {
      setIsLoadingChatReplying(false);
    }
  };

  const CHAT_SUGGESTIONS = [
    "How to improve my organic chemistry for JEE and NEET",
    "How to improve my MATH for JEE",
    "How to improve my physics for JEE and NEET"
  ];

  if (loading) {
    const stages = [
      { id: 'syllabus', label: 'Fetching syllabus data', icon: BookOpen, color: 'text-blue-500', bg: 'bg-blue-50' },
      { id: 'questions', label: 'Generating questions', icon: BrainCircuit, color: 'text-purple-500', bg: 'bg-purple-50' },
      { id: 'explanations', label: 'Creating explanations', icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50' },
      { id: 'finalizing', label: 'Finalizing quiz', icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-50' }
    ];

    return (
      <div className={cn(
        "min-h-screen flex flex-col items-center justify-center transition-colors duration-300 p-4",
        theme === 'light' ? "bg-slate-50 text-slate-900" : "bg-slate-950 text-white"
      )}>
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Column: Progress & Stages */}
          <div className="lg:col-span-5 space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold uppercase tracking-widest">
                <div className="w-2 h-2 bg-indigo-600 rounded-full animate-ping" />
                AI Generation in Progress
              </div>
              <h2 className="text-3xl font-bold tracking-tight leading-tight">
                Crafting your <span className="text-indigo-600">Perfect Quiz</span>
              </h2>
              <p className={cn(
                "text-sm",
                theme === 'light' ? "text-slate-500" : "text-slate-400"
              )}>
                Our advanced AI is curating a personalized set of questions based on your selection.
              </p>
            </div>

            {/* Stages List */}
            <div className="space-y-3">
              {stages.map((stage, idx) => {
                const isCompleted = stages.findIndex(s => s.id === loadingStage) > idx;
                const isActive = stage.id === loadingStage;
                
                return (
                  <motion.div 
                    key={stage.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-500",
                      isActive 
                        ? (theme === 'light' ? "bg-white border-indigo-200 shadow-lg shadow-indigo-500/5 scale-105" : "bg-slate-900 border-indigo-500/50 shadow-lg shadow-indigo-500/10 scale-105")
                        : isCompleted
                          ? (theme === 'light' ? "bg-emerald-50/50 border-emerald-100 opacity-60" : "bg-emerald-950/10 border-emerald-900/30 opacity-60")
                          : (theme === 'light' ? "bg-white/50 border-slate-100 opacity-40" : "bg-slate-900/50 border-slate-800 opacity-40")
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      isActive ? stage.bg : (isCompleted ? "bg-emerald-100" : "bg-slate-100")
                    )}>
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <stage.icon className={cn("w-5 h-5", isActive ? stage.color : "text-slate-400")} />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm font-bold",
                        isActive ? (theme === 'light' ? "text-slate-900" : "text-white") : "text-slate-500"
                      )}>
                        {stage.label}
                      </p>
                      {isActive && (
                        <motion.p 
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="text-[10px] text-indigo-600 font-medium mt-0.5"
                        >
                          Processing...
                        </motion.p>
                      )}
                    </div>
                    {isActive && (
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                            className="w-1 h-1 bg-indigo-600 rounded-full"
                          />
                        ))}
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Progress Bar & Time */}
            <div className="space-y-4 pt-4">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Overall Progress</p>
                  <p className="text-2xl font-black text-indigo-600">{Math.round(loadingProgress)}%</p>
                </div>
                <div className="text-right space-y-1">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Remaining</p>
                  <p className="text-sm font-mono font-bold text-slate-600 dark:text-slate-400">
                    {Math.floor(estimatedTime / 60)}m {estimatedTime % 60}s
                  </p>
                </div>
              </div>
              <div className="h-3 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden p-0.5">
                <motion.div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full shadow-[0_0_10px_rgba(79,70,229,0.4)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${loadingProgress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: AI Assistant Chat */}
          <div className="lg:col-span-7">
            <div className={cn(
              "rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all h-[600px] relative",
              theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
            )}>
              <div className={cn(
                "p-5 border-b flex items-center justify-between",
                theme === 'light' ? "bg-slate-50/80 border-slate-200" : "bg-slate-950/80 border-slate-800",
                "backdrop-blur-md"
              )}>
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                      <BrainCircuit className="w-6 h-6 animate-pulse" />
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base">NITian Assistant</h3>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      <p className="text-[10px] text-slate-500 font-medium">Active • Ask me anything!</p>
                    </div>
                  </div>
                </div>
                <div className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-full text-[10px] font-black uppercase tracking-tighter">
                  AI Chat
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
                {loadingChatMessages.length === 0 && (
                  <div className="space-y-6">
                    <div className="flex justify-start">
                      <div className={cn(
                        "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                        theme === 'light' ? "bg-slate-100 text-slate-800" : "bg-slate-800 text-slate-200",
                        "rounded-tl-sm"
                      )}>
                        Hi! I'm your AI study partner. While I'm preparing your quiz, would you like to discuss any specific topic or need some last-minute tips?
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {CHAT_SUGGESTIONS.map((suggestion, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleLoadingChatSubmit(undefined, suggestion)}
                          className={cn(
                            "px-4 py-3 rounded-xl text-left text-xs font-medium transition-all flex items-center gap-2 group",
                            theme === 'light' 
                              ? "bg-white text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200" 
                              : "bg-slate-800 text-slate-300 hover:bg-indigo-900/30 hover:text-indigo-400 border border-slate-700 hover:border-indigo-900/50"
                          )}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover:scale-150 transition-transform" />
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {loadingChatMessages.map((msg, idx) => (
                  <div key={idx} className={cn(
                    "flex",
                    msg.role === 'user' ? "justify-end" : "justify-start"
                  )}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl p-4 text-sm leading-relaxed shadow-sm",
                      msg.role === 'user' 
                        ? "bg-indigo-600 text-white rounded-tr-sm" 
                        : (theme === 'light' ? "bg-slate-100 text-slate-800 rounded-tl-sm" : "bg-slate-800 text-slate-200 rounded-tl-sm")
                    )}>
                      <Markdown>{msg.content}</Markdown>
                    </div>
                  </div>
                ))}
                {isLoadingChatReplying && (
                  <div className="flex justify-start">
                    <div className={cn(
                      "max-w-[80%] rounded-2xl p-4 text-sm flex items-center gap-2 shadow-sm",
                      theme === 'light' ? "bg-slate-100 text-slate-800" : "bg-slate-800 text-slate-200",
                      "rounded-tl-sm"
                    )}>
                      <div className="flex gap-1">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                            transition={{ repeat: Infinity, duration: 1, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 bg-indigo-400 rounded-full"
                          />
                        ))}
                      </div>
                      <span className="text-xs font-medium text-slate-500">NITian is typing...</span>
                    </div>
                  </div>
                )}
                <div ref={loadingChatEndRef} />
              </div>

              <div className={cn(
                "p-4 border-t",
                theme === 'light' ? "bg-slate-50 border-slate-200" : "bg-slate-950 border-slate-800"
              )}>
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleLoadingChatSubmit();
                  }}
                  className="relative"
                >
                  <input
                    type="text"
                    value={loadingChatInput}
                    onChange={(e) => setLoadingChatInput(e.target.value)}
                    placeholder="Ask a question while you wait..."
                    className={cn(
                      "w-full pl-4 pr-12 py-3 rounded-xl border text-sm transition-all focus:ring-2 focus:ring-indigo-500 outline-none",
                      theme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700 text-white"
                    )}
                  />
                  <button
                    type="submit"
                    disabled={!loadingChatInput.trim() || isLoadingChatReplying}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full shadow-sm">
          <div className="flex -space-x-2">
            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-slate-800">G</div>
            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-slate-800">S</div>
          </div>
          <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Grounded by Google Search</span>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen pb-12 transition-colors duration-300",
      theme === 'light' ? "bg-white text-slate-900" : "bg-slate-900 text-slate-100"
    )}>
      <InstallBanner />
      {/* Navigation */}
      <nav className={cn(
        "border-b sticky top-0 z-10 transition-colors duration-300",
        theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
      )}>
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={resetQuiz}>
            <GraduationCap className={cn("w-8 h-8", theme === 'light' ? "text-indigo-600" : "text-indigo-400")} />
            <span className={cn("text-xl font-bold tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>RankBoost with NITian</span>
          </div>
          <div className="flex items-center gap-4">
            <span 
              className={cn("text-sm font-bold hidden md:block", theme === 'light' ? "text-slate-500" : "text-slate-400")}
              style={{ borderColor: '#f1d6d6' }}
            >
              NITian(Niraj YADAV)
            </span>
            <button
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className={cn(
                "p-2 rounded-xl transition-colors",
                theme === 'light' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
              )}
              title={theme === 'light' ? "Switch to Dark Mode" : "Switch to Light Mode"}
            >
              {theme === 'light' ? (
                <Moon 
                  className="w-[30px] h-[30px]" 
                  style={{ 
                    borderWidth: '0px', 
                    backgroundColor: '#d7d7d7', 
                    width: '30px', 
                    height: '30px', 
                    color: '#ee0808' 
                  }} 
                />
              ) : (
                <Sun 
                  className="w-[30px] h-[30px]" 
                  style={{ 
                    borderWidth: '0px', 
                    backgroundColor: '#d7d7d7', 
                    width: '30px', 
                    height: '30px', 
                    color: '#ee0808' 
                  }} 
                />
              )}
            </button>

            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className={cn(
                  "p-2 rounded-xl transition-colors relative",
                  theme === 'light' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
                )}
              >
                <Bell className="w-6 h-6" />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-rose-500 border-2 border-white dark:border-slate-900 rounded-full" />
                )}
              </button>

              {showNotifications && (
                <div className={cn(
                  "absolute right-0 mt-2 w-80 rounded-2xl border shadow-xl z-50 overflow-hidden",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700"
                )}>
                  <div className="p-4 border-b flex items-center justify-between">
                    <h4 className="font-bold text-sm">Notifications</h4>
                    <button 
                      onClick={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
                      className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider hover:underline"
                    >
                      Mark all as read
                    </button>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.map(notif => (
                        <div 
                          key={notif.id} 
                          className={cn(
                            "p-4 border-b last:border-0 transition-colors",
                            notif.read ? "opacity-60" : "bg-indigo-50/30"
                          )}
                        >
                          <p className="text-xs text-slate-700 dark:text-slate-200 leading-relaxed">{notif.message}</p>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {new Date(notif.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {!isSubscribed && (
              <div className="hidden sm:flex items-center gap-2">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                  quizCount >= 5 ? "bg-rose-100 text-rose-600" : "bg-emerald-100 text-emerald-600"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", quizCount >= 5 ? "bg-rose-600" : "bg-emerald-600")} />
                  {5 - quizCount > 0 ? `${5 - quizCount} Quizzes Left` : 'Quiz Limit'}
                </div>
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5",
                  doubtCount >= 5 ? "bg-rose-100 text-rose-600" : "bg-indigo-100 text-indigo-600"
                )}>
                  <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", doubtCount >= 5 ? "bg-rose-600" : "bg-indigo-600")} />
                  {5 - doubtCount > 0 ? `${5 - doubtCount} Doubts Left` : 'Doubt Limit'}
                </div>
              </div>
            )}
            <a
              href="https://razorpay.me/@nitianvisionpointbynirajkumar"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
            >
              <Zap className="w-4 h-4" />
              <span className="hidden sm:inline">{isSubscribed ? 'Premium' : 'Upgrade'}</span>
            </a>
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
                  Master your exams with <span className="text-indigo-600">NITian</span>
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
                {/* Custom Quiz Builder Card */}
                <div 
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors col-span-1 md:col-span-2 lg:col-span-1 flex flex-col",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  )}
                  style={{ borderColor: '#0469f4', borderWidth: '3px' }}
                >
                  <h3 className={cn("font-bold flex items-center gap-2", theme === 'light' ? "text-slate-900" : "text-white")}>
                    <BookOpen className="w-5 h-5 text-indigo-600" />
                    <span className="italic font-serif">Custom Quiz Builder</span>
                  </h3>
                  
                  <div className="space-y-4 flex-1">
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Subject</label>
                        <div className={cn(
                          "flex flex-wrap rounded-xl border overflow-hidden p-1 gap-1",
                          theme === 'light' ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-800"
                        )}>
                          {(['Physics', 'Chemistry', 'Mathematics', 'Biology', 'Custom'] as const).map(sub => (
                            <button
                              key={sub}
                              onClick={() => {
                                setSyllabusSubject(sub);
                                if (sub !== 'Custom') {
                                  setSyllabusTopic(SYLLABUS[sub as keyof typeof SYLLABUS][0]);
                                  setCustomSubject(SYLLABUS[sub as keyof typeof SYLLABUS][0]);
                                } else {
                                  setSyllabusTopic("");
                                  setCustomSubject("");
                                }
                              }}
                              className={cn(
                                "flex-1 min-w-[70px] py-1.5 text-[10px] font-bold rounded-lg transition-all",
                                syllabusSubject === sub 
                                  ? "bg-indigo-600 text-white shadow-sm" 
                                  : (theme === 'light' ? "text-slate-500 hover:bg-slate-50" : "text-slate-400 hover:bg-slate-700")
                              )}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      </div>

                      {syllabusSubject !== 'Custom' ? (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Topic / Chapter</label>
                          <select
                            value={syllabusTopic}
                            onChange={(e) => {
                              setSyllabusTopic(e.target.value);
                              setCustomSubject(e.target.value);
                            }}
                            className={cn(
                              "w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm appearance-none bg-transparent",
                              theme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700 text-white"
                            )}
                          >
                            {SYLLABUS[syllabusSubject as keyof typeof SYLLABUS].map(topic => (
                              <option key={topic} value={topic}>{topic}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Custom Topic</label>
                          <input 
                            type="text"
                            placeholder="e.g. Thermodynamics, Indian History..."
                            value={customSubject}
                            onChange={(e) => setCustomSubject(e.target.value)}
                            className={cn(
                              "w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm",
                              theme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700 text-white"
                            )}
                          />
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Exam Type</label>
                        <select
                          value={customExamType}
                          onChange={(e) => setCustomExamType(e.target.value as ExamType)}
                          className={cn(
                            "w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm appearance-none bg-transparent",
                            theme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700 text-white"
                          )}
                        >
                          {EXAM_TYPES.map(type => (
                            <option key={type.id} value={type.id}>{type.id}</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Questions</label>
                        <input 
                          type="number"
                          min="1"
                          max="25"
                          value={customQuestionCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            if (!isNaN(val)) setCustomQuestionCount(Math.min(25, Math.max(1, val)));
                          }}
                          className={cn(
                            "w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all text-sm",
                            theme === 'light' ? "bg-white border-slate-200" : "bg-slate-800 border-slate-700 text-white"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Difficulty</label>
                      <div className={cn(
                        "flex rounded-xl border overflow-hidden p-1 gap-1",
                        theme === 'light' ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-800"
                      )}>
                        {['EASY', 'MEDIUM', 'HARD'].map(diff => (
                          <button
                            key={diff}
                            onClick={() => setCustomDifficulty(diff as any)}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg transition-all",
                              customDifficulty === diff 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : (theme === 'light' ? "text-slate-500 hover:bg-slate-50" : "text-slate-400 hover:bg-slate-700")
                            )}
                          >
                            {diff}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Medium (Language)</label>
                      <div className={cn(
                        "flex rounded-xl border overflow-hidden p-1 gap-1",
                        theme === 'light' ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-800"
                      )}>
                        {LANGUAGES.map(lang => (
                          <button
                            key={lang.id}
                            onClick={() => setCustomLanguage(lang.id)}
                            className={cn(
                              "flex-1 py-2 text-xs font-bold rounded-lg transition-all uppercase",
                              customLanguage === lang.id 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : (theme === 'light' ? "text-slate-500 hover:bg-slate-50" : "text-slate-400 hover:bg-slate-700")
                            )}
                          >
                            {lang.id}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Intelligence Mode</label>
                      <div className={cn(
                        "flex rounded-xl border overflow-hidden p-1 gap-1",
                        theme === 'light' ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-800"
                      )}>
                        {[
                          { id: 'fast', label: 'Fast', icon: Zap },
                          { id: 'standard', label: 'Standard', icon: BrainCircuit },
                          { id: 'thinking', label: 'Thinking', icon: Sparkles }
                        ].map(m => (
                          <button
                            key={m.id}
                            onClick={() => setCustomQuizMode(m.id as QuizMode)}
                            className={cn(
                              "flex-1 py-2 text-[10px] font-bold rounded-lg transition-all flex flex-col items-center gap-1",
                              customQuizMode === m.id 
                                ? "bg-indigo-600 text-white shadow-sm" 
                                : (theme === 'light' ? "text-slate-500 hover:bg-slate-50" : "text-slate-400 hover:bg-slate-700")
                            )}
                          >
                            <m.icon className="w-3 h-3" />
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => startQuiz(customSubject || 'General', customExamType, customQuestionCount, customDifficulty, customLanguage, [], customQuizMode)}
                    disabled={!customSubject}
                    className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none mt-auto"
                  >
                    <PlayCircle className="w-5 h-5" />
                    GENERATE CUSTOM QUIZ
                  </button>
                </div>

                {/* AI Doubt Solver Card */}
                <div 
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors col-span-1 md:col-span-2 lg:col-span-1 bg-gradient-to-br from-indigo-600 to-violet-700 text-white border-transparent",
                  )}
                  style={{ borderColor: '#f80a0a', borderWidth: '2px' }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-white">
                      <Sparkles className="w-5 h-5 text-white" />
                      AI Doubt Solver
                    </h3>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">New</span>
                  </div>
                  <p className="text-sm text-indigo-100 leading-relaxed">
                    Stuck on a problem? Upload an image or type your doubt to get instant, detailed step-by-step solutions for JEE & NEET.
                  </p>
                  <button
                    onClick={() => setView('doubt')}
                    className="w-full py-3 bg-white text-indigo-600 rounded-xl font-bold hover:bg-indigo-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
                  >
                    <MessageSquare className="w-4 h-4" />
                    Ask a Doubt
                  </button>
                </div>

                {/* PYQ Solver Card */}
                <div 
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-transparent",
                  )}
                  style={{ borderColor: '#0101dc', borderWidth: '3px' }}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold flex items-center gap-2 text-white">
                      <FileText className="w-5 h-5 text-white" />
                      Previous Year Questions
                    </h3>
                    <span className="px-2 py-0.5 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">PYQ</span>
                  </div>
                  <p className="text-sm text-emerald-100 leading-relaxed">
                    Access a comprehensive database of previous year JEE and NEET questions with detailed solutions and analysis.
                  </p>
                  <a
                    href="https://jee-neet-solver.in/exam_selection"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-white text-emerald-600 rounded-xl font-bold hover:bg-emerald-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20"
                  >
                    <Link className="w-4 h-4" />
                    Solve PYQs Now
                  </a>
                </div>

                {/* Language Selection */}
                <div 
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  )}
                  style={{ borderColor: '#0b67ea', borderWidth: '3px' }}
                >
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
                    <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">NITian</span>
                  </div>
                </div>

                {/* Exam Type Selection */}
                <div 
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  )}
                  style={{ borderColor: '#e40000', borderWidth: '2px' }}
                >
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
                <div 
                  className={cn(
                    "p-6 rounded-3xl border shadow-sm space-y-4 transition-colors",
                    theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                  )}
                  style={{ borderColor: '#0a62cd', borderWidth: '3px' }}
                >
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
                    style={{ borderWidth: '4px', borderColor: '#0d6def' }}
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

                  <div 
                    className={cn(
                      "w-full md:w-72 p-6 rounded-3xl border-2 flex flex-col justify-between",
                      theme === 'light' ? "bg-white border-slate-100" : "bg-slate-900 border-slate-800"
                    )}
                    style={{ borderColor: '#fe0808', borderWidth: '3px' }}
                  >
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-end">
                          <label 
                            className="text-[10px] font-bold text-slate-400 uppercase tracking-wider"
                            style={{ fontSize: '10px', lineHeight: '18px', color: '#0151bc' }}
                          >
                            Number of Questions
                          </label>
                          <div className="flex items-center gap-2">
                            <input 
                              type="number"
                              min="1"
                              max="25"
                              value={questionCount}
                              onChange={(e) => {
                                const val = parseInt(e.target.value);
                                if (!isNaN(val)) setQuestionCount(Math.min(25, Math.max(1, val)));
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
                          max="25" 
                          step="1"
                          value={questionCount} 
                          onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                          className={cn(
                            "w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                          )}
                        />
                        <div className="flex justify-between text-[10px] text-slate-400 font-bold px-1">
                          <span>1</span>
                          <span>25</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">AI Intelligence Mode</label>
                        <div className={cn(
                          "flex rounded-xl border overflow-hidden p-1 gap-1",
                          theme === 'light' ? "border-slate-200 bg-white" : "border-slate-700 bg-slate-800"
                        )}>
                          {[
                            { id: 'fast', label: 'Fast', icon: Zap },
                            { id: 'standard', label: 'Standard', icon: BrainCircuit },
                            { id: 'thinking', label: 'Thinking', icon: Sparkles }
                          ].map(m => (
                            <button
                              key={m.id}
                              onClick={() => setQuizMode(m.id as QuizMode)}
                              className={cn(
                                "flex-1 py-1.5 text-[9px] font-bold rounded-lg transition-all flex flex-col items-center gap-1",
                                quizMode === m.id 
                                  ? "bg-indigo-600 text-white shadow-sm" 
                                  : (theme === 'light' ? "text-slate-500 hover:bg-slate-50" : "text-slate-400 hover:bg-slate-700")
                              )}
                            >
                              <m.icon className="w-3 h-3" />
                              {m.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3 mt-4">
                      <button
                        onClick={() => startQuiz(uploadedFiles.length > 0 ? 'Uploaded Material' : (selectedSubject || 'General'), examType, questionCount, difficulty, language, uploadedFiles.length > 0 ? uploadedFiles.map(f => ({ data: f.data, mimeType: f.mimeType })) : undefined)}
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
                          <span className="text-sm" style={{ borderColor: '#1b64d3', color: '#0b66f1' }}>Exam Quiz</span>
                        </div>
                      </button>

                      <button
                        onClick={() => startQuiz(uploadedFiles.length > 0 ? 'Uploaded Material' : (selectedSubject || 'General'), 'DPP', questionCount, difficulty, language, uploadedFiles.length > 0 ? uploadedFiles.map(f => ({ data: f.data, mimeType: f.mimeType })) : undefined)}
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
                          <span className="text-sm" style={{ color: '#ef0c6d' }}>Create DPP</span>
                        </div>
                      </button>
                    </div>

                    <div className="mt-2 text-center" style={{ fontSize: '18px', color: '#0f52f1' }}>
                      <span 
                        className={cn("text-[10px] opacity-80 font-medium", theme === 'light' ? "text-slate-500" : "text-slate-400")}
                        style={{ color: '#ff0b0b', fontSize: '17px' }}
                      >
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

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                {SUBJECTS.map((subject, index) => {
                  const customBorders = ['#13c5d6', '#cca81a', '#cc9396', '#e4abeb', '#97a7f5', '#d25059'];
                  return (
                    <motion.button
                      key={subject.id}
                      whileHover={{ y: -5 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setSelectedSubject(subject.id)}
                      className={cn(
                        "flex flex-col items-center p-6 rounded-3xl border-2 transition-all text-center group relative overflow-hidden",
                        selectedSubject === subject.id 
                          ? (theme === 'light' ? "border-indigo-600 bg-indigo-50/50" : "border-indigo-400 bg-indigo-950/20")
                          : (theme === 'light' ? "border-slate-100 bg-white" : "border-slate-800 bg-slate-900"),
                        "hover:shadow-xl hover:shadow-indigo-500/10"
                      )}
                      style={{ 
                        borderColor: selectedSubject === subject.id ? undefined : customBorders[index], 
                        borderWidth: '3px' 
                      }}
                    >
                      <div className={cn(
                        "p-4 rounded-2xl mb-4 transition-all duration-300 group-hover:scale-110 group-hover:rotate-3 shadow-sm",
                        theme === 'light' ? subject.bg : subject.darkBg
                      )}>
                        <subject.icon className={cn("w-8 h-8", subject.color)} />
                      </div>
                      <div className="space-y-1">
                        <h3 className={cn("text-base font-bold tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
                          {subject.id}
                        </h3>
                        <p className={cn("text-[10px] font-bold uppercase tracking-widest opacity-60", theme === 'light' ? "text-slate-500" : "text-slate-400")}>
                          Practice Now
                        </p>
                      </div>
                      
                      {selectedSubject === subject.id && (
                        <div className="absolute top-3 right-3">
                          <div className="bg-indigo-600 text-white p-1 rounded-full shadow-lg">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                      )}
                    </motion.button>
                  );
                })}
              </div>

              <div 
                className={cn(
                  "p-8 rounded-3xl border shadow-sm transition-colors",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}
                style={{ borderWidth: '3px', borderColor: '#0c70f5' }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <BrainCircuit className="w-6 h-6 text-indigo-600" />
                  </div>
                  <h2 className={cn("text-xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>Why RankBoost with NITian?</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <h4 className={cn("font-semibold", theme === 'light' ? "text-slate-800" : "text-slate-200")}>Dynamic Questions</h4>
                    <p className={cn("text-sm", theme === 'light' ? "text-slate-600" : "text-slate-400")}>Never see the same question twice. NITian generates fresh content every time.</p>
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

              <div className={cn(
                "p-8 rounded-3xl border shadow-sm transition-colors mt-8 text-center",
                theme === 'light' ? "bg-indigo-50 border-indigo-100" : "bg-indigo-900/20 border-indigo-900/30"
              )}>
                <div className="flex flex-col items-center gap-4" style={{ borderColor: '#b52044', borderWidth: '1px' }}>
                  <div className="p-3 bg-indigo-100 rounded-full">
                    <Zap className="w-8 h-8 text-indigo-600" />
                  </div>
                  <div className="space-y-2">
                    <h2 
                      className={cn("text-2xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}
                      style={{ color: '#eb0f58' }}
                    >
                      Support NITian
                    </h2>
                    <p 
                      className={cn("text-sm max-w-md mx-auto", theme === 'light' ? "text-slate-600" : "text-slate-400")}
                      style={{ color: '#005bd9', fontSize: '14px' }}
                    >
                      If you find this tool helpful, consider supporting the development. Your contributions help keep the service running and free for everyone!
                    </p>
                  </div>
                  <a
                    href="https://razorpay.me/@nitianvisionpointbynirajkumar"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center gap-2"
                  >
                    <Zap className="w-5 h-5" />
                    Contribute Now
                  </a>
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
            <div className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden font-sans">
              {/* Top Header */}
              <div className="bg-[#337ab7] text-white px-4 py-1.5 flex items-center justify-between shadow-md relative z-[120]">
                <div className="flex items-center gap-2 md:gap-4">
                  <button 
                    onClick={() => setShowMobilePalette(!showMobilePalette)}
                    className="lg:hidden p-1 hover:bg-white/10 rounded transition-colors"
                  >
                    <Layout className="w-5 h-5" />
                  </button>
                  <h1 className="text-lg md:text-xl font-black italic tracking-tighter uppercase">NITian AI</h1>
                </div>
                <div className="absolute left-1/2 -translate-x-1/2 font-bold uppercase text-[10px] md:text-sm tracking-widest hidden sm:block">
                  {examType === 'JEE_MAIN_MOCK' ? 'JEE MAIN MOCK' : examType === 'NEET_MOCK' ? 'NEET 2026 MOCK' : (selectedSubject || 'MOCK TEST')}
                </div>
                <div className="flex items-center gap-2 bg-black/20 px-2 md:px-3 py-1 rounded border border-white/10">
                  <Clock className="w-3 h-3 md:w-4 h-4" />
                  <span className="font-mono font-bold text-sm md:text-lg">
                    {formatTime(Math.max(0, timeLimit - timeElapsed))}
                  </span>
                </div>
              </div>

              {/* Subject Tabs */}
              <div className="bg-white border-b flex items-center overflow-x-auto scrollbar-hide">
                {Array.from(new Set(questions.map(q => q.subject))).map((sub, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSubjectTabClick(sub)}
                    className={cn(
                      "px-6 py-3 text-xs font-bold transition-all border-r border-slate-200 whitespace-nowrap uppercase tracking-wider",
                      activeSubjectTab === sub 
                        ? "bg-[#337ab7] text-white" 
                        : "bg-white text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {sub}
                  </button>
                ))}
                <div className="flex-1 bg-slate-50 h-full border-l" />
              </div>

              {/* Main Content Area */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Side: Question Area */}
                <div className="flex-1 flex flex-col overflow-hidden bg-white">
                  <div className="p-3 border-b flex items-center justify-between bg-white">
                    <h2 className="font-bold text-sm md:text-base text-slate-800 shrink-0">Q. {currentIndex + 1}</h2>
                    <div className="flex items-center gap-2 md:gap-6 overflow-hidden">
                      <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-500">
                        <span>View in:</span>
                        <select className="border rounded px-2 py-1 bg-white outline-none text-[11px]">
                          <option>English</option>
                          <option>Hindi</option>
                        </select>
                      </div>
                      <div className="flex items-center gap-2 md:gap-3 text-[10px] md:text-[11px] font-bold whitespace-nowrap">
                        <div className="flex items-center gap-1 text-slate-500">
                           <div className="w-3 h-3 md:w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[7px] md:text-[8px] font-black">i</div>
                           <span className="hidden xs:inline">Marks:</span>
                        </div>
                        <span className="text-emerald-600">+{examType === 'NEET_MOCK' || examType === 'NEET' ? '4' : '4'}</span>
                        <span className="text-slate-300">,</span>
                        <span className="text-rose-600">-{examType === 'NEET_MOCK' || examType === 'NEET' ? '1' : '1'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 md:p-10">
                    <div className="max-w-4xl mx-auto space-y-6 md:space-y-8">
                      <div className="text-base md:text-lg text-slate-900 leading-relaxed font-semibold">
                        <LatexMarkdown content={questions[currentIndex].text} />
                      </div>

                      {questions[currentIndex].diagramUrl && (
                        <div className="flex justify-center py-4">
                          <img 
                            src={questions[currentIndex].diagramUrl} 
                            alt="Question Diagram" 
                            className="max-w-full h-auto rounded-xl border shadow-sm"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-1 gap-6 pt-4">
                        {questions[currentIndex].options?.map((option, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleAnswer(idx)}
                            className="flex items-center gap-4 group text-left"
                          >
                            <div className={cn(
                              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all",
                              userAnswers[currentIndex] === idx
                                ? "border-[#337ab7]"
                                : "border-slate-300 group-hover:border-slate-400"
                            )}>
                              {userAnswers[currentIndex] === idx && <div className="w-2.5 h-2.5 bg-[#337ab7] rounded-full" />}
                            </div>
                            <div className={cn(
                               "text-slate-700 font-medium transition-colors",
                               userAnswers[currentIndex] === idx ? "text-[#337ab7]" : "group-hover:text-slate-900"
                            )}>
                              <LatexMarkdown content={option} />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Bottom Footer */}
                  <div className="p-2 md:p-3 border-t bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2 md:gap-3">
                      <button
                        onClick={markForReviewAndNext}
                        className="flex-1 sm:flex-none px-3 md:px-5 py-2 border border-slate-300 rounded text-[10px] md:text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                      >
                        <span className="sm:hidden">Review</span>
                        <span className="hidden sm:inline">Mark for Review & Next</span>
                      </button>
                      <button
                        onClick={clearResponse}
                        className="flex-1 sm:flex-none px-3 md:px-5 py-2 border border-slate-300 rounded text-[10px] md:text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm whitespace-nowrap"
                      >
                        Clear
                      </button>
                    </div>
                    <button
                      onClick={nextQuestion}
                      className="w-full sm:w-auto px-6 md:px-10 py-2.5 bg-[#337ab7] text-white rounded text-[11px] md:text-xs font-bold hover:bg-[#286090] transition-all shadow-md uppercase tracking-wider"
                    >
                      {currentIndex === questions.length - 1 ? 'Save & Finish' : 'Save & Next'}
                    </button>
                  </div>
                </div>

                {/* Mobile Palette Overlay */}
                <AnimatePresence>
                  {showMobilePalette && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={() => setShowMobilePalette(false)}
                      className="fixed inset-0 z-[105] bg-black/50 lg:hidden"
                    />
                  )}
                </AnimatePresence>

                {/* Right Sidebar */}
                <div className={cn(
                  "fixed inset-y-0 right-0 z-[110] w-72 md:w-80 bg-white border-l flex flex-col overflow-hidden transition-transform duration-300 lg:static lg:translate-x-0",
                  showMobilePalette ? "translate-x-0" : "translate-x-full"
                )}>
                  {/* Mobile Close Button */}
                  <div className="lg:hidden p-4 border-b flex items-center justify-between bg-slate-50">
                    <span className="font-bold text-slate-700">Question Palette</span>
                    <button onClick={() => setShowMobilePalette(false)} className="p-1 hover:bg-slate-200 rounded">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  {/* User Profile */}
                  <div className="p-4 bg-white border-b flex items-center gap-4">
                    <div className="w-14 h-14 rounded bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                      <Users className="w-10 h-10" />
                    </div>
                    <div className="flex-1">
                       <div className="text-[10px] font-bold text-slate-400 uppercase">Time Left:</div>
                       <div className="text-xl font-mono font-bold text-slate-800 leading-tight">
                         {formatTime(Math.max(0, timeLimit - timeElapsed))}
                       </div>
                       <div className="text-xs font-bold text-slate-700 mt-1">
                         Aspirant Name
                       </div>
                    </div>
                  </div>

                  {/* Status Summary */}
                  <div className="p-4 grid grid-cols-2 gap-y-3 gap-x-2 border-b bg-white">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#5cb85c] rounded flex items-center justify-center text-white text-[10px] font-bold">
                        {userAnswers.filter((a, i) => a !== null && !markedForReview[i]).length}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#d9534f] rounded flex items-center justify-center text-white text-[10px] font-bold">
                        {visitedQuestions.filter((v, i) => v && userAnswers[i] === null && !markedForReview[i]).length}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">Not Answered</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-white border border-slate-300 rounded flex items-center justify-center text-slate-600 text-[10px] font-bold">
                        {questions.length - visitedQuestions.filter(v => v).length}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">Not Visited</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-[#8e44ad] rounded-full flex items-center justify-center text-white text-[10px] font-bold">
                        {markedForReview.filter((m, i) => m && userAnswers[i] === null).length}
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">Marked for Review</span>
                    </div>
                    <div className="flex items-center gap-2 col-span-2">
                      <div className="w-6 h-6 bg-[#8e44ad] rounded-full flex items-center justify-center text-white text-[10px] font-bold relative">
                        {markedForReview.filter((m, i) => m && userAnswers[i] !== null).length}
                        <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-[#5cb85c] rounded-full border border-white" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500">Answered & Marked for Review (will be considered for evaluation)</span>
                    </div>
                  </div>

                  {/* Question Palette */}
                  <div className="bg-[#337ab7] text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider">
                    {activeSubjectTab}
                  </div>
                  <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                    <div className="text-[11px] font-bold text-slate-800 mb-4">Choose a Question</div>
                    <div className="grid grid-cols-5 gap-2">
                      {questions.map((_, idx) => {
                        const status = getQuestionStatus(idx);
                        return (
                          <button
                            key={idx}
                            onClick={() => goToQuestion(idx)}
                            className={cn(
                              "w-10 h-10 rounded flex items-center justify-center text-xs font-bold transition-all border relative",
                              currentIndex === idx ? "ring-2 ring-[#337ab7] ring-offset-1" : "",
                              status === 'answered' ? "bg-[#5cb85c] text-white border-[#4cae4c]" :
                              status === 'not-answered' ? "bg-[#d9534f] text-white border-[#d43f3a]" :
                              status === 'marked' ? "bg-[#8e44ad] text-white border-[#7d3c98] rounded-full" :
                              status === 'answered-marked' ? "bg-[#8e44ad] text-white border-[#7d3c98] rounded-full" :
                              "bg-white text-slate-600 border-slate-300"
                            )}
                          >
                            {idx + 1}
                            {status === 'answered-marked' && (
                              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#5cb85c] rounded-full border border-white" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="p-3 border-t bg-white">
                    <button
                      onClick={() => setView('results')}
                      className="w-full py-2.5 bg-[#5cb85c] text-white rounded font-bold text-sm hover:bg-[#4cae4c] transition-all shadow-md uppercase tracking-wider"
                    >
                      Submit Test
                    </button>
                  </div>
                </div>
              </div>
            </div>
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
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleShare}
                        disabled={isSharing}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all shadow-lg shadow-indigo-200",
                          theme === 'light' 
                            ? "bg-indigo-600 text-white hover:bg-indigo-700" 
                            : "bg-indigo-500 text-white hover:bg-indigo-600",
                          isSharing && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Share2 className="w-4 h-4" />
                        {isSharing ? "Generating..." : "Share Link"}
                      </button>
                      <div className="p-3 bg-indigo-50 rounded-2xl">
                        <TrendingUp className="w-6 h-6 text-indigo-600" />
                      </div>
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
                  <h2 className={cn("text-4xl font-bold tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>Quiz Results</h2>
                  {sharedResult && (
                    <div className="flex items-center justify-center gap-2 text-indigo-600 font-bold">
                      <Users className="w-5 h-5" />
                      <span>Shared by {sharedResult.userName}</span>
                    </div>
                  )}
                  <p className={cn("text-lg", theme === 'light' ? "text-slate-600" : "text-slate-400")}>
                    Detailed performance analysis of your {selectedSubject} {examType} session.
                  </p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 py-6">
                  <div className={cn("p-4 rounded-2xl border transition-all", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700")}>
                    <div className={cn(
                      "text-2xl font-bold",
                      calculateResults().totalMarks > 0 ? "text-emerald-600" : calculateResults().totalMarks < 0 ? "text-rose-600" : theme === 'light' ? "text-slate-900" : "text-white"
                    )}>
                      {calculateResults().totalMarks}/{calculateResults().maxMarks}
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Marks</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border transition-all", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700")}>
                    <div className={cn("text-2xl font-bold text-emerald-600")}>+{calculateResults().correct * 4}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Correct ({calculateResults().correct})</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border transition-all", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700")}>
                    <div className={cn("text-2xl font-bold text-rose-600")}>-{calculateResults().incorrect}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Incorrect ({calculateResults().incorrect})</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border transition-all", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700")}>
                    <div className={cn("text-2xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>{formatTime(timeElapsed)}</div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Time Taken</div>
                  </div>
                  <div className={cn("p-4 rounded-2xl border transition-all", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700")}>
                    <div className={cn("text-2xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>
                      {questions.length > 0 ? Math.round((calculateResults().correct / questions.length) * 100) : 0}%
                    </div>
                    <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Accuracy</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 justify-center flex-wrap">
                  <button
                    onClick={() => {
                      const el = document.getElementById('review-solutions');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-200"
                  >
                    <BookOpen className="w-5 h-5" />
                    Review Solutions
                  </button>
                  <button
                    onClick={() => {
                      if (!isSubscribed && quizCount >= 4) {
                        setShowPaywall(true);
                      } else {
                        setView('report');
                      }
                    }}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200"
                  >
                    <BarChart3 className="w-5 h-5" />
                    Performance Report
                  </button>
                  <button
                    onClick={handleShare}
                    disabled={isSharing}
                    className={cn(
                      "px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-200",
                      theme === 'light' ? "bg-indigo-600 text-white hover:bg-indigo-700" : "bg-indigo-500 text-white hover:bg-indigo-600",
                      isSharing && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Share2 className="w-5 h-5" />
                    {isSharing ? "Generating..." : "Share Results"}
                  </button>
                  <button
                    onClick={downloadDpp}
                    disabled={isDownloading}
                    className={cn(
                      "px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                      theme === 'light' ? "bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50" : "bg-slate-800 text-indigo-400 border border-slate-700 hover:bg-slate-700"
                    )}
                  >
                    {isDownloading ? (
                      <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Download className="w-5 h-5" />
                    )}
                    Download DPP
                  </button>
                  <button
                    onClick={() => {
                      if (sharedResult) {
                        resetQuiz();
                      } else if (lastQuizParams) {
                        startQuiz(
                          lastQuizParams.subject, 
                          lastQuizParams.examType, 
                          lastQuizParams.count, 
                          lastQuizParams.difficulty, 
                          lastQuizParams.language, 
                          lastQuizParams.files,
                          lastQuizParams.mode
                        );
                      } else {
                        startQuiz(selectedSubject!);
                      }
                    }}
                    className="px-8 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                  >
                    {sharedResult ? (
                      <>
                        <Sparkles className="w-5 h-5 text-indigo-600" />
                        Create Your Own Quiz
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-5 h-5" />
                        Try Again
                      </>
                    )}
                  </button>
                  <button
                    onClick={resetQuiz}
                    className="px-8 py-3 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all"
                  >
                    Home
                  </button>
                </div>
              </div>

              <div className="space-y-6" id="review-solutions">
                <div className="flex items-center justify-between px-2">
                  <h3 className={cn("text-2xl font-bold tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>Detailed Solutions</h3>
                  <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest">
                    <BookOpen className="w-3 h-3" /> Step-by-Step Analysis
                  </div>
                </div>
                <div className="space-y-6">
                  {questions.map((q, idx) => (
                    <div key={q.id} className={cn(
                      "p-8 rounded-3xl border shadow-sm space-y-6 transition-all hover:shadow-md",
                      theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                    )}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="text-xs font-bold text-slate-400 uppercase">Question {idx + 1}</div>
                            <span className={cn(
                              "px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold uppercase tracking-wider",
                              q.type === 'MATCH' ? 'bg-indigo-100 text-indigo-700' :
                              q.type === 'STATEMENT' ? 'bg-amber-100 text-amber-700' :
                              'bg-slate-100 text-slate-700'
                            )}>
                              {q.type}
                            </span>
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
                          <div className={cn("text-xl font-medium leading-relaxed", theme === 'light' ? "text-slate-800" : "text-slate-100")}>
                            <LatexMarkdown content={q.text} />
                          </div>

                          {q.type === 'MATCH' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
                              <div className={cn("p-3 rounded-xl border text-xs", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700")}>
                                <div className="font-bold text-slate-400 uppercase mb-2">List I</div>
                                <ul className="space-y-1">
                                  {q.list1?.map((item, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="font-bold text-indigo-600">({String.fromCharCode(65 + i)})</span>
                                      <LatexMarkdown content={item} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                              <div className={cn("p-3 rounded-xl border text-xs", theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-800 border-slate-700")}>
                                <div className="font-bold text-slate-400 uppercase mb-2">List II</div>
                                <ul className="space-y-1">
                                  {q.list2?.map((item, i) => (
                                    <li key={i} className="flex gap-2">
                                      <span className="font-bold text-indigo-600">({['I', 'II', 'III', 'IV', 'V'][i]})</span>
                                      <LatexMarkdown content={item} />
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          )}

                          {q.diagramUrl && (
                            <div className="flex justify-start py-2">
                              <img 
                                src={q.diagramUrl} 
                                alt="Question Diagram" 
                                className="max-w-[300px] h-auto rounded-xl border border-slate-100 shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                        {(() => {
                          const isCorrect = userAnswers[idx] !== null && String(userAnswers[idx]).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
                          return isCorrect ? (
                            <div className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border border-emerald-100">
                              <CheckCircle2 className="w-4 h-4" /> Correct
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 border border-rose-100">
                              <XCircle className="w-4 h-4" /> {userAnswers[idx] === null ? 'Unattempted' : 'Incorrect'}
                            </div>
                          );
                        })()}
                      </div>

                      {q.type === 'NUMERICAL' || (!q.options || q.options.length === 0) ? (
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
                                "p-4 rounded-2xl text-base border flex items-center gap-3 transition-all",
                                String(oIdx) === String(q.correctAnswer) ? "bg-emerald-50 border-emerald-200 text-emerald-900 font-semibold shadow-sm" :
                                String(oIdx) === String(userAnswers[idx]) ? "bg-rose-50 border-rose-200 text-rose-900" :
                                theme === 'light' ? "bg-slate-50 border-slate-100 text-slate-500" : "bg-slate-800 border-slate-700 text-slate-400"
                              )}
                            >
                              <span className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center font-bold shrink-0",
                                String(oIdx) === String(q.correctAnswer) ? "bg-emerald-600 text-white" : "bg-white/50 border border-current"
                              )}>
                                {String.fromCharCode(65 + oIdx)}
                              </span>
                              <LatexMarkdown content={opt} />
                              {String(oIdx) === String(q.correctAnswer) && <CheckCircle2 className="w-5 h-5 ml-auto text-emerald-600 shrink-0" />}
                              {String(oIdx) === String(userAnswers[idx]) && String(oIdx) !== String(q.correctAnswer) && <XCircle className="w-5 h-5 ml-auto text-rose-600 shrink-0" />}
                            </div>
                          ))}
                        </div>
                      )}

                      <div className={cn(
                        "p-6 rounded-3xl border space-y-4",
                        theme === 'light' ? "bg-indigo-50/30 border-indigo-100" : "bg-indigo-900/10 border-indigo-900/30"
                      )}>
                        <div className={cn(
                          "p-8 rounded-3xl border bg-white shadow-sm",
                          theme === 'light' ? "border-slate-200" : "bg-slate-900 border-slate-800"
                        )}>
                          <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3 text-indigo-600 font-bold text-sm uppercase tracking-widest">
                              <div className="p-2 bg-indigo-100 rounded-xl">
                                <BookOpen className="w-5 h-5" />
                              </div>
                              Detailed Solution
                            </div>
                            <button
                              onClick={() => handleSpeakExplanation(q.explanation, idx)}
                              className={cn(
                                "px-4 py-2 rounded-xl transition-all flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest",
                                speakingIndex === idx 
                                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-200" 
                                  : theme === 'light' ? "bg-indigo-50 text-indigo-600 hover:bg-indigo-100" : "bg-indigo-900/40 text-indigo-400 hover:bg-indigo-900/60"
                              )}
                            >
                              <Volume2 className={cn("w-4 h-4", speakingIndex === idx && "animate-pulse")} />
                              {speakingIndex === idx ? "Stop Audio" : "Listen Solution"}
                            </button>
                          </div>
                          <div className={cn("text-lg leading-relaxed font-medium", theme === 'light' ? "text-slate-800" : "text-slate-200")}>
                            <LatexMarkdown content={q.explanation} />
                          </div>
                          
                          {q.explanationDiagramUrl && (
                            <div className="flex justify-center py-6 bg-slate-50 rounded-2xl border border-slate-100 mt-6">
                              <img 
                                src={q.explanationDiagramUrl} 
                                alt="Explanation Diagram" 
                                className="max-w-full h-auto rounded-xl shadow-sm"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
          {view === 'doubt' && (
            <motion.div
              key="doubt"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <DoubtSolver 
                onBack={() => setView('home')}
                theme={theme}
                language={language}
                isSubscribed={isSubscribed}
                onShowPaywall={() => setShowPaywall(true)}
                doubtCount={doubtCount}
                incrementDoubtCount={incrementDoubtCount}
              />
            </motion.div>
          )}
        </AnimatePresence>
        
        {/* Hidden DPP Template for PDF Generation */}
        <DppTemplate 
          questions={questions}
          subject={selectedSubject || 'General'}
          topic={questions[0]?.topic || 'General'}
          dppNumber="1.1"
        />
        <audio 
          ref={audioRef} 
          onEnded={() => setSpeakingIndex(null)} 
          className="hidden"
        />

        {/* Paywall Modal */}
        <AnimatePresence>
          {showPaywall && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowPaywall(false)}
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                className={cn(
                  "relative w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden border",
                  theme === 'light' ? "bg-white border-slate-200" : "bg-slate-900 border-slate-800"
                )}
              >
                <div className="p-8 space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="p-3 bg-indigo-100 rounded-2xl">
                      <Lock className="w-8 h-8 text-indigo-600" />
                    </div>
                    <button 
                      onClick={() => setShowPaywall(false)}
                      className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                    >
                      <X className="w-6 h-6 text-slate-400" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h2 className={cn("text-3xl font-bold tracking-tight", theme === 'light' ? "text-slate-900" : "text-white")}>
                      {quizCount >= 5 || doubtCount >= 5 || examType === 'JEE_MAIN_MOCK' || examType === 'NEET_MOCK' ? "Premium Feature" : "Unlock Performance Analysis"}
                    </h2>
                    <p className={cn("text-lg", theme === 'light' ? "text-slate-600" : "text-slate-400")}>
                      {quizCount >= 5 || doubtCount >= 5 || examType === 'JEE_MAIN_MOCK' || examType === 'NEET_MOCK'
                        ? "You've reached your free limit or selected a premium feature. Unlock unlimited Quizzes, Mock Tests, and AI Doubt Solving."
                        : "Students who analyze their mistakes are 3x more likely to succeed. Unlock your detailed performance report and unlimited doubts now."}
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className={cn(
                      "p-6 rounded-2xl border-2 transition-all cursor-pointer group",
                      "border-indigo-600 bg-indigo-50/50"
                    )} onClick={handleSubscribe}>
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-600 rounded-xl text-white">
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <div className="font-bold text-indigo-900">Premium Access</div>
                            <div className="text-sm text-indigo-600 font-medium">Unlimited Quizzes</div>
                          </div>
                        </div>
                        <div className="text-2xl font-black text-indigo-600">₹29</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4 flex flex-col gap-3">
                    <button
                      onClick={handleSubscribe}
                      className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                      <Zap className="w-5 h-5" />
                      Unlock Now
                    </button>
                    <div className="flex justify-between items-center px-2">
                      <p className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">
                        Secure via Razorpay
                      </p>
                      <button 
                        onClick={() => {
                          setIsSubscribed(true);
                          setShowPaywall(false);
                        }}
                        className="text-[10px] text-indigo-600 font-bold uppercase tracking-widest hover:underline"
                      >
                        Already Paid? Restore
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
