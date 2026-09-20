import { fireEvent, render, screen, within } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Options from './Options.svelte';
import { fixtureAnalysis } from '../test-fixtures.ts';

describe('Options', () => {
  it('toggles aria-expanded and reveals the panel it controls', async () => {
    const { core, briefing } = fixtureAnalysis(0);
    render(Options, { props: { options: core.options, notes: briefing.optionNotes } });

    const button = screen.getByRole('button', { name: /Pay or fix the problem and stay/ });
    const panelId = button.getAttribute('aria-controls');
    expect(panelId).not.toBeNull();
    const panel = document.getElementById(panelId!)!;
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(panel).not.toBeVisible();

    await fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(panel).toBeVisible();
    expect(within(panel).getByText('Upsides')).toBeVisible();
    expect(within(panel).getByText('Downsides')).toBeVisible();
    expect(panel).toHaveTextContent('What it means for you:');
    expect(panel).toHaveTextContent('Typical next step:');

    await fireEvent.click(button);
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('omits the note when the briefing has none for an option', async () => {
    const { core } = fixtureAnalysis(0);
    render(Options, { props: { options: core.options, notes: [] } });
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(core.options.length);
    await fireEvent.click(buttons[0]!);
    expect(screen.queryByText('What it means for you:')).not.toBeInTheDocument();
  });
});
