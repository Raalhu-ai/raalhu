<script lang="ts">
	import { AppWindow, FileText, Gamepad2, Zap, MessageCircle, ClipboardList, PlusCircle } from 'lucide-svelte';

	let {
		onSelect
	}: {
		onSelect: (category: string) => void;
	} = $props();

	const categories = [
		{ id: 'apps', label: 'އެޕް އަދި ވެބްސައިޓް', icon: AppWindow },
		{ id: 'documents', label: 'ޑޮކިއުމެންޓް އަދި ޓެމްޕްލޭޓް', icon: FileText },
		{ id: 'games', label: 'ގޭމް', icon: Gamepad2 },
		{ id: 'productivity', label: 'ޕްރޮޑަކްޓިވިޓީ ޓޫލް', icon: Zap },
		{ id: 'creative', label: 'ކްރިއޭޓިވް ޕްރޮޖެކްޓް', icon: MessageCircle },
		{ id: 'quiz', label: 'ކުއިޒް ނުވަތަ ސާވޭ', icon: ClipboardList },
		{ id: 'scratch', label: 'ސުމަކުން ފަށާ', icon: PlusCircle }
	];
</script>

<div class="flex-1 flex items-center justify-center px-6" dir="rtl">
	<div class="max-w-3xl w-full">
		<!-- Heading -->
		<p class="thaana text-base text-foreground mb-6 leading-relaxed">
			ހިނގާ ފަށަމާ! އާޓިފެކްޓް ކެޓެގަރީއެއް ނަގާ ނުވަތަ ސުމަކުން ފަށާ.
		</p>

		<!-- Category grid -->
		<div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
			{#each categories as cat}
				<button
					onclick={() => onSelect(cat.id)}
					class="group flex flex-col justify-between rounded-xl border border-border/60 p-4
						h-[120px] text-right
						hover:border-border hover:bg-accent/30
						transition-all duration-150"
				>
					<span class="thaana text-sm text-foreground/90 leading-snug">{cat.label}</span>
					<div class="flex justify-start mt-auto">
						<cat.icon class="w-5 h-5 text-muted-foreground/40 group-hover:text-muted-foreground/60 transition-colors" />
					</div>
				</button>
			{/each}
		</div>
	</div>
</div>
