import React, { useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, ArrowLeft, FileText } from 'lucide-react';
import { Question } from './types';
import { cn } from './utils';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import LatexMarkdown from './components/LatexMarkdown';
import DppTemplate from './components/DppTemplate';

interface DPPViewProps {
  questions: Question[];
  subject: string;
  onBack: () => void;
  theme: 'light' | 'dark';
}

export const DPPView: React.FC<DPPViewProps> = ({ questions, subject, onBack, theme }) => {
  const dppRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadPDF = async () => {
    setIsDownloading(true);
    const element = document.getElementById('dpp-template');
    if (!element) {
      setIsDownloading(false);
      return;
    }

    // Temporarily show the element for capture
    element.style.display = 'block';
    
    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: 1000
      });
      
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      const pdf = new jsPDF('p', 'mm', 'a4');
      
      const imgWidth = 210; // A4 width in mm
      const pageHeight = 297; // A4 height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`DPP_${subject.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      element.style.display = 'none';
      setIsDownloading(false);
    }
  };

  // Group questions into sections
  const speedDrill = questions.slice(0, 5);
  const conceptBuilder = questions.slice(5, 10);
  const target99 = questions.slice(10, 15);
  const others = questions.slice(15);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between no-print">
        <button 
          onClick={onBack}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 transition-all font-medium"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </button>
        <div className="flex gap-3">
          <button 
            onClick={downloadPDF}
            disabled={isDownloading}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
          >
            {isDownloading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Download PDF
          </button>
        </div>
      </div>

      <div 
        ref={dppRef}
        className="bg-white text-slate-900 p-[60px] shadow-2xl mx-auto w-[800px] border border-slate-200 min-h-[1123px] font-serif"
        id="dpp-content"
        style={{
          color: '#0f172a',
          backgroundColor: '#ffffff',
          borderColor: '#e2e8f0',
          width: '800px',
          padding: '60px'
        }}
      >
        {/* Page 1: Header & Stats */}
        <div className="space-y-8 mb-12">
          <div className="flex flex-col items-center gap-4 border-b-2 border-indigo-600 pb-8" style={{ borderColor: '#4f46e5' }}>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-200" style={{ backgroundColor: '#4f46e5' }}>N</div>
              <div className="flex flex-col">
                <span className="text-2xl font-black tracking-tighter text-indigo-600 leading-none" style={{ color: '#4f46e5' }}>NITian Vision Point</span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1" style={{ color: '#94a3b8' }}>Excellence in Education</span>
              </div>
            </div>
            <div className="h-px w-24 bg-slate-200 my-2" style={{ backgroundColor: '#e2e8f0' }}></div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-800" style={{ color: '#1e293b' }}>DPP 1 - {subject}</h1>
          </div>

          <div className="flex justify-between text-sm font-bold">
            <div>No. of Questions: {questions.length}</div>
            <div>Time Limit: 60 min</div>
          </div>
          <div className="text-sm font-bold">Maximum Score: {questions.length * 4}</div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">Scoring System:</h3>
            <table className="w-full border-collapse border border-slate-800 text-center text-xs">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-800 p-2">Correct Answer</th>
                  <th className="border border-slate-800 p-2">Incorrect Answer</th>
                  <th className="border border-slate-800 p-2">Not Attempted</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-2 font-bold">+4</td>
                  <td className="border border-slate-800 p-2 font-bold">-1</td>
                  <td className="border border-slate-800 p-2 font-bold">0</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">Timed Practice:</h3>
            <p className="text-[10px] italic text-slate-500">Practice like a topper and learn to stay calm under time pressure.</p>
            <table className="w-full border-collapse border border-slate-800 text-center text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-800 p-2">Section</th>
                  <th className="border border-slate-800 p-2">Questions</th>
                  <th className="border border-slate-800 p-2">Time Limit</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-2">Speed Drill</td>
                  <td className="border border-slate-800 p-2">Q1 to Q5</td>
                  <td className="border border-slate-800 p-2">10 Min</td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-2">Concept Builder</td>
                  <td className="border border-slate-800 p-2">Q6 to Q10</td>
                  <td className="border border-slate-800 p-2">17 Min</td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-2">Target 99+</td>
                  <td className="border border-slate-800 p-2">Q11 to Q15</td>
                  <td className="border border-slate-800 p-2">23 Min</td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-2">Revision Drill</td>
                  <td className="border border-slate-800 p-2">Questions marked for revision by you</td>
                  <td className="border border-slate-800 p-2">10 Min</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">Score Card:</h3>
            <p className="text-[10px] italic text-slate-500">Start tracking your progress using regular score checks. Be Honest and Start Improving.</p>
            <table className="w-full border-collapse border border-slate-800 text-center text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-800 p-2">Questions</th>
                  <th className="border border-slate-800 p-2">Correct</th>
                  <th className="border border-slate-800 p-2">Incorrect</th>
                  <th className="border border-slate-800 p-2">Score</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-2">Q1 to Q5</td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-2">Q6 to Q10</td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-2">Q11 to Q15</td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-slate-800 p-2">Total</td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
                <tr className="bg-slate-50">
                  <td colSpan={3} className="border border-slate-800 p-2 text-right font-bold">Good Score</td>
                  <td className="border border-slate-800 p-2 font-bold">32</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-bold uppercase tracking-wider">Revision Card:</h3>
            <p className="text-[10px] italic text-slate-500">Track your doubts and important questions for revision in the future. Revision is the key to strengthening your problem-solving skills.</p>
            <table className="w-full border-collapse border border-slate-800 text-xs">
              <tbody>
                <tr>
                  <td className="border border-slate-800 p-2 w-1/3 font-bold">Doubts</td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
                <tr>
                  <td className="border border-slate-800 p-2 w-1/3 font-bold">Important Qs for Revision</td>
                  <td className="border border-slate-800 p-2"></td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider">Learnings:</h3>
            <p className="text-[10px] italic text-slate-500">Write your 3 learnings from questions in this DPP:</p>
            <div className="space-y-8 pt-6">
              <div className="border-b border-slate-300 pb-2 text-xs text-slate-400">1. I learnt: __________________________________________________________________________</div>
              <div className="border-b border-slate-300 pb-2 text-xs text-slate-400">2. I learnt: __________________________________________________________________________</div>
              <div className="border-b border-slate-300 pb-2 text-xs text-slate-400">3. I learnt: __________________________________________________________________________</div>
            </div>
          </div>
        </div>

        {/* Page 2+: Questions */}
        <div className="break-before-page pt-12">
          <div className="flex justify-between text-[10px] font-bold border-b pb-2 mb-8 border-slate-200">
            <span>DPP 1</span>
            <span className="uppercase tracking-[0.2em] text-indigo-600">{subject}</span>
          </div>

          {/* Speed Drill Section */}
          {speedDrill.length > 0 && (
            <div className="space-y-6 mb-12">
              <div className="text-center space-y-1">
                <h2 className="text-xl font-black uppercase tracking-tight">Speed Drill Section</h2>
                <p className="text-[10px] italic text-slate-500">Lay the groundwork and tackle easy questions with speed</p>
                <div className="flex justify-between text-[10px] font-bold pt-2">
                  <span>Questions: Q1 to Q5</span>
                  <span>Time Limit: 10 Min</span>
                </div>
              </div>
              <div className="space-y-8">
                {speedDrill.map((q, i) => (
                  <QuestionItem key={q.id} question={q} index={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Concept Builder Section */}
          {conceptBuilder.length > 0 && (
            <div className="space-y-6 mb-12">
              <div className="text-center space-y-1 border-t pt-8">
                <h2 className="text-xl font-black uppercase tracking-tight">Concept Builder Section</h2>
                <p className="text-[10px] italic text-slate-500">Let's apply concepts in most relevant problems</p>
                <div className="flex justify-between text-[10px] font-bold pt-2">
                  <span>Questions: Q6 to Q10</span>
                  <span>Time Limit: 17 Min</span>
                </div>
              </div>
              <div className="space-y-8">
                {conceptBuilder.map((q, i) => (
                  <QuestionItem key={q.id} question={q} index={i + 6} />
                ))}
              </div>
            </div>
          )}

          {/* Target 99+ Section */}
          {target99.length > 0 && (
            <div className="space-y-6 mb-12">
              <div className="text-center space-y-1 border-t pt-8">
                <h2 className="text-xl font-black uppercase tracking-tight">Target 99+ Section</h2>
                <p className="text-[10px] italic text-slate-500">Challenging problems according to recent trends</p>
                <div className="flex justify-between text-[10px] font-bold pt-2">
                  <span>Questions: Q11 to Q15</span>
                  <span>Time Limit: 23 Min</span>
                </div>
              </div>
              <div className="space-y-8">
                {target99.map((q, i) => (
                  <QuestionItem key={q.id} question={q} index={i + 11} />
                ))}
              </div>
            </div>
          )}

          {/* Other Questions */}
          {others.length > 0 && (
            <div className="space-y-6 mb-12">
              <div className="text-center space-y-1 border-t pt-8">
                <h2 className="text-xl font-black uppercase tracking-tight">Additional Practice</h2>
                <div className="flex justify-between text-[10px] font-bold pt-2">
                  <span>Questions: Q16 to Q{questions.length}</span>
                </div>
              </div>
              <div className="space-y-8">
                {others.map((q, i) => (
                  <QuestionItem key={q.id} question={q} index={i + 16} />
                ))}
              </div>
            </div>
          )}

          <div className="mt-12 pt-8 border-t-2 border-slate-100 text-center space-y-3" style={{ borderTopColor: '#f1f5f9' }}>
            <div className="flex justify-center items-center gap-4 text-xs font-bold text-slate-400" style={{ color: '#94a3b8' }}>
              <span>www.nitianvisionpoint.com</span>
              <span className="w-1 h-1 bg-slate-300 rounded-full" style={{ backgroundColor: '#cbd5e1' }}></span>
              <span>support@nitianvisionpoint.com</span>
            </div>
            <div className="text-lg font-black text-indigo-600 tracking-tight" style={{ color: '#4f46e5' }}>#NITianVisionPoint</div>
            <div className="text-[8px] text-slate-300 uppercase tracking-widest font-bold" style={{ color: '#cbd5e1' }}>Powered by JonyBhai AI Engine</div>
          </div>
        </div>
      </div>

      {/* Hidden DPP Template for PDF Generation */}
      <DppTemplate 
        questions={questions}
        subject={subject}
        topic={questions[0]?.topic || 'General'}
        dppNumber="1.1"
      />

      <style dangerouslySetInnerHTML={{ __html: `
        #dpp-content {
          --indigo-600: #4f46e5;
          --slate-900: #0f172a;
          --slate-800: #1e293b;
          --slate-500: #64748b;
          --slate-400: #94a3b8;
          --slate-300: #cbd5e1;
          --slate-200: #e2e8f0;
          --slate-100: #f1f5f9;
          --slate-50: #f8fafc;
        }
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          #dpp-content { 
            box-shadow: none !important; 
            border: none !important; 
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
          }
          .break-before-page { page-break-before: always; }
        }
      `}} />
    </div>
  );
};

const QuestionItem = ({ question, index }: { question: Question, index: number }) => {
  return (
    <div className="space-y-4 pb-4 border-b border-slate-50 last:border-0">
      <div className="flex gap-4">
        <span className="font-bold text-sm shrink-0 min-w-[28px]">Q{index}.</span>
        <div className="text-sm leading-relaxed flex-1">
          <LatexMarkdown content={question.text} />
        </div>
      </div>
      
      {question.type === 'MCQ' && question.options && (
        <div className="grid grid-cols-2 gap-x-12 gap-y-3 pl-12">
          {question.options.map((option, idx) => (
            <div key={idx} className="flex gap-3 text-xs items-start">
              <span className="font-bold text-slate-400">({idx + 1})</span>
              <div className="flex-1">
                <LatexMarkdown content={option} />
              </div>
            </div>
          ))}
        </div>
      )}

      {question.type === 'NUMERICAL' && (
        <div className="pl-8 text-xs italic text-slate-500">
          (Numerical Value Type)
        </div>
      )}
    </div>
  );
};
