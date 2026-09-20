<!-- Glossary as a definition list so screen readers pair each term with its meaning. -->
<script lang="ts">
  import type { TermExplained } from '@docket/core';

  interface Props {
    terms: TermExplained[];
  }

  let { terms }: Props = $props();
</script>

{#if terms.length > 0}
  <section class="card" aria-labelledby="terms-heading">
    <h3 id="terms-heading">Terms explained</h3>
    <dl class="terms">
      {#each terms as entry (entry.term)}
        <dt>{entry.term}</dt>
        <dd>{entry.meaning}</dd>
      {/each}
    </dl>
  </section>
{/if}
