<!--
  Checklist with real checkboxes. Ticks persist per analysis id in localStorage so a reload
  does not lose progress; storage access is wrapped because private windows can throw.
-->
<script lang="ts">
  import type { ChecklistItem } from '@docket/core';

  interface Props {
    items: ChecklistItem[];
    analysisId: string;
  }

  let { items, analysisId }: Props = $props();
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
  <p class="hint" aria-live="polite">{done} of {items.length} done. Saved on this device.</p>
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
        <label for="check-{item.id}">{item.text}</label>
      </li>
    {/each}
  </ul>
</section>
