<!-- Prep sheet for a lawyer or legal-aid visit; the print button uses the @media print layout. -->
<script lang="ts">
  import type { PrepSheet } from '@docket/core';

  interface Props {
    prepSheet: PrepSheet;
  }

  let { prepSheet }: Props = $props();

  const groups = $derived([
    { id: 'questions', title: 'Questions to ask', items: prepSheet.questionsForProfessional },
    { id: 'documents', title: 'Documents to gather', items: prepSheet.documentsToGather },
    { id: 'facts', title: 'Facts to write down', items: prepSheet.factsToWriteDown },
  ]);

  function print(): void {
    window.print();
  }
</script>

<section class="card prep-sheet" aria-labelledby="prep-heading">
  <h3 id="prep-heading">Prep sheet for a legal professional</h3>
  <p class="hint">
    Bring this to a lawyer or legal-aid clinic so the first conversation gets straight to the point.
  </p>
  <div class="two-col">
    {#each groups as group (group.id)}
      <div>
        <h4 id="prep-{group.id}">{group.title}</h4>
        <ul aria-labelledby="prep-{group.id}">
          {#each group.items as item (item)}
            <li>{item}</li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
  <button type="button" class="button button-secondary no-print" onclick={print}>
    Print prep sheet
  </button>
</section>
