<!-- Three fictional sample notices so anyone can try Docket without pasting a real document. -->
<script lang="ts">
  import { SAMPLE_NOTICES } from '@docket/core';

  interface Props {
    onpick: (sample: (typeof SAMPLE_NOTICES)[number]) => void;
    disabled?: boolean;
  }

  let { onpick, disabled = false }: Props = $props();
</script>

<p class="label" id="samples-label">Try a sample notice</p>
<ul class="chips" aria-labelledby="samples-label">
  {#each SAMPLE_NOTICES as sample (sample.id)}
    <li>
      <button
        type="button"
        class="button button-secondary"
        {disabled}
        onclick={() => {
          onpick(sample);
        }}
      >
        {sample.title}
      </button>
    </li>
  {/each}
</ul>
