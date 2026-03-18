import React, { useState } from 'react';
import { MathText } from './MathText';
import { Question } from '../demo/sampleQuestions';
import { cn } from '../utils';
import '../styles/katex-quiz.css';

interface QuizQuestionProps {
  question: Question;
  onAnswer?: (isCorrect: boolean) => void;
}

/**
 * Full quiz card with options and solution
 */
export const QuizQuestion: React.FC<QuizQuestionProps> = ({ question, onAnswer }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(false);

  const handleOptionClick = (option: string) => {
    if (showSolution) return;
    setSelectedOption(option);
    const isCorrect = option === question.correctAnswer;
    onAnswer?.(isCorrect);
    setShowSolution(true);
  };

  return (
    <div className="quiz-card">
      <div className="flex justify-between items-start mb-4">
        <span className={cn(
          "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
          question.subject === 'Physics' ? "bg-blue-100 text-blue-600" :
          question.subject === 'Chemistry' ? "bg-emerald-100 text-emerald-600" :
          "bg-purple-100 text-purple-600"
        )}>
          {question.subject}
        </span>
        <span className={cn(
          "text-[10px] font-bold uppercase tracking-wider",
          question.difficulty === 'Easy' ? "text-emerald-500" :
          question.difficulty === 'Medium' ? "text-amber-500" :
          "text-rose-500"
        )}>
          {question.difficulty}
        </span>
      </div>

      <div className="mb-6">
        <MathText 
          text={question.text} 
          className="text-lg font-medium leading-relaxed" 
        />
      </div>

      <div className="space-y-3">
        {question.options.map((option, idx) => {
          const isSelected = selectedOption === option;
          const isCorrect = option === question.correctAnswer;
          const showResult = showSolution;

          return (
            <button
              key={idx}
              onClick={() => handleOptionClick(option)}
              disabled={showSolution}
              className={cn(
                "option-btn",
                isSelected && !showResult && "selected",
                showResult && isCorrect && "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold",
                showResult && isSelected && !isCorrect && "bg-rose-50 border-rose-500 text-rose-700"
              )}
            >
              <div className={cn(
                "option-label",
                showResult && isCorrect && "bg-emerald-500 text-white",
                showResult && isSelected && !isCorrect && "bg-rose-500 text-white"
              )}>
                {String.fromCharCode(65 + idx)}
              </div>
              <MathText text={option} />
            </button>
          );
        })}
      </div>

      {showSolution && (
        <div className="solution-box animate-in fade-in slide-in-from-top-4 duration-500">
          <div className="solution-title">Solution & Explanation</div>
          <MathText 
            text={question.explanation} 
            className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap" 
          />
        </div>
      )}
    </div>
  );
};
