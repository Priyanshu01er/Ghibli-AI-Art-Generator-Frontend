import { render, screen } from '@testing-library/react';
import App from './App';

test('renders homepage hero heading', () => {
  render(<App />);
  // The headline types itself in one character per span, so no single element owns that run of
  // text any more. The accessible name is the stronger assertion anyway: it is what a screen
  // reader announces, and it covers both lines rather than the first one.
  const heading = screen.getByRole('heading', {
    level: 1,
    name: /Transform Your Photos into Ghibli Art with Ghibli AI/i,
  });
  expect(heading).toBeInTheDocument();
});
