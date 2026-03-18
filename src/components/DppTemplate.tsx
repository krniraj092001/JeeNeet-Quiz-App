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
    <div id="dpp-template" className="bg-white text-black p-16 font-serif w-[1000px] mx-auto hidden print:block" style={{ fontFamily: "'Times New Roman', Times, serif", color: 'black', backgroundColor: 'white', lineHeight: '1.7' }}>
      {/* Chapter Header */}
      <div className="flex justify-between items-end mb-12 border-b-4 border-black pb-4">
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-center">
            <div className="border-[6px] border-black px-5 py-2 text-6xl font-black leading-none">
              {dppNumber.split('.')[0]}
            </div>
            <div className="text-xs font-bold uppercase tracking-[0.3em] mt-2">Chapter</div>
          </div>
        </div>
        <div className="flex-1 text-right">
          <div className="text-7xl font-black italic tracking-tighter pr-2" style={{ lineHeight: '0.8' }}>{subject}</div>
          <div className="h-2.5 bg-black w-full mt-4"></div>
        </div>
      </div>

      {/* DPP Title */}
      <div className="text-center mb-8">
        <h2 className="text-4xl font-black italic">DPP {dppNumber}</h2>
      </div>

      {/* Topic Box */}
      <div className="border-[3px] border-black p-6 mb-12 bg-slate-50 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
        <h3 className="text-3xl font-black text-center uppercase tracking-tight">{topic}</h3>
      </div>

      {/* Questions Grid */}
      <div className="grid grid-cols-2 gap-x-12 gap-y-10 relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none z-0 overflow-hidden">
          <div className="text-9xl font-black rotate-[-30deg] uppercase tracking-[0.4em] text-center whitespace-nowrap">
            NITian
          </div>
        </div>

        {/* Single Correct Answer Type */}
        {(mcqs.length > 0 || statements.length > 0) && (
          <div className="col-span-2">
            <div className="bg-slate-200 p-2 mb-4 border border-black">
              <h4 className="text-base font-black italic text-center uppercase tracking-wider">Single Correct Answer Type</h4>
            </div>
          </div>
        )}

        {[...mcqs, ...statements].map((q, idx) => (
          <div key={q.id} className="text-sm space-y-5 break-inside-avoid relative z-10 p-3 border border-transparent">
            <div className="flex gap-4">
              <span className="font-black text-xl">Q{idx + 1}.</span>
              <div className="flex-1">
                <div className="mb-5 leading-relaxed font-medium text-xl">
                  <LatexMarkdown content={q.text} theme="light" />
                </div>
                
                {q.diagramUrl && (
                  <div className="my-4 flex justify-center">
                    <img src={q.diagramUrl} alt="Diagram" className="max-w-[200px] h-auto border border-slate-200 p-1 bg-white" />
                  </div>
                )}

                {q.options && (
                  <div className="grid grid-cols-2 gap-x-6 gap-y-4 mt-5">
                    {q.options.map((opt, i) => (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="font-black text-base">({String.fromCharCode(97 + i)})</span>
                        <div className="flex-1 text-lg">
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
          <div className="col-span-2 mt-8">
            <div className="bg-slate-200 p-2 mb-4 border border-black">
              <h4 className="text-base font-black italic text-center uppercase tracking-wider">Numerical Answer Type</h4>
            </div>
          </div>
        )}

        {numericals.map((q, idx) => (
          <div key={q.id} className="text-sm space-y-4 break-inside-avoid relative z-10 p-2 border border-transparent">
            <div className="flex gap-3">
              <span className="font-black text-lg">Q{mcqs.length + statements.length + idx + 1}.</span>
              <div className="flex-1">
                <div className="mb-4 leading-relaxed font-medium text-lg">
                  <LatexMarkdown content={q.text} theme="light" />
                </div>
                {q.diagramUrl && (
                  <div className="my-4 flex justify-center">
                    <img src={q.diagramUrl} alt="Diagram" className="max-w-[200px] h-auto border border-slate-200 p-1 bg-white" />
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {/* Match Type */}
        {matches.length > 0 && (
          <div className="col-span-2 mt-8">
            <div className="bg-slate-200 p-2 mb-4 border border-black">
              <h4 className="text-base font-black italic text-center uppercase tracking-wider">Matching Column Type</h4>
            </div>
          </div>
        )}

        {matches.map((q, idx) => (
          <div key={q.id} className="col-span-2 text-sm space-y-4 break-inside-avoid relative z-10 p-2">
            <div className="flex gap-2">
              <span className="font-black text-base">Q{mcqs.length + statements.length + numericals.length + idx + 1}.</span>
              <div className="flex-1">
                <div className="mb-4 leading-relaxed font-medium text-base">
                  <LatexMarkdown content={q.text} theme="light" />
                </div>
                
                <div className="grid grid-cols-2 border-2 border-black mt-4">
                  <div className="border-r-2 border-black p-3 font-black text-xl text-center bg-slate-100">Column I</div>
                  <div className="p-3 font-black text-xl text-center bg-slate-100">Column II</div>
                  
                  <div className="border-r-2 border-black p-6">
                    <ul className="space-y-4">
                      {q.list1?.map((item, i) => (
                        <li key={i} className="flex gap-3 items-start">
                          <span className="font-black text-lg">({String.fromCharCode(65 + i)})</span>
                          <div className="flex-1 text-lg">
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
                          <div className="flex-1 text-lg">
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
            <div key={idx} className="flex gap-3 text-lg items-baseline border-b-2 border-slate-200 pb-3">
              <span className="font-black">{idx + 1}.</span>
              <span className="font-bold">
                {q.type === 'MCQ' || q.type === 'STATEMENT' || q.type === 'MATCH'
                  ? `(${String.fromCharCode(97 + Number(q.correctAnswer))})` 
                  : <LatexMarkdown content={String(q.correctAnswer)} theme="light" />}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Footer Branding */}
      <div className="mt-16 flex justify-between items-center text-[10px] font-bold text-slate-400 border-t border-slate-100 pt-4">
        <div>Generated by NITian Engine</div>
        <div className="italic">www.nitianvisionpoint.com</div>
      </div>
    </div>
  );
};

export default DppTemplate;
