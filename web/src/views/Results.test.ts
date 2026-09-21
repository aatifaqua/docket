import { fireEvent, render, screen } from '@testing-library/svelte';
import { axe } from 'vitest-axe';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DISCLAIMER } from '@docket/core';
import Results from './Results.svelte';
import { fixtureAnalysis, sampleNotice } from '../test-fixtures.ts';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('Results', () => {
  it('renders every section in order and has no axe violations', async () => {
    const analysis = fixtureAnalysis(0);
    const { container } = render(Results, {
      props: { analysis, sourceText: sampleNotice(0).text, onrestart: vi.fn() },
    });

    expect(screen.getByRole('note')).toHaveTextContent(DISCLAIMER);
    const headings = screen.getAllByRole('heading').map((heading) => heading.textContent.trim());
    expect(headings).toEqual([
      'Your briefing',
      'What this is',
      'Key points',
      'What it asks of you',
      'Obligations',
      'Amounts mentioned',
      'Timeline',
      'Your options',
      ...analysis.core.options.map((option) => option.title),
      'Checklist',
      'Prep sheet for a legal professional',
      'Questions to ask',
      'Documents to gather',
      'Facts to write down',
      'Terms explained',
      'Ask about this document',
    ]);
    expect(screen.getByText('Eviction notice')).toHaveClass('kind-badge');
    expect(screen.getByText(/Fairly confident about the document type/)).toBeVisible();
    expect(screen.getByText(/Demo mode: analysed in your browser/)).toBeVisible();
    expect(container.querySelectorAll('dl.terms dt')).toHaveLength(
      analysis.briefing.termsExplained.length,
    );
    expect(await axe(container)).toHaveNoViolations();
  });

  it('prints the prep sheet and hands control back on start over', async () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const onrestart = vi.fn();
    render(Results, { props: { analysis: fixtureAnalysis(1), sourceText: '', onrestart } });

    await fireEvent.click(screen.getByRole('button', { name: 'Print prep sheet' }));
    expect(print).toHaveBeenCalledTimes(1);
    await fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    expect(onrestart).toHaveBeenCalledTimes(1);
  });

  it('names the language layer in server mode', () => {
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    const analysis = { ...fixtureAnalysis(2), source: 'gemini' as const };
    render(Results, { props: { analysis, sourceText: '', onrestart: vi.fn() } });
    expect(screen.getByText(/written with Gemini/)).toBeVisible();
  });

  it('says when the explanation was generated offline in server mode', () => {
    vi.stubEnv('VITE_API_BASE', 'http://api.test');
    render(Results, {
      props: { analysis: fixtureAnalysis(2), sourceText: '', onrestart: vi.fn() },
    });
    expect(screen.getByText(/generated offline/)).toBeVisible();
  });

  it('lists obligations and amounts, and hides the section when there are none', () => {
    const analysis = fixtureAnalysis(0);
    const first = render(Results, {
      props: { analysis, sourceText: sampleNotice(0).text, onrestart: vi.fn() },
    });
    expect(screen.getByRole('heading', { name: 'What it asks of you' })).toBeVisible();
    expect(screen.getByRole('list', { name: 'Amounts mentioned' })).toHaveTextContent('$1,925.00');
    first.unmount();

    const amountsOnly = {
      ...analysis,
      core: { ...analysis.core, obligations: [] },
    };
    const second = render(Results, {
      props: { analysis: amountsOnly, sourceText: '', onrestart: vi.fn() },
    });
    expect(screen.queryByRole('heading', { name: 'Obligations' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Amounts mentioned' })).toBeVisible();
    second.unmount();

    const bare = {
      ...analysis,
      core: { ...analysis.core, obligations: [], amounts: [] },
    };
    render(Results, { props: { analysis: bare, sourceText: '', onrestart: vi.fn() } });
    expect(screen.queryByRole('heading', { name: 'What it asks of you' })).toBeNull();
  });
});
