import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import Terms from './Terms.svelte';

describe('Terms', () => {
  it('pairs each term with its meaning in a definition list', () => {
    render(Terms, {
      props: {
        terms: [
          { term: 'summons', meaning: 'The official notice that you are being sued.' },
          { term: 'answer', meaning: 'Your written response to the complaint.' },
        ],
      },
    });
    expect(screen.getByRole('heading', { name: 'Terms explained' })).toBeVisible();
    expect(screen.getByText('summons').tagName).toBe('DT');
    expect(screen.getByText('Your written response to the complaint.').tagName).toBe('DD');
  });

  it('renders nothing when there are no terms', () => {
    const { container } = render(Terms, { props: { terms: [] } });
    expect(container.querySelector('section')).toBeNull();
  });
});
