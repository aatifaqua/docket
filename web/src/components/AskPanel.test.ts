import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Answer } from '@docket/core';
import AskPanel from './AskPanel.svelte';
import { fixtureAnalysis, sampleNotice } from '../test-fixtures.ts';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('AskPanel', () => {
  it('stays usable in demo mode and explains that answers are matched offline', () => {
    render(AskPanel, { props: { analysis: fixtureAnalysis(0), sourceText: sampleNotice(0).text } });
    expect(screen.getByLabelText('Your question')).toBeEnabled();
    expect(screen.getByText(/matching sentences in your document/)).toBeVisible();
  });

  it('shows grounded answers with citations and flags ungrounded ones', async () => {
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(AskPanel, { props: { analysis: fixtureAnalysis(0), sourceText: '' } });

    const input = screen.getByLabelText('Your question');
    const button = screen.getByRole('button', { name: 'Ask' });
    expect(input).toBeEnabled();
    expect(button).toBeDisabled();

    const grounded: Answer = {
      answer: 'You owe $1,925.00.',
      grounded: true,
      citations: ['for a total of $1,925.00.'],
      source: 'gemini',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(grounded));
    await fireEvent.input(input, { target: { value: 'How much do I owe?' } });
    expect(button).toBeEnabled();
    await fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText('You owe $1,925.00.')).toBeVisible();
    expect(screen.getByText('for a total of $1,925.00.').tagName).toBe('BLOCKQUOTE');
    expect(screen.getByText(/Answered with Gemini/)).toBeVisible();
    expect(screen.queryByText(/Not found in your document/)).not.toBeInTheDocument();

    const ungrounded: Answer = {
      answer: 'The document does not say.',
      grounded: false,
      citations: [],
      source: 'fallback',
    };
    fetchMock.mockResolvedValueOnce(jsonResponse(ungrounded));
    await fireEvent.submit(input.closest('form')!);
    expect(await screen.findByText(/Not found in your document/)).toBeVisible();
    expect(screen.getByText(/Answered offline/)).toBeVisible();
  });

  it('ignores a blank submission', async () => {
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    render(AskPanel, { props: { analysis: fixtureAnalysis(0), sourceText: '' } });
    const input = screen.getByLabelText('Your question');
    await fireEvent.input(input, { target: { value: '   ' } });
    await fireEvent.submit(input.closest('form')!);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a plain-language error when the server fails', async () => {
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    render(AskPanel, { props: { analysis: fixtureAnalysis(0), sourceText: '' } });

    const input = screen.getByLabelText('Your question');
    await fireEvent.input(input, { target: { value: 'Anything?' } });
    await fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/went wrong on our side/);
    });
  });
});
