import React from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { cn } from '../utils';

interface LatexMarkdownProps {
  content: string;
  theme?: 'light' | 'dark';
  className?: string;
  large?: boolean;
}

const LatexMarkdown = ({ content, theme = 'light', className, large = false }: LatexMarkdownProps) => {
  if (!content) return null;
  return (
    <div className={cn(
      "markdown-body max-w-none py-1",
      theme === 'light' ? "text-slate-900" : "text-slate-100",
      large ? "text-xl md:text-2xl font-semibold" : "",
      className
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

export default LatexMarkdown;
