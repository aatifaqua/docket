<!--
  Expandable option cards. A real <button> with aria-expanded/aria-controls keeps the toggle
  keyboard-operable and announced correctly; the catalogue content comes from the core and the
  model may only add a "what it means for you" note.
-->
<script lang="ts">
  import type { OptionNote, OptionPath } from '@docket/core';
  import SeverityBadge from './SeverityBadge.svelte';

  interface Props {
    options: OptionPath[];
    notes: OptionNote[];
  }

  let { options, notes }: Props = $props();
  let open = $state<Record<string, boolean>>({});

  function toggle(id: string): void {
    open = { ...open, [id]: !(open[id] ?? false) };
  }

  function noteFor(id: string): string | undefined {
    return notes.find((note) => note.optionId === id)?.whatItMeansForYou;
  }
</script>

<section class="card" aria-labelledby="options-heading">
  <h3 id="options-heading">Your options</h3>
  <p class="hint">
    Common paths people in this situation consider. Which one fits depends on facts we cannot see; a
    professional can help you choose.
  </p>
  {#each options as option (option.id)}
    {@const isOpen = open[option.id] ?? false}
    {@const note = noteFor(option.id)}
    <div class="option">
      <h4>
        <button
          type="button"
          class="button option-toggle"
          aria-expanded={isOpen}
          aria-controls="panel-{option.id}"
          onclick={() => {
            toggle(option.id);
          }}
        >
          {option.title}
        </button>
      </h4>
      <div id="panel-{option.id}" class="option-panel" hidden={!isOpen}>
        <p><SeverityBadge severity={option.urgency} /> {option.summary}</p>
        {#if note !== undefined}
          <p><strong>What it means for you:</strong> {note}</p>
        {/if}
        <div class="two-col">
          <div>
            <p class="label" id="pros-{option.id}">Upsides</p>
            <ul aria-labelledby="pros-{option.id}">
              {#each option.pros as pro (pro)}
                <li>{pro}</li>
              {/each}
            </ul>
          </div>
          <div>
            <p class="label" id="cons-{option.id}">Downsides</p>
            <ul aria-labelledby="cons-{option.id}">
              {#each option.cons as con (con)}
                <li>{con}</li>
              {/each}
            </ul>
          </div>
        </div>
        <p><strong>Typical next step:</strong> {option.typicalNextStep}</p>
      </div>
    </div>
  {/each}
</section>
