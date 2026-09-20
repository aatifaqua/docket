<!--
  Intake form. Everything the analysis needs is collected here: the text (pasted, from a
  sample, or read from a file), and the reference date that relative deadlines count from.
-->
<script lang="ts">
  import { MIN_INPUT_WORDS, SAMPLE_NOTICES, type Analysis } from '@docket/core';
  import {
    analyze,
    analyzeFile,
    isDemoMode,
    isTextFile,
    messageOf,
    readTextFile,
  } from '../lib/api.ts';
  import { countWords, todayIso } from '../lib/format.ts';
  import FileDrop from '../components/FileDrop.svelte';
  import SampleChips from '../components/SampleChips.svelte';

  interface Props {
    oncomplete: (analysis: Analysis, sourceText: string) => void;
    focusOnMount?: boolean;
  }

  let { oncomplete, focusOnMount = false }: Props = $props();
  const demo = isDemoMode();

  let text = $state('');
  let referenceDate = $state(todayIso());
  let pendingFile = $state<File | null>(null);
  let busy = $state(false);
  let status = $state('');
  let error = $state('');
  let textarea = $state<HTMLTextAreaElement | null>(null);

  const wordCount = $derived(countWords(text));
  const sampleId = $derived(SAMPLE_NOTICES.find((sample) => sample.text === text)?.id ?? null);
  const canAnalyze = $derived(
    !busy && (wordCount >= MIN_INPUT_WORDS || pendingFile !== null) && referenceDate !== '',
  );

  $effect(() => {
    if (focusOnMount) textarea?.focus();
  });

  function pickSample(sample: (typeof SAMPLE_NOTICES)[number]): void {
    text = sample.text;
    pendingFile = null;
    error = '';
    status = `Sample "${sample.title}" loaded into the text box.`;
  }

  async function handleFile(file: File): Promise<void> {
    error = '';
    if (isTextFile(file)) {
      try {
        text = await readTextFile(file);
        pendingFile = null;
        status = `Loaded ${file.name} into the text box.`;
      } catch (failure) {
        error = messageOf(failure);
      }
      return;
    }
    if (demo) {
      error = 'PDF files need the full server. In this demo, paste the text or choose a .txt file.';
      return;
    }
    pendingFile = file;
    status = `${file.name} is ready to upload.`;
  }

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    if (!canAnalyze) return;
    busy = true;
    error = '';
    status = 'Analysing your document. This usually takes a few seconds.';
    try {
      const analysis =
        pendingFile === null
          ? await analyze({ text, referenceDate, sampleId })
          : await analyzeFile(pendingFile, referenceDate);
      status = 'Analysis complete. Showing your results.';
      oncomplete(analysis, text);
    } catch (failure) {
      error = messageOf(failure);
      status = '';
    } finally {
      busy = false;
    }
  }
</script>

<form class="stack" onsubmit={submit} aria-busy={busy}>
  <div>
    <h2>Paste the notice you received</h2>
    <p class="muted">
      Docket reads the document, finds the deadlines and demands in it, and explains your options in
      plain language. {#if demo}This demo runs entirely in your browser; nothing you paste is sent
        anywhere.{/if}
    </p>
  </div>

  <SampleChips onpick={pickSample} disabled={busy} />

  <div class="field">
    <label for="notice-text">Document text</label>
    <p class="hint" id="notice-text-hint">
      Paste the full text, including dates and amounts. At least {MIN_INPUT_WORDS} words.
    </p>
    <textarea
      id="notice-text"
      bind:this={textarea}
      bind:value={text}
      aria-describedby="notice-text-hint notice-text-count"
      disabled={busy}
      spellcheck="false"></textarea>
    <p class="hint" id="notice-text-count">{text.length} characters, {wordCount} words</p>
  </div>

  <FileDrop onfile={handleFile} disabled={busy} />
  {#if pendingFile !== null}
    <p class="hint">Selected file: {pendingFile.name}. The server will read it for you.</p>
  {/if}

  <div class="field">
    <label for="reference-date">Reference date</label>
    <p class="hint" id="reference-date-hint">
      We count deadlines from this date. Usually the day you received the notice.
    </p>
    <input
      id="reference-date"
      type="date"
      bind:value={referenceDate}
      aria-describedby="reference-date-hint"
      required
      disabled={busy}
    />
  </div>

  <div class="button-row">
    <button type="submit" class="button" disabled={!canAnalyze}>
      {busy ? 'Analysing…' : 'Analyse document'}
    </button>
    {#if !busy && wordCount < MIN_INPUT_WORDS && pendingFile === null}
      <span class="hint">Add {MIN_INPUT_WORDS - wordCount} more words to analyse.</span>
    {/if}
  </div>

  <p class="status" aria-live="polite">{status}</p>
  <div role="alert" class="alert">{error}</div>
</form>
