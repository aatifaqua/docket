<!--
  Dated timeline. Each entry shows the severity badge, the action, the long-form date with a
  relative hint, and the exact sentence it came from so the user can check our reading.
-->
<script lang="ts">
  import type { Deadline } from '@docket/core';
  import SeverityBadge from './SeverityBadge.svelte';
  import { describeRelativeDays, formatLongDate } from '../lib/format.ts';

  interface Props {
    deadlines: Deadline[];
    referenceDate: string;
  }

  let { deadlines, referenceDate }: Props = $props();
</script>

<section class="card" aria-labelledby="timeline-heading">
  <h3 id="timeline-heading">Timeline</h3>
  <p class="hint">
    Days are counted in calendar days from {formatLongDate(referenceDate)}. Confirm every date with
    the sender or the court.
  </p>
  {#if deadlines.length === 0}
    <p>We did not find a dated deadline. Read the document carefully for one.</p>
  {:else}
    <ol class="timeline">
      {#each deadlines as deadline (deadline.id)}
        <li>
          <SeverityBadge severity={deadline.severity} />
          <div>
            <strong>{deadline.label}</strong>
            <span class="timeline-date">
              {#if deadline.date === null}
                Date not stated
              {:else}
                {formatLongDate(deadline.date)} ({describeRelativeDays(deadline.daysFromReference)})
              {/if}
            </span>
          </div>
          <details>
            <summary>Where this comes from</summary>
            <blockquote>{deadline.sourceText}</blockquote>
          </details>
        </li>
      {/each}
    </ol>
  {/if}
</section>
