import React from 'react';
import { Question } from '../types';
import LatexMarkdown from './LatexMarkdown';

interface DppTemplateProps {
  questions: Question[];
  subject: string;
  topic: string;
  dppNumber: string;
}

const DppTemplate: React.FC<DppTemplateProps> = ({ questions, subject, topic, dppNumber }) => {
  // Group questions by type
  const mcqs = questions.filter(q => q.type === 'MCQ');
  const numericals = questions.filter(q => q.type === 'NUMERICAL');
  const matches = questions.filter(q => q.type === 'MATCH');
  const statements = questions.filter(q => q.type === 'STATEMENT');

  return (
    <div id="dpp-template" className="bg-white text-black p-16 font-serif w-[1000px] mx-auto hidden print:block" style={{ fontFamily: 'serif' }}>
      {/* Chapter Header */}
      <div className="flex justify-between items-start mb-12 border-b-4 border-black pb-6">
        <div className="flex flex-col items-center">
          <div className="border-4 border-black p-4 text-6xl font-black mb-2">
            {dppNumber.split('.')[0]}
          </div>
          <div className="text-xs font-bold uppercase tracking-widest">Chapter</div>
        </div>
        <div className="text-right">
          <h1 className="text-6xl font-black italic mb-2">{subject}</h1>
          <div className="h-2 bg-black w-full"></div>
        </div>
      </div>

      {/* DPP Title */}
      <div className="text-center mb-10">
        <h2 className="text-5xl font-black italic">DPP {dppNumber}</h2>
      </div>

      {/* Topic Box */}
      <div className="border-2 border-black p-6 mb-12">
        <h3 className="text-3xl font-black text-center uppercase tracking-tight">{topic}</h3>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-2 gap-x-16 gap-y-12 relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0">
          <div className="text-8xl font-black rotate-[-45deg] uppercase tracking-[0.5em] text-center whitespace-nowrap">
            Master with Jonybhai
          </div>
        </div>

        {/* Single Correct Answer Type */}
        {(mcqs.length > 0 || statements.length > 0) && (
          <div className="col-span-2">
            <div className="bg-slate-200 p-2 mb-6 border border-black">
              <h4 className="text-lg font-black italic text-center uppercase tracking-wider">Single Correct Answer Type</h4>
            </div>
          </div>
        )}

        {[...mcqs, ...statements].map((q, idx) => (
          <div key={q.id} className="text-base space-y-4 break-inside-avoid relative z-10">
            <div className="flex gap-3">
              <span className="font-black text-lg">{idx + 1}.</span>
              <div className="flex-1">
                <div className="mb-4 leading-relaxed font-medium text-lg">
                  <LatexMarkdown content={q.text} theme="light" />
                </div>
                
                {q.diagramUrl && (
                  <div className="my-6 flex justify-center">
                    <img src={q.diagramUrl} alt="Diagram" className="max-w-full h-auto border border-slate-100 p-2" />
                  </div>
                )}

                {q.options && (
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <span className="font-black">({String.fromCharCode(97 + i)})</span>
                        <div className="flex-1">
                          <LatexMarkdown content={opt} theme="light" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Numerical Type */}
        {numericals.length > 0 && (
          <div className="col-span-2 mt-12">
            <div className="bg-slate-200 p-2 mb-6 border border-black">
              <h4 className="text-lg font-black italic text-center uppercase tracking-wider">Numerical Answer Type</h4>
            </div>
          </div>
        )}

        {numericals.map((q, idx) => (
          <div key={q.id} className="text-base space-y-4 break-inside-avoid relative z-10">
            <div className="flex gap-3">
              <span className="font-black text-lg">{mcqs.length + statements.length + idx + 1}.</span>
              <div className="flex-1">
                <div className="mb-4 leading-relaxed font-medium text-lg">
                  <LatexMarkdown content={q.text} theme="light" />
                </div>
                {q.diagramUrl && (
                  <div className="my-6 flex justify-center">
                    <img src={q.diagramUrl} alt="Diagram" className="max-w-full h-auto border border-slate-100 p-2" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Match Type */}
        {matches.length > 0 && (
          <div className="col-span-2 mt-12">
            <div className="bg-slate-200 p-2 mb-6 border border-black">
              <h4 className="text-lg font-black italic text-center uppercase tracking-wider">Matching Column Type</h4>
            </div>
          </div>
        )}

        {matches.map((q, idx) => (
          <div key={q.id} className="col-span-2 text-base space-y-6 break-inside-avoid relative z-10">
            <div className="flex gap-3">
              <span className="font-black text-lg">{mcqs.length + statements.length + numericals.length + idx + 1}.</span>
              <div className="flex-1">
                <div className="mb-6 leading-relaxed font-medium text-lg">
                  <LatexMarkdown content={q.text} theme="light" />
                </div>
                
                <div className="grid grid-cols-2 border-2 border-black">
                  <div className="border-r-2 border-black p-3 font-black text-xl text-center bg-slate-100">Column I</div>
                  <div className="p-3 font-black text-xl text-center bg-slate-100">Column II</div>
                  
                  <div className="border-r-2 border-black p-6">
                    <ul className="space-y-4">
                      {q.list1?.map((item, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="font-black text-lg">({String.fromCharCode(65 + i)})</span>
                          <div className="flex-1">
                            <LatexMarkdown content={item} theme="light" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="p-6">
                    <ul className="space-y-4">
                      {q.list2?.map((item, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="font-black text-lg">({['(P)', '(Q)', '(R)', '(S)', '(T)'][i]})</span>
                          <div className="flex-1">
                            <LatexMarkdown content={item} theme="light" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Answer Key */}
      <div className="mt-20 pt-10 border-t-4 border-black break-before-page">
        <h3 className="text-4xl font-black text-center mb-10 uppercase tracking-tighter italic">Answers Key</h3>
        <div className="grid grid-cols-5 gap-y-6 gap-x-8">
          {questions.map((q, idx) => (
            <div key={idx} className="flex gap-3 text-lg items-baseline border-b border-slate-200 pb-2">
              <span className="font-black">{idx + 1}.</span>
              <span className="font-medium">
                {q.type === 'MCQ' || q.type === 'STATEMENT' || q.type === 'MATCH'
                  ? `(${String.fromCharCode(97 + Number(q.correctAnswer))})` 
                  : q.correctAnswer}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-20 flex justify-between items-center text-xs font-bold text-slate-400 border-t border-slate-100 pt-4">
        <div>Generated by Jonybhai AI Engine</div>
        <div className="italic">www.masterwithjonybhai.com</div>
      </div>
    </div>
  );
};

export default DppTemplate;
