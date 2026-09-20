import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import FileDrop from './FileDrop.svelte';

const file = new File(['hello'], 'notice.txt', { type: 'text/plain' });

describe('FileDrop', () => {
  it('reports a file chosen through the keyboard-reachable input', async () => {
    const onfile = vi.fn();
    render(FileDrop, { props: { onfile } });
    const input = screen.getByLabelText('Choose a .txt or .pdf file');
    expect(input).toHaveAttribute('type', 'file');
    await fireEvent.change(input, { target: { files: [file] } });
    expect(onfile).toHaveBeenCalledWith(file);
  });

  it('does nothing when the picker is dismissed without a file', async () => {
    const onfile = vi.fn();
    render(FileDrop, { props: { onfile } });
    await fireEvent.change(screen.getByLabelText('Choose a .txt or .pdf file'), {
      target: { files: [] },
    });
    expect(onfile).not.toHaveBeenCalled();
  });

  it('accepts a dropped file and highlights while dragging', async () => {
    const onfile = vi.fn();
    render(FileDrop, { props: { onfile } });
    const zone = screen.getByRole('group', { name: 'Upload a file' });
    await fireEvent.dragOver(zone);
    expect(zone).toHaveClass('dragging');
    await fireEvent.dragLeave(zone);
    expect(zone).not.toHaveClass('dragging');
    await fireEvent.drop(zone, { dataTransfer: { files: [file] } });
    expect(onfile).toHaveBeenCalledWith(file);
    expect(zone).not.toHaveClass('dragging');
  });

  it('ignores drops while disabled', async () => {
    const onfile = vi.fn();
    render(FileDrop, { props: { onfile, disabled: true } });
    await fireEvent.drop(screen.getByRole('group'), { dataTransfer: { files: [file] } });
    expect(onfile).not.toHaveBeenCalled();
  });
});
