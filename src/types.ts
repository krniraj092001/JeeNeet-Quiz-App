import { Type } from "@google/genai";

export type Language = 'English' | 'Hindi';
export type ExamType = 'NEET' | 'JEE' | 'Combined' | 'JEE_BOOKS' | 'NEET_BOOKS' | 'MS_CHOUHAN' | 'BLACK_BOOK' | 'NARENDRA_AVASTHI' | 'DPP';

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  topic: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  language: Language;
  examType: ExamType;
}

export interface QuizState {
  questions: Question[];
  currentQuestionIndex: number;
  answers: number[];
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
      options: { 
        type: Type.ARRAY, 
        items: { type: Type.STRING },
        description: "Four multiple choice options. Use LaTeX for formulas."
      },
      correctAnswer: { 
        type: Type.INTEGER, 
        description: "Index of the correct option (0-3)" 
      },
      explanation: { 
        type: Type.STRING, 
        description: "Detailed step-by-step explanation. Use LaTeX for formulas." 
      },
      topic: { type: Type.STRING, description: "Specific topic within the subject" },
      difficulty: { 
        type: Type.STRING, 
        description: "Difficulty level: Easy, Medium, or Hard" 
      }
    },
    required: ["text", "options", "correctAnswer", "explanation", "topic", "difficulty"]
  }
};
