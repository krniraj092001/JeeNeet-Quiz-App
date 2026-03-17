import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import LatexMarkdown from './LatexMarkdown';
import React from 'react';

describe('LatexMarkdown', () => {
  it('renders text content correctly', () => {
    render(<LatexMarkdown content="Hello World" />);
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('returns null if no content is provided', () => {
    const { container } = render(<LatexMarkdown content="" />);
    expect(container.firstChild).toBeNull();
  });

  it('applies theme classes correctly', () => {
    const { container: lightContainer } = render(<LatexMarkdown content="Test" theme="light" />);
    expect(lightContainer.firstChild).toHaveClass('text-slate-900');

    const { container: darkContainer } = render(<LatexMarkdown content="Test" theme="dark" />);
    expect(darkContainer.firstChild).toHaveClass('text-slate-100');
  });

  it('applies large class correctly', () => {
    const { container } = render(<LatexMarkdown content="Test" large={true} />);
    expect(container.firstChild).toHaveClass('text-xl');
  });
});
