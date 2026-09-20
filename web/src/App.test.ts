import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import { DISCLAIMER } from '@docket/core';
import App from './App.svelte';
import { sampleNotice } from './test-fixtures.ts';

describe('App shell', () => {
  it('starts with a skip link, landmarks, one h1 and no axe violations', async () => {
    const { container } = render(App);
    const skip = screen.getByRole('link', { name: 'Skip to main content' });
    expect(skip).toHaveAttribute('href', '#main');
    expect(container.firstElementChild).toBe(skip);
    expect(screen.getByRole('banner')).toBeInTheDocument();
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
    expect(screen.getByRole('contentinfo')).toHaveTextContent(DISCLAIMER);
    expect(screen.getByRole('contentinfo')).toHaveTextContent('Not legal advice.');
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Docket');
    expect(await axe(container)).toHaveNoViolations();
  });

  it('analyses a sample, focuses the results heading, and returns focus on start over', async () => {
    render(App);
    await fireEvent.click(screen.getByRole('button', { name: sampleNotice(0).title }));
    await fireEvent.click(screen.getByRole('button', { name: 'Analyse document' }));

    const heading = await screen.findByRole('heading', { name: 'Your briefing' });
    await waitFor(() => {
      expect(heading).toHaveFocus();
    });
    expect(screen.getByRole('note')).toHaveTextContent(DISCLAIMER);
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
    expect(screen.getByText('Eviction notice')).toBeInTheDocument();

    await fireEvent.click(screen.getByRole('button', { name: 'Start over' }));
    const textarea = await screen.findByLabelText('Document text');
    await waitFor(() => {
      expect(textarea).toHaveFocus();
    });
    expect(textarea).toHaveValue('');
  });
});
