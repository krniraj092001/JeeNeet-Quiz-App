import { Type } from "@google/genai";

export type Language = 'English' | 'Hindi';
export type ExamType = 'NEET' | 'JEE' | 'Combined' | 'JEE_BOOKS' | 'NEET_BOOKS' | 'MS_CHOUHAN' | 'BLACK_BOOK' | 'NARENDRA_AVASTHI' | 'DPP' | 'JEE_MAIN_MOCK' | 'NEET_MOCK';

export interface Question {
  id: string;
  text: string;
  type: 'MCQ' | 'NUMERICAL';
  options?: string[];
  correctAnswer: number | string;
  explanation: string;
  subject: string;
  topic: string;
  grade: 'Class 11' | 'Class 12';
  difficulty: 'Easy' | 'Moderate' | 'Hard';
  language: Language;
  examType: ExamType;
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
      type: { type: Type.STRING, description: "Question type: 'MCQ' or 'NUMERICAL'" },
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Four multiple choice options for MCQ. Leave empty or omit for NUMERICAL. Use LaTeX for formulas."
      },
      correctAnswer: { 
        type: Type.STRING, 
        description: "For MCQ: Index of the correct option (0-3) as string. For NUMERICAL: The correct numerical value as string." 
      },
      explanation: { 
        type: Type.STRING, 
        description: "Detailed step-by-step explanation. Use LaTeX for formulas." 
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
