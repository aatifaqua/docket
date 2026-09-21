<!--
  Grounded follow-up questions. Answers quote the document; when nothing supports an answer
  the panel says so instead of guessing. In demo mode the answer comes from sentence matching
  in the browser instead of the model.
-->
<script lang="ts">
  import type { Analysis, Answer } from '@docket/core';
  import { ask, isDemoMode, messageOf } from '../lib/api.ts';

  interface Props {
    analysis: Analysis;
    sourceText: string;
  }

  let { analysis, sourceText }: Props = $props();
  const demo = isDemoMode();
  const MAX_QUESTION = 500;

  let question = $state('');
  let busy = $state(false);
  let answer = $state<Answer | null>(null);
  let error = $state('');

  async function submit(event: SubmitEvent): Promise<void> {
    event.preventDefault();
    const trimmed = question.trim();
    if (trimmed === '' || busy) return;
    busy = true;
    error = '';
    try {
      answer = await ask({
        analysisId: analysis.id,
        question: trimmed,
        core: analysis.core,
        text: sourceText,
      });
    } catch (failure) {
      answer = null;
      error = messageOf(failure);
    } finally {
      busy = false;
    }
  }
</script>

<section class="card ask-panel" aria-labelledby="ask-heading">
  <h3 id="ask-heading">Ask about this document</h3>
  {#if demo}
    <p id="ask-demo-note">
      In this demo, answers are found by matching sentences in your document, without the AI model.
      Run the Docket server with a Gemini key for fuller answers.
    </p>
  {/if}
  <form onsubmit={submit} aria-busy={busy}>
    <fieldset disabled={busy} aria-describedby={demo ? 'ask-demo-note' : undefined}>
      <div class="field">
        <label for="ask-question">Your question</label>
        <p class="hint">
          Example: "What happens if I miss the deadline?" Up to {MAX_QUESTION} characters.
        </p>
        <input id="ask-question" type="text" maxlength={MAX_QUESTION} bind:value={question} />
      </div>
      <button type="submit" class="button" disabled={question.trim() === ''}>Ask</button>
    </fieldset>
  </form>
  <div class="answer" aria-live="polite">
    {#if busy}
      <p>Looking through your document…</p>
    {:else if answer !== null}
      <p>{answer.answer}</p>
      {#if !answer.grounded}
        <p class="alert">
          Not found in your document. A legal professional can help with this question.
        </p>
      {/if}
      {#each answer.citations as citation (citation)}
        <blockquote>{citation}</blockquote>
      {/each}
      <p class="small muted">
        {answer.source === 'gemini' ? 'Answered with Gemini' : 'Answered offline'} from the text of your
        document. Not legal advice.
      </p>
    {/if}
  </div>
  <p class="alert" role="alert">{error}</p>
</section>
