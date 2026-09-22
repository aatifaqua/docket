<!--
  Application shell: skip link, landmarks, and the intake/results switch. Results is imported
  dynamically so the first paint only ships the intake form.
-->
<script lang="ts">
  import { DISCLAIMER, type Analysis } from '@docket/core';
  import Intake from './views/Intake.svelte';

  type ResultsModule = typeof import('./views/Results.svelte');

  /** Vite's base path so the mark resolves under a sub-path deployment such as GitHub Pages. */
  const base = import.meta.env.BASE_URL;

  let view = $state<'intake' | 'results'>('intake');
  let analysis = $state<Analysis | null>(null);
  let sourceText = $state('');
  let resultsModule = $state<Promise<ResultsModule> | null>(null);
  let returning = $state(false);

  function showResults(result: Analysis, text: string): void {
    analysis = result;
    sourceText = text;
    resultsModule ??= import('./views/Results.svelte');
    view = 'results';
  }

  function startOver(): void {
    analysis = null;
    sourceText = '';
    returning = true;
    view = 'intake';
  }
</script>

<a class="skip-link" href="#main">Skip to main content</a>

<header class="site-header">
  <div class="container brand">
    <img class="brand-mark" src="{base}favicon.svg" alt="" width="40" height="43" />
    <div>
      <h1>Docket</h1>
      <p class="tagline">Understand the legal notice you just received.</p>
    </div>
  </div>
</header>

<main id="main" class="site-main container" tabindex="-1">
  {#if view === 'intake' || analysis === null || resultsModule === null}
    <Intake oncomplete={showResults} focusOnMount={returning} />
  {:else}
    {#await resultsModule}
      <p class="status" role="status">Loading your results…</p>
    {:then { default: Results }}
      <Results {analysis} {sourceText} onrestart={startOver} />
    {/await}
  {/if}
</main>

<footer class="site-footer">
  <div class="container">
    <p><strong>Not legal advice.</strong> {DISCLAIMER}</p>
    <p>Deadlines are counted in calendar days. Your document is never saved to an account.</p>
  </div>
</footer>
