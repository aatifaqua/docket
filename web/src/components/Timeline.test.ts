import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import type { Deadline } from '@docket/core';
import Timeline from './Timeline.svelte';
import { fixtureAnalysis, REFERENCE_DATE } from '../test-fixtures.ts';

describe('Timeline', () => {
  it('renders each deadline with a severity word, icon, long date and relative hint', () => {
    const { core } = fixtureAnalysis(0);
    const { container } = render(Timeline, {
      props: { deadlines: core.deadlines, referenceDate: REFERENCE_DATE },
    });

    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(core.deadlines.length);
    expect(screen.getAllByText('Urgent').length).toBeGreaterThan(0);
    expect(container.querySelectorAll('.badge-glyph[aria-hidden="true"]').length).toBe(
      core.deadlines.length,
    );
    expect(screen.getAllByText('October 6, 2026 (in 5 days)').length).toBeGreaterThan(0);
    expect(screen.getByText(/counted in calendar days from October 1, 2026/)).toBeInTheDocument();
    expect(screen.getAllByText('Where this comes from')).toHaveLength(core.deadlines.length);
    expect(container.querySelector('blockquote')).toHaveTextContent(/Within five \(5\) days/);
  });

  it('handles undated and past deadlines', () => {
    const deadlines: Deadline[] = [
      {
        id: 'dl-0',
        kind: 'respond',
        label: 'Respond in writing',
        date: '2026-09-28',
        daysFromReference: -3,
        sourceText: 'Respond by September 28, 2026.',
        severity: 'important',
      },
      {
        id: 'dl-1',
        kind: 'other',
        label: 'Deadline',
        date: null,
        daysFromReference: null,
        sourceText: 'Act immediately.',
        severity: 'info',
      },
    ];
    render(Timeline, { props: { deadlines, referenceDate: REFERENCE_DATE } });
    expect(screen.getByText('September 28, 2026 (3 days ago)')).toBeInTheDocument();
    expect(screen.getByText('Date not stated')).toBeInTheDocument();
    expect(screen.getByText('Info')).toBeInTheDocument();
  });

  it('explains when nothing dated was found', () => {
    render(Timeline, { props: { deadlines: [], referenceDate: REFERENCE_DATE } });
    expect(screen.getByText(/did not find a dated deadline/)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });
});
