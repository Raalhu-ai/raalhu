<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';

	let {
		open = $bindable(false),
		onCreate
	}: {
		open: boolean;
		onCreate: (name: string) => void;
	} = $props();

	let name = $state('');

	function handleCreate() {
		if (name.trim()) {
			onCreate(name.trim());
			name = '';
			open = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleCreate();
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-md">
		<Dialog.Header>
			<Dialog.Title class="thaana text-xl font-normal">އައު ޕްރޮޖެކްޓެއް ހެދުން</Dialog.Title>
			<Dialog.Description class="thaana text-muted-foreground text-sm">
				ޕްރޮޖެކްޓް ނަމެއް ޖައްސަވާ
			</Dialog.Description>
		</Dialog.Header>
		<div class="py-4">
			<input
				bind:value={name}
				placeholder="ޕްރޮޖެކްޓް ނަން..."
				dir="rtl"
				class="thaana w-full px-3 py-2 bg-background border border-border rounded-lg
					text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
				onkeydown={handleKeydown}
				autofocus
			/>
		</div>
		<Dialog.Footer>
			<button
				onclick={() => { open = false; }}
				class="thaana px-4 py-2 text-sm text-muted-foreground hover:text-foreground
					border border-border rounded-lg hover:bg-accent transition-colors"
			>
				ކެންސަލް
			</button>
			<button
				onclick={handleCreate}
				disabled={!name.trim()}
				class="thaana px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg
					hover:bg-primary/90 disabled:opacity-40 transition-colors"
			>
				ހެދުން
			</button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
