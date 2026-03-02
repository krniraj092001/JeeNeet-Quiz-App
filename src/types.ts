import { Type } from "@google/genai";

export type Language = 'English' | 'Hindi';
export type ExamType = 'NEET' | 'JEE' | 'Combined' | 'JEE_BOOKS' | 'NEET_BOOKS' | 'MS_CHOUHAN' | 'BLACK_BOOK' | 'NARENDRA_AVASTHI' | 'DPP' | 'JEE_MAIN_MOCK' | 'NEET_MOCK';

export interface Question {
  id: string;
  text: string;
  type: 'MCQ' | 'NUMERICAL' | 'MATCH' | 'STATEMENT';
  options?: string[];
  list1?: string[];
  list2?: string[];
  correctAnswer: number | string;
  explanation: string;
  diagramPrompt?: string;
  diagramUrl?: string;
  explanationDiagramPrompt?: string;
  explanationDiagramUrl?: string;
  subject: string;
  topic: string;
  grade: 'Class 11' | 'Class 12';
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  language: Language;
  examType: ExamType;
}

export interface DoubtResponse {
  explanation: string;
  diagramUrl?: string;
  topic?: string;
  subject?: string;
  sources?: { title: string, uri: string }[];
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  answers: (number | string | null)[];
  isFinished: boolean;
  startTime: number;
  endTime?: number;
}

export const QUIZ_SCHEMA = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: "The question text. Use LaTeX for mathematical formulas wrapped in $...$ or $$...$$." },
      type: { type: Type.STRING, description: "Question type: 'MCQ', 'NUMERICAL', 'MATCH', or 'STATEMENT'" },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Four multiple choice options for MCQ, STATEMENT, or MATCH. Leave empty for NUMERICAL."
      },
      list1: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Items for List I in MATCH type questions."
      },
      list2: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Items for List II in MATCH type questions."
      },
      correctAnswer: { 
        type: Type.STRING, 
        description: "For MCQ/STATEMENT: Index of correct option (0-3). For NUMERICAL: Value. For MATCH: The correct matching sequence (e.g., 'A-I, B-III, C-II, D-IV')." 
      },
      explanation: { 
        type: Type.STRING, 
        description: "Detailed step-by-step explanation. Use LaTeX for formulas." 
      },
      diagramPrompt: {
        type: Type.STRING,
        description: "ONLY if the original source question (e.g., from MS Chauhan or PYQ) has a diagram, provide a detailed description to recreate it. Otherwise, leave empty."
      },
      explanationDiagramPrompt: {
        type: Type.STRING,
        description: "If a diagram would help clarify the solution (e.g., reaction mechanism, free body diagram), provide a description here. This is optional but encouraged for clarity."
      },
      topic: { type: Type.STRING, description: "Specific topic within the subject" },
      grade: { type: Type.STRING, description: "Academic grade: 'Class 11' or 'Class 12'" },
      difficulty: { 
        type: Type.STRING, 
        description: "Difficulty level: Easy, Moderate, or Hard" 
      }
    },
    required: ["text", "type", "correctAnswer", "explanation", "topic", "difficulty"]
  }
};
