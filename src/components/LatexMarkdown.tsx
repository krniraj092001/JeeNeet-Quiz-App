import React from 'react';
import Markdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
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

  // Pre-process content to ensure math delimiters have space around them if they are adjacent to text
  // This helps the parser identify them correctly and prevents "squashed" rendering
  const processedContent = content
    .replace(/([^\s$])(\$\$)/g, '$1\n$2')
    .replace(/(\$\$)([^\s$])/g, '$1\n$2');

  return (
    <div className={cn(
      "markdown-body max-w-none py-1",
      theme === 'light' ? "text-slate-900" : "text-slate-100",
      large ? "text-xl md:text-2xl font-semibold" : "",
      className
    )}>
      <Markdown 
        remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
        rehypePlugins={[rehypeKatex]}
        components={{
          // Ensure paragraphs don't squash text
          p: ({ node, children }) => <p className="mb-4 last:mb-0 leading-relaxed">{children}</p>,
          h3: ({ node, ...props }) => (
            <div className="mt-8 mb-6">
              <h3 
                className={cn(
                  "text-2xl font-serif italic mb-0.5 border-none tracking-tight",
                  theme === 'light' ? "text-slate-800" : "text-slate-200"
                )} 
                {...props} 
              />
              <div className={cn(
                "h-[1px] w-full",
                theme === 'light' ? "bg-slate-900" : "bg-slate-100"
              )} />
            </div>
          ),
          code: ({ node, inline, className, children, ...props }: any) => {
            const match = /language-(\w+)/.exec(className || '');
            if (!inline && match && match[1] === 'answer') {
              return (
                <div className={cn(
                  "mt-8 p-2 border-[1px] inline-block min-w-[100px] rounded-none",
                  theme === 'light' ? "border-slate-900 bg-white" : "border-slate-100 bg-slate-900"
                )}>
                  <Markdown 
                    remarkPlugins={[remarkMath, remarkGfm, remarkBreaks]} 
                    rehypePlugins={[rehypeKatex]}
                  >
                    {String(children).replace(/\n$/, '')}
                  </Markdown>
                </div>
              );
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          }
        }}
      >
        {processedContent}
      </Markdown>
    </div>
  );
};

export default LatexMarkdown;
