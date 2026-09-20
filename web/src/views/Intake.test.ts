import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MIN_INPUT_WORDS } from '@docket/core';
import Intake from './Intake.svelte';
import { todayIso } from '../lib/format.ts';
import { sampleNotice } from '../test-fixtures.ts';

const words = (count: number): string => Array.from({ length: count }, () => 'word').join(' ');

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('Intake', () => {
  it('keeps the analyse button disabled until enough words are entered', async () => {
    render(Intake, { props: { oncomplete: vi.fn() } });
    const button = screen.getByRole('button', { name: 'Analyse document' });
    const textarea = screen.getByLabelText('Document text');
    expect(button).toBeDisabled();
    expect(screen.getByLabelText('Reference date')).toHaveValue(todayIso());

    await fireEvent.input(textarea, { target: { value: words(MIN_INPUT_WORDS - 1) } });
    expect(button).toBeDisabled();
    expect(screen.getByText('Add 1 more words to analyse.')).toBeVisible();

    await fireEvent.input(textarea, { target: { value: words(MIN_INPUT_WORDS) } });
    expect(button).toBeEnabled();
    expect(screen.getByText(/characters, 40 words/)).toBeVisible();
  });

  it('fills the textarea from a sample chip and announces it', async () => {
    render(Intake, { props: { oncomplete: vi.fn() } });
    const sample = sampleNotice(2);
    await fireEvent.click(screen.getByRole('button', { name: sample.title }));
    expect(screen.getByLabelText('Document text')).toHaveValue(sample.text);
    const status = screen.getByText(`Sample "${sample.title}" loaded into the text box.`);
    expect(status).toHaveAttribute('aria-live', 'polite');
  });

  it('completes an analysis and reports it to the parent', async () => {
    const oncomplete = vi.fn();
    render(Intake, { props: { oncomplete } });
    const sample = sampleNotice(0);
    await fireEvent.click(screen.getByRole('button', { name: sample.title }));
    await fireEvent.click(screen.getByRole('button', { name: 'Analyse document' }));
    await waitFor(() => {
      expect(oncomplete).toHaveBeenCalledTimes(1);
    });
    const [analysis, text] = oncomplete.mock.calls[0] as [{ id: string }, string];
    expect(analysis.id).toMatch(/^demo-/);
    expect(text).toBe(sample.text);
    expect(screen.getByText('Analysis complete. Showing your results.')).toBeVisible();
  });

  it('loads .txt files into the textarea and explains that PDF needs the server', async () => {
    render(Intake, { props: { oncomplete: vi.fn() } });
    const input = screen.getByLabelText('Choose a .txt or .pdf file');
    const textFile = new File(['pasted from file'], 'notes.txt', { type: 'text/plain' });
    await fireEvent.change(input, { target: { files: [textFile] } });
    await waitFor(() => {
      expect(screen.getByLabelText('Document text')).toHaveValue('pasted from file');
    });
    expect(screen.getByText('Loaded notes.txt into the text box.')).toBeVisible();

    const pdf = new File(['%PDF-1.4'], 'notice.pdf', { type: 'application/pdf' });
    await fireEvent.change(input, { target: { files: [pdf] } });
    expect(screen.getByRole('alert')).toHaveTextContent(/PDF files need the full server/);
  });

  it('shows an error when a text file cannot be read', async () => {
    class FailingReader {
      onerror: (() => void) | null = null;
      onload: (() => void) | null = null;
      result: string | null = null;
      readAsText(): void {
        queueMicrotask(() => this.onerror?.());
      }
    }
    vi.stubGlobal('FileReader', FailingReader);
    render(Intake, { props: { oncomplete: vi.fn() } });
    await fireEvent.change(screen.getByLabelText('Choose a .txt or .pdf file'), {
      target: { files: [new File(['x'], 'broken.txt', { type: 'text/plain' })] },
    });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/could not read that file/);
    });
  });

  it('uploads a PDF in server mode and shows server errors in the alert region', async () => {
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 429 }));
    vi.stubGlobal('fetch', fetchMock);
    render(Intake, { props: { oncomplete: vi.fn() } });

    const pdf = new File(['%PDF-1.4'], 'notice.pdf', { type: 'application/pdf' });
    await fireEvent.change(screen.getByLabelText('Choose a .txt or .pdf file'), {
      target: { files: [pdf] },
    });
    expect(screen.getByText('notice.pdf is ready to upload.')).toBeVisible();
    const button = screen.getByRole('button', { name: 'Analyse document' });
    expect(button).toBeEnabled();

    await fireEvent.click(button);
    const alert = await screen.findByRole('alert');
    await waitFor(() => {
      expect(alert).toHaveTextContent(/wait a minute/);
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(button).toBeEnabled();
  });

  it('focuses the textarea when asked to', () => {
    render(Intake, { props: { oncomplete: vi.fn(), focusOnMount: true } });
    expect(screen.getByLabelText('Document text')).toHaveFocus();
  });
});
