<!--
  File picker plus drop zone. The real <input type="file"> is visually hidden but stays in the
  tab order, so keyboard users are never forced to drag; drag-and-drop is a convenience only.
-->
<script lang="ts">
  interface Props {
    onfile: (file: File) => void;
    disabled?: boolean;
  }

  let { onfile, disabled = false }: Props = $props();
  let dragging = $state(false);

  function handleChange(event: Event): void {
    const input = event.currentTarget as HTMLInputElement;
    const file = input.files?.[0];
    if (file !== undefined) onfile(file);
    input.value = '';
  }

  function handleDragOver(event: DragEvent): void {
    event.preventDefault();
    dragging = true;
  }

  function handleDrop(event: DragEvent): void {
    event.preventDefault();
    dragging = false;
    const file = event.dataTransfer?.files[0];
    if (file !== undefined && !disabled) onfile(file);
  }
</script>

<div
  class="filedrop"
  class:dragging
  role="group"
  aria-label="Upload a file"
  ondragover={handleDragOver}
  ondragleave={() => {
    dragging = false;
  }}
  ondrop={handleDrop}
>
  <input
    id="notice-file"
    class="visually-hidden"
    type="file"
    accept=".txt,.pdf,text/plain,application/pdf"
    {disabled}
    onchange={handleChange}
  />
  <label for="notice-file" class="button button-secondary">Choose a .txt or .pdf file</label>
  <p class="hint">or drag a file into this box</p>
</div>
