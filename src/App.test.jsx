import { render, screen } from '@testing-library/react';
import App from './App';

test('renders homepage hero heading', () => {
  render(<App />);
  const heading = screen.getByText(/Transform Your Photos into/i);
  expect(heading).toBeInTheDocument();
});
