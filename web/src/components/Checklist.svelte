<!--
  Checklist with real checkboxes. Ticks persist per analysis id in localStorage so a reload
  does not lose progress; storage access is wrapped because private windows can throw.
-->
<script lang="ts">
  import type { ChecklistItem, Deadline } from '@docket/core';
  import { formatLongDate } from '../lib/format.ts';

  interface Props {
    items: ChecklistItem[];
    analysisId: string;
    deadlines?: Deadline[];
  }

  let { items, analysisId, deadlines = [] }: Props = $props();

  /** Short "by <date>" note when the item is tied to a dated deadline. */
  function dueNote(item: ChecklistItem): string {
    const deadline = deadlines.find((entry) => entry.id === item.relatedDeadlineId);
    return deadline?.date ? `By ${formatLongDate(deadline.date)}.` : '';
  }
  const storageKey = $derived(`docket:checklist:${analysisId}`);
  let checked = $derived(load(storageKey));

  function load(key: string): string[] {
    try {
      const raw = window.localStorage.getItem(key);
      const parsed: unknown = raw === null ? [] : JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === 'string') : [];
    } catch {
      return [];
    }
  }

  function save(ids: string[]): void {
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(ids));
    } catch {
      /* Storage unavailable: the checklist still works for this visit. */
    }
  }

  function toggle(id: string): void {
    checked = checked.includes(id) ? checked.filter((entry) => entry !== id) : [...checked, id];
    save(checked);
  }

  const done = $derived(items.filter((item) => checked.includes(item.id)).length);
</script>

<section class="card" aria-labelledby="checklist-heading">
  <h3 id="checklist-heading">Checklist</h3>
  <p class="hint">
    <span aria-live="polite">{done} of {items.length} done.</span> Saved on this device.
  </p>
  <ul class="checklist">
    {#each items as item (item.id)}
      <li>
        <input
          type="checkbox"
          id="check-{item.id}"
          checked={checked.includes(item.id)}
          onchange={() => {
            toggle(item.id);
          }}
        />
        <label for="check-{item.id}">
          {item.text}
          {#if dueNote(item) !== ''}<span class="muted"> {dueNote(item)}</span>{/if}
        </label>
      </li>
    {/each}
  </ul>
</section>
