export interface Question {
  id: string;
  subject: 'Physics' | 'Chemistry' | 'Mathematics';
  text: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const sampleQuestions: Question[] = [
  {
    id: 'p1',
    subject: 'Physics',
    text: 'A particle moves along a straight line such that its displacement $x$ at time $t$ is given by $x^2 = t^2 + 1$. Its acceleration at time $t$ is:',
    options: [
      '$1/x$',
      '$1/x^2$',
      '$1/x^3$',
      '$-1/x^3$'
    ],
    correctAnswer: '$1/x^3$',
    explanation: 'Differentiating $x^2 = t^2 + 1$ with respect to $t$:\n$2x \\frac{dx}{dt} = 2t \\implies x v = t$\n\nDifferentiating again:\n$v^2 + x a = 1 \\implies a = \\frac{1 - v^2}{x}$\n\nFrom $xv = t$, $v = t/x$. Substituting this:\n$a = \\frac{1 - (t/x)^2}{x} = \\frac{x^2 - t^2}{x^3}$\n\nSince $x^2 - t^2 = 1$, we get $a = 1/x^3$.',
    difficulty: 'Medium'
  },
  {
    id: 'c1',
    subject: 'Chemistry',
    text: 'The pH of a $10^{-8}$ M HCl solution is:',
    options: [
      '8',
      '7',
      'Between 6 and 7',
      'Between 7 and 8'
    ],
    correctAnswer: 'Between 6 and 7',
    explanation: 'In very dilute solutions ($< 10^{-6}$ M), the contribution of $H^+$ ions from water must be considered.\n$[H^+]_{total} = [H^+]_{acid} + [H^+]_{water} = 10^{-8} + 10^{-7} = 1.1 \\times 10^{-7}$ M.\n$pH = -\\log(1.1 \\times 10^{-7}) \\approx 6.96$.\nTherefore, the pH is between 6 and 7.',
    difficulty: 'Medium'
  },
  {
    id: 'm1',
    subject: 'Mathematics',
    text: 'The value of $\\int_{0}^{\\pi/2} \\frac{\\sin^n x}{\\sin^n x + \\cos^n x} dx$ is:',
    options: [
      '$\\pi$',
      '$\\pi/2$',
      '$\\pi/4$',
      '0'
    ],
    correctAnswer: '$\\pi/4$',
    explanation: 'Using the property $\\int_{a}^{b} f(x) dx = \\int_{a}^{b} f(a+b-x) dx$:\nLet $I = \\int_{0}^{\\pi/2} \\frac{\\sin^n x}{\\sin^n x + \\cos^n x} dx$\nThen $I = \\int_{0}^{\\pi/2} \\frac{\\cos^n x}{\\cos^n x + \\sin^n x} dx$\n\nAdding the two equations:\n$2I = \\int_{0}^{\\pi/2} 1 dx = [x]_{0}^{\\pi/2} = \\pi/2$\n$I = \\pi/4$.',
    difficulty: 'Easy'
  },
  {
    id: 'p2',
    subject: 'Physics',
    text: 'The escape velocity from the Earth is $v_e$. If a body is projected with a velocity $2v_e$, its velocity in interstellar space will be:',
    options: [
      '$v_e$',
      '$\\sqrt{3}v_e$',
      '$\\sqrt{5}v_e$',
      '$2v_e$'
    ],
    correctAnswer: '$\\sqrt{3}v_e$',
    explanation: 'Using conservation of energy:\n$K_i + U_i = K_f + U_f$\n$\\frac{1}{2}m(2v_e)^2 - \\frac{GMm}{R} = \\frac{1}{2}mv_{\\infty}^2 + 0$\n\nSince $v_e = \\sqrt{\\frac{2GM}{R}}$, we have $\\frac{GMm}{R} = \\frac{1}{2}mv_e^2$.\n$2mv_e^2 - \\frac{1}{2}mv_e^2 = \\frac{1}{2}mv_{\\infty}^2$\n$\\frac{3}{2}mv_e^2 = \\frac{1}{2}mv_{\\infty}^2 \\implies v_{\\infty} = \\sqrt{3}v_e$.',
    difficulty: 'Medium'
  },
  {
    id: 'c2',
    subject: 'Chemistry',
    text: 'Which of the following has the highest bond order?',
    options: [
      '$O_2$',
      '$O_2^+$',
      '$O_2^-$',
      '$O_2^{2-}$'
    ],
    correctAnswer: '$O_2^+$',
    explanation: 'Using Molecular Orbital Theory:\n$O_2$: Bond Order = 2.0\n$O_2^+$: Bond Order = 2.5\n$O_2^-$: Bond Order = 1.5\n$O_2^{2-}$: Bond Order = 1.0\n\n$O_2^+$ has the highest bond order.',
    difficulty: 'Easy'
  },
  {
    id: 'm2',
    subject: 'Mathematics',
    text: 'If $z = x + iy$ and $|z-1| = |z+1|$, then the locus of $z$ is:',
    options: [
      'The x-axis',
      'The y-axis',
      'A circle',
      'A parabola'
    ],
    correctAnswer: 'The y-axis',
    explanation: '$|z-1| = |z+1| \\implies |(x-1) + iy| = |(x+1) + iy|$\n$\\sqrt{(x-1)^2 + y^2} = \\sqrt{(x+1)^2 + y^2}$\n$(x-1)^2 = (x+1)^2$\n$x^2 - 2x + 1 = x^2 + 2x + 1 \\implies 4x = 0 \\implies x = 0$.\n$x=0$ is the equation of the y-axis.',
    difficulty: 'Easy'
  },
  {
    id: 'p3',
    subject: 'Physics',
    text: 'The de Broglie wavelength of an electron accelerated through a potential difference of $V$ volts is approximately:',
    options: [
      '$\\frac{12.27}{\\sqrt{V}}$ Å',
      '$\\frac{1.227}{\\sqrt{V}}$ Å',
      '$\\frac{122.7}{\\sqrt{V}}$ Å',
      '$\\frac{1227}{\\sqrt{V}}$ Å'
    ],
    correctAnswer: '$\\frac{12.27}{\\sqrt{V}}$ Å',
    explanation: '$\\lambda = \\frac{h}{p} = \\frac{h}{\\sqrt{2mE}} = \\frac{h}{\\sqrt{2meV}}$\nSubstituting values for $h, m, e$:\n$\\lambda \\approx \\sqrt{\\frac{150}{V}}$ Å $\\approx \\frac{12.27}{\\sqrt{V}}$ Å.',
    difficulty: 'Easy'
  },
  {
    id: 'c3',
    subject: 'Chemistry',
    text: 'The number of radial nodes in a 3p orbital is:',
    options: [
      '0',
      '1',
      '2',
      '3'
    ],
    correctAnswer: '1',
    explanation: 'Number of radial nodes = $n - l - 1$.\nFor 3p orbital: $n = 3, l = 1$.\nRadial nodes = $3 - 1 - 1 = 1$.',
    difficulty: 'Easy'
  },
  {
    id: 'm3',
    subject: 'Mathematics',
    text: 'The area bounded by the curve $y = x^2$ and the line $y = 4$ is:',
    options: [
      '32/3',
      '16/3',
      '8/3',
      '4/3'
    ],
    correctAnswer: '32/3',
    explanation: 'The points of intersection are $x^2 = 4 \\implies x = \\pm 2$.\nArea = $\\int_{-2}^{2} (4 - x^2) dx = 2 \\int_{0}^{2} (4 - x^2) dx$\nArea = $2 [4x - \\frac{x^3}{3}]_{0}^{2} = 2 [8 - \\frac{8}{3}] = 2 [\\frac{16}{3}] = 32/3$.',
    difficulty: 'Medium'
  }
];
