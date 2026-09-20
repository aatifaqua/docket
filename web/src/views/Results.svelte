<!--
  Results view, lazy-loaded so the intake bundle stays small. Order follows the design:
  disclaimer, what this is, timeline, options, checklist, prep sheet, terms, ask.
-->
<script lang="ts">
  import type { Analysis } from '@docket/core';
  import Disclaimer from '../components/Disclaimer.svelte';
  import Timeline from '../components/Timeline.svelte';
  import Options from '../components/Options.svelte';
  import Checklist from '../components/Checklist.svelte';
  import PrepSheet from '../components/PrepSheet.svelte';
  import Terms from '../components/Terms.svelte';
  import AskPanel from '../components/AskPanel.svelte';
  import { isDemoMode } from '../lib/api.ts';
  import { describeConfidence, KIND_LABELS } from '../lib/format.ts';

  interface Props {
    analysis: Analysis;
    sourceText: string;
    onrestart: () => void;
  }

  let { analysis, sourceText, onrestart }: Props = $props();
  let heading = $state<HTMLHeadingElement | null>(null);

  const sourceNote = $derived(
    isDemoMode()
      ? 'Demo mode: analysed in your browser without the AI language layer.'
      : analysis.source === 'gemini'
        ? 'Explanation written with Gemini from the facts found in your document.'
        : 'Explanation generated offline from the facts found in your document.',
  );

  $effect(() => {
    heading?.focus();
  });
</script>

<div class="stack">
  <Disclaimer />

  <header>
    <h2 id="results-heading" class="results-heading" tabindex="-1" bind:this={heading}>
      Your briefing
    </h2>
    <p>
      <span class="badge kind-badge">{KIND_LABELS[analysis.core.classification.kind]}</span>
      <span class="muted">
        {describeConfidence(analysis.core.classification.confidence)} about the document type.
      </span>
    </p>
    <p class="small muted">{sourceNote}</p>
  </header>

  <section class="card" aria-labelledby="what-heading">
    <h3 id="what-heading">What this is</h3>
    <p>{analysis.briefing.whatThisIs}</p>
    <p>{analysis.briefing.plainSummary}</p>
    <h4 id="key-points-heading">Key points</h4>
    <ul aria-labelledby="key-points-heading">
      {#each analysis.briefing.keyPoints as point (point)}
        <li>{point}</li>
      {/each}
    </ul>
  </section>

  <Timeline deadlines={analysis.core.deadlines} referenceDate={analysis.core.referenceDate} />
  <Options options={analysis.core.options} notes={analysis.briefing.optionNotes} />
  <Checklist items={analysis.briefing.checklist} analysisId={analysis.id} />
  <PrepSheet prepSheet={analysis.briefing.prepSheet} />
  <Terms terms={analysis.briefing.termsExplained} />
  <AskPanel {analysis} {sourceText} />

  <div class="button-row no-print">
    <button type="button" class="button button-secondary" onclick={onrestart}>Start over</button>
  </div>
</div>
