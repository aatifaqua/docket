import { render, screen } from '@testing-library/svelte';
import { axe } from 'vitest-axe';
import { describe, expect, it } from 'vitest';
import SeverityBadge from './SeverityBadge.svelte';

describe('SeverityBadge', () => {
  it.each([
    ['critical', '!', 'Urgent'],
    ['important', '•', 'Important'],
    ['info', 'i', 'Info'],
  ] as const)('renders %s as a hidden glyph plus a visible word', (severity, glyph, word) => {
    const { container } = render(SeverityBadge, { props: { severity } });
    const glyphEl = container.querySelector('.badge-glyph');
    expect(glyphEl).toHaveAttribute('aria-hidden', 'true');
    expect(glyphEl).toHaveTextContent(glyph);
    expect(screen.getByText(word)).toHaveClass(`badge-${severity}`);
  });

  it('has no axe violations', async () => {
    const { container } = render(SeverityBadge, { props: { severity: 'critical' } });
    expect(await axe(container)).toHaveNoViolations();
  });
});
