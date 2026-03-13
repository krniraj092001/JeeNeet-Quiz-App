import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Copy, Check, Trash2, Maximize2, Minimize2, AlertCircle } from 'lucide-react';
import katex from 'katex';
import LatexMarkdown from './LatexMarkdown';
import { cn } from '../utils';

interface LatexConverterProps {
  onBack: () => void;
  theme: 'light' | 'dark';
}

export default function LatexConverter({ onBack, theme }: LatexConverterProps) {
  const [input, setInput] = useState('\\frac{2}{3}');
  const [copied, setCopied] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!input.trim()) {
      setError(null);
      return;
    }
    try {
      // Use katex to validate the input
      katex.renderToString(input, { throwOnError: true, displayMode: true });
      setError(null);
    } catch (err: any) {
      // Extract a cleaner error message if possible
      const msg = err.message || 'Invalid LaTeX syntax';
      setError(msg.replace('KaTeX parse error: ', ''));
    }
  }, [input]);

  const handleCopy = () => {
    navigator.clipboard.writeText(input);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const clearInput = () => {
    setInput('');
  };

  return (
    <div className={cn(
      "max-w-6xl mx-auto px-4 py-8 transition-all duration-300",
      isFullScreen ? "fixed inset-0 z-[100] bg-white dark:bg-slate-950 overflow-y-auto" : ""
    )}>
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={isFullScreen ? () => setIsFullScreen(false) : onBack}
          className={cn(
            "flex items-center gap-2 transition-all font-medium",
            theme === 'light' ? "text-slate-500 hover:text-slate-800" : "text-slate-400 hover:text-white"
          )}
        >
          <ArrowLeft className="w-4 h-4" /> {isFullScreen ? "Exit Fullscreen" : "Back to Home"}
        </button>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            className={cn(
              "p-2 rounded-xl transition-all",
              theme === 'light' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-300 hover:bg-slate-700"
            )}
            title={isFullScreen ? "Exit Fullscreen" : "Fullscreen Mode"}
          >
            {isFullScreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <span className="text-indigo-600 font-bold text-lg">Σ</span>
            </div>
            <h1 className={cn("text-xl font-bold", theme === 'light' ? "text-slate-900" : "text-white")}>LaTeX to Output</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Input Section */}
        <div className="space-y-4" style={{ borderWidth: '3px', borderColor: '#0101dc' }}>
          <div className="flex items-center justify-between">
            <label 
              className={cn("text-sm font-bold uppercase tracking-wider", theme === 'light' ? "text-slate-500" : "text-slate-400")}
              style={{ fontSize: '10px', lineHeight: '18px', color: '#0151bc' }}
            >
              Input (LaTeX)
            </label>
            <div className="flex gap-2">
              <button 
                onClick={clearInput}
                className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors"
                title="Clear Input"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button 
                onClick={handleCopy}
                className="p-1.5 text-slate-400 hover:text-indigo-500 transition-colors"
                title="Copy LaTeX"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div className="relative group">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your LaTeX here... (e.g., \frac{a}{b}, \sqrt{x}, \int_{a}^{b} f(x) dx)"
              className={cn(
                "w-full h-[400px] p-6 rounded-3xl border-2 transition-all resize-none font-mono text-lg focus:ring-4 focus:ring-indigo-500/10 outline-none",
                theme === 'light' ? "bg-white border-slate-100 text-slate-900" : "bg-slate-900 border-slate-800 text-white"
              )}
            />
            <div className="absolute bottom-4 right-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-50 group-hover:opacity-100 transition-opacity">
              LaTeX Editor
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {['\\frac{a}{b}', '\\sqrt{x}', '\\sum_{i=1}^{n}', '\\int_{a}^{b}', '\\alpha, \\beta', '\\Delta', '\\rightarrow', '\\infty'].map((snippet) => (
              <button
                key={snippet}
                onClick={() => setInput(prev => prev + ' ' + snippet)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-mono transition-all",
                  theme === 'light' ? "bg-slate-100 text-slate-600 hover:bg-slate-200" : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                )}
              >
                {snippet}
              </button>
            ))}
          </div>
        </div>

        {/* Output Section */}
        <div className="space-y-4" style={{ borderWidth: '3px', borderColor: '#0101dc' }}>
          <label 
            className={cn("text-sm font-bold uppercase tracking-wider", theme === 'light' ? "text-slate-500" : "text-slate-400")}
            style={{ fontSize: '10px', lineHeight: '18px', color: '#005bd9' }}
          >
            Output (Rendered)
          </label>
          <div className={cn(
            "w-full h-[400px] p-8 rounded-3xl border-2 flex flex-col items-center justify-center overflow-auto bg-dots relative",
            theme === 'light' ? "bg-slate-50 border-slate-100" : "bg-slate-900 border-slate-800"
          )}>
            {error && (
              <div className="absolute top-4 left-4 right-4 z-10">
                <div className="bg-rose-50 border border-rose-100 text-rose-600 px-4 py-2 rounded-xl text-xs flex items-center gap-2 shadow-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="font-medium">KaTeX Error: {error}</span>
                </div>
              </div>
            )}
            
            {input.trim() ? (
              <div className={cn(
                "scale-150 transform transition-opacity",
                error ? "opacity-50 grayscale" : "opacity-100"
              )}>
                <LatexMarkdown content={`$$ ${input} $$`} theme={theme} large />
              </div>
            ) : (
              <div className="text-center space-y-2">
                <div className="text-slate-400 font-medium italic">Waiting for input...</div>
                <p className="text-[10px] text-slate-400 uppercase tracking-widest">Rendered output will appear here</p>
              </div>
            )}
          </div>
          <div className={cn(
            "p-4 rounded-2xl border text-xs leading-relaxed",
            theme === 'light' ? "bg-indigo-50/50 border-indigo-100 text-indigo-700" : "bg-indigo-950/20 border-indigo-900/50 text-indigo-300"
          )}>
            <p className="font-bold uppercase tracking-wider mb-1">Pro Tip:</p>
            You can use standard LaTeX commands. For inline math, use $...$ and for block math use $$...$$. This tool automatically wraps your input in block math for the best preview.
          </div>
        </div>
      </div>
    </div>
  );
}
