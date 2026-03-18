import React, { useRef, useEffect } from 'react';
import { useKaTeX } from '../hooks/useKaTeX';
import { cn } from '../utils';

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Component to render a string containing LaTeX (e.g., "$x^2$")
 */
export const MathText: React.FC<MathTextProps> = ({ text, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLoaded, renderMath } = useKaTeX();

  useEffect(() => {
    if (isLoaded && containerRef.current) {
      renderMath(containerRef.current);
    }
  }, [isLoaded, text, renderMath]);

  return (
    <div 
      ref={containerRef} 
      className={cn("math-text-container", className)}
    >
      {text}
    </div>
  );
};
