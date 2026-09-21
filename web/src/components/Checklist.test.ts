import { fireEvent, render, screen } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import Checklist from './Checklist.svelte';
import { fixtureAnalysis } from '../test-fixtures.ts';

const KEY = 'docket:checklist:a1';

describe('Checklist', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('persists checked ids under the analysis id and restores them', async () => {
    const { briefing } = fixtureAnalysis(0);
    const items = briefing.checklist;
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const first = render(Checklist, { props: { items, analysisId: 'a1' } });

    expect(screen.getByText(`0 of ${String(items.length)} done.`)).toBeVisible();
    await fireEvent.click(screen.getByLabelText(items[0]!.text));
    expect(setItem).toHaveBeenCalledWith(KEY, JSON.stringify([items[0]!.id]));
    expect(screen.getByText(`1 of ${String(items.length)} done.`)).toBeVisible();

    await fireEvent.click(screen.getByLabelText(items[0]!.text));
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual([]);

    await fireEvent.click(screen.getByLabelText(items[1]!.text));
    first.unmount();

    render(Checklist, { props: { items, analysisId: 'a1' } });
    expect(screen.getByLabelText(items[1]!.text)).toBeChecked();
    expect(screen.getByLabelText(items[0]!.text)).not.toBeChecked();
  });

  it('drops stored values that are not a list of ids', () => {
    const { briefing } = fixtureAnalysis(0);
    const items = briefing.checklist;
    window.localStorage.setItem(KEY, JSON.stringify({ [items[0]!.id]: true }));
    const first = render(Checklist, { props: { items, analysisId: 'a1' } });
    expect(screen.getByText(/0 of \d+ done/)).toBeVisible();
    first.unmount();

    window.localStorage.setItem(KEY, JSON.stringify([42, items[1]!.id]));
    render(Checklist, { props: { items, analysisId: 'a1' } });
    expect(screen.getByLabelText(items[1]!.text)).toBeChecked();
    expect(screen.getByText(/1 of \d+ done/)).toBeVisible();
  });

  it('ignores corrupt or unavailable storage', async () => {
    const { briefing } = fixtureAnalysis(0);
    const items = briefing.checklist;
    window.localStorage.setItem(KEY, '{not json');
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    render(Checklist, { props: { items, analysisId: 'a1' } });
    const box = screen.getByLabelText(items[0]!.text);
    expect(box).not.toBeChecked();
    await fireEvent.click(box);
    expect(box).toBeChecked();
    expect(screen.getByText(/1 of \d+ done/)).toBeVisible();
  });

  it('shows the deadline date next to items that are tied to a dated deadline', () => {
    const { core } = fixtureAnalysis(0);
    const dated = core.deadlines.find((deadline) => deadline.date !== null);
    if (dated === undefined) throw new Error('fixture has no dated deadline');
    const items = [
      { id: 'ck-1', text: 'Pay what is owed', relatedDeadlineId: dated.id },
      { id: 'ck-2', text: 'Call legal aid', relatedDeadlineId: null },
      { id: 'ck-3', text: 'Unknown link', relatedDeadlineId: 'dl-999' },
    ];
    render(Checklist, { props: { items, analysisId: 'a2', deadlines: core.deadlines } });
    expect(screen.getByLabelText(/Pay what is owed/)).toBeVisible();
    expect(screen.getByText(/^By /)).toBeVisible();
    expect(screen.getByLabelText('Call legal aid')).toBeVisible();
    expect(screen.getByLabelText('Unknown link')).toBeVisible();
  });
});
