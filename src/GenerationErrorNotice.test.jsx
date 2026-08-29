import { render, screen } from '@testing-library/react';
import GenerationErrorNotice from './components/GenerationErrorNotice';
import { describeGenerationError } from './utils/generationErrors';

/**
 * The manual check this stands in for cannot be run here: forcing a real 402 needs a Stability
 * key with an empty balance, and the backend does not start locally without its secrets. What
 * matters is not the pixels but the two decisions the notice makes — which cause it names, and
 * whether it offers a retry — so those are asserted directly.
 */

// A minimal stand-in for the `ApiError` the client throws; only these fields are read.
const apiError = (fields) => Object.assign(new Error(fields.message ?? 'boom'), fields);

test('an exhausted balance is named and offers no retry', () => {
  render(
    <GenerationErrorNotice
      error={apiError({ status: 402, code: 'stability_credits_exhausted', retryable: false })}
      onRetry={() => {}}
    />,
  );

  expect(screen.getByText('Out of generation credits')).toBeInTheDocument();
  // The whole point: retrying an empty balance cannot work, so the button must be absent.
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('a rate limit offers a retry that waits out the countdown', () => {
  render(
    <GenerationErrorNotice
      error={apiError({ status: 429, code: 'stability_rate_limited', retryable: true, retryAfterSeconds: 12 })}
      onRetry={() => {}}
    />,
  );

  const button = screen.getByRole('button');
  expect(button).toHaveTextContent('Try again in 12s');
  expect(button).toBeDisabled(); // Retrying inside the window extends the rate limit
});

test('an outage offers an immediate retry', () => {
  render(
    <GenerationErrorNotice
      error={apiError({ status: 503, code: 'stability_unavailable', retryable: true })}
      onRetry={() => {}}
    />,
  );

  expect(screen.getByRole('button')).toHaveTextContent('Try again');
});

test('a client-side validation string stays a bare sentence', () => {
  render(<GenerationErrorNotice error="Please enter a description for your artwork." onRetry={() => {}} />);

  expect(screen.getByText('Please enter a description for your artwork.')).toBeInTheDocument();
  // No heading and no retry: this is not an API failure and must not be dressed up as one.
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
});

test('an unrecognised code falls back to the backend detail rather than rendering nothing', () => {
  const descriptor = describeGenerationError(
    apiError({ status: 500, code: 'stability_something_new', message: 'Something went wrong.' }),
  );

  expect(descriptor.message).toBe('Something went wrong.');
  expect(descriptor.retryable).toBe(true); // A 5xx with no known code is still worth one retry
});

test('a failed fetch with no response reads as an unreachable backend', () => {
  const descriptor = describeGenerationError(new TypeError('Failed to fetch'));

  expect(descriptor.title).toBe('Cannot reach Ghibli AI');
  expect(descriptor.retryable).toBe(true);
});
