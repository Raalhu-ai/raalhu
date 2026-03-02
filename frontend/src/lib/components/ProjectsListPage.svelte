<script lang="ts">
	import { Search, Plus, ChevronDown } from 'lucide-svelte';
	import type { Project } from '$lib/db';
	import { formatRelativeTime } from '$lib/chat-history';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	let {
		projects = [],
		onSelectProject,
		onCreateProject
	}: {
		projects?: Project[];
		onSelectProject: (id: string) => void;
		onCreateProject: () => void;
	} = $props();

	let searchQuery = $state('');
	let sortBy = $state<'activity' | 'name'>('activity');

	const filtered = $derived(() => {
		let list = projects;
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			list = list.filter((p) => p.name.toLowerCase().includes(q));
		}
		if (sortBy === 'name') {
			list = [...list].sort((a, b) => a.name.localeCompare(b.name));
		}
		return list;
	});

	const sortLabel = $derived(sortBy === 'activity' ? 'ހަރަކާތް' : 'ނަން');
</script>

<div class="flex flex-col h-full" dir="rtl">
	<div class="flex-1 overflow-y-auto">
		<div class="max-w-3xl mx-auto px-6 py-10">

			<!-- Header row -->
			<div class="flex items-center gap-4 mb-6">
				<h1 class="thaana text-xl text-foreground flex-1">ޕްރޮޖެކްޓް</h1>
				<button
					onclick={onCreateProject}
					class="thaana inline-flex items-center justify-center gap-2 px-4 py-2 text-sm
						rounded-lg bg-white text-black
						hover:bg-white/90
						transition-colors duration-150"
				>
					<Plus class="w-4 h-4" />
					އައު ޕްރޮޖެކްޓް
				</button>
			</div>

			<!-- Search bar -->
			<div class="relative mb-4">
				<Search class="absolute start-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground/50 pointer-events-none" />
				<input
					bind:value={searchQuery}
					type="text"
					dir="rtl"
					placeholder="ޕްރޮޖެކްޓް ހޯދާ..."
					class="thaana w-full ps-11 pe-4 py-3 bg-muted/50 border border-border rounded-xl
						text-foreground text-sm placeholder:text-muted-foreground/40
						focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30
						transition-all duration-150"
				/>
			</div>

			<!-- Sort row -->
			<div class="flex items-center justify-end gap-2 mb-6">
				<span class="thaana text-xs text-muted-foreground">ތަރުތީބު</span>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="thaana inline-flex items-center gap-1 px-2.5 py-1 text-xs
							border border-border rounded-lg text-muted-foreground
							hover:text-foreground hover:bg-accent transition-colors duration-150"
					>
						{sortLabel}
						<ChevronDown class="w-3 h-3" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-32" align="end">
						<DropdownMenu.Item class="thaana text-xs" onclick={() => { sortBy = 'activity'; }}>
							ހަރަކާތް
						</DropdownMenu.Item>
						<DropdownMenu.Item class="thaana text-xs" onclick={() => { sortBy = 'name'; }}>
							ނަން
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>

			<!-- Projects grid or empty state -->
			{#if filtered().length > 0}
				<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
					{#each filtered() as project (project.id)}
						<button
							onclick={() => onSelectProject(project.id)}
							class="flex flex-col items-start p-5 bg-transparent border border-border rounded-xl
								hover:bg-accent/50 hover:border-border/80
								transition-all duration-150 text-right w-full min-h-[120px]"
						>
							<span class="thaana text-sm font-semibold text-foreground truncate w-full">{project.name}</span>
							{#if project.instructions}
								<span class="thaana text-sm text-muted-foreground/70 line-clamp-2 w-full mt-1.5">{project.instructions}</span>
							{/if}
							<span class="text-[11px] text-muted-foreground/50 mt-auto pt-3">
								{formatRelativeTime(project.updatedAt)}
							</span>
						</button>
					{/each}
				</div>
			{:else if searchQuery.trim()}
				<!-- No search results -->
				<div class="flex flex-col items-center justify-center py-20 gap-3">
					<Search class="w-10 h-10 text-muted-foreground/15" />
					<span class="thaana text-sm text-muted-foreground/50">ނަތީޖާ ނެތް</span>
				</div>
			{:else}
				<!-- Empty state -->
				<div class="flex flex-col items-center justify-center py-20 gap-4">
					<!-- Stacked folders icon -->
					<div class="relative w-20 h-20 mb-2">
						<div class="absolute inset-0 flex items-center justify-center">
							<svg viewBox="0 0 80 80" width="80" height="80" class="text-muted-foreground/25">
								<!-- Back folder -->
								<rect x="10" y="16" width="36" height="28" rx="3" fill="none" stroke="currentColor" stroke-width="2" />
								<path d="M10 22 h12 l3 -6 h21" fill="none" stroke="currentColor" stroke-width="2" />
								<!-- Front folder -->
								<rect x="30" y="30" width="40" height="32" rx="3" fill="none" stroke="currentColor" stroke-width="2.5" />
								<path d="M30 38 h14 l3 -6 h23" fill="none" stroke="currentColor" stroke-width="2.5" />
								<!-- Hand pointer hint -->
								<circle cx="58" cy="62" r="4" fill="none" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
							</svg>
						</div>
					</div>

					<h2 class="thaana text-base text-foreground">ޕްރޮޖެކްޓެއް ފައްޓަވަންވީތޯ؟</h2>
					<p class="thaana text-sm text-muted-foreground/60 text-center max-w-sm leading-relaxed">
						ފައިލް އަޕްލޯޑް ކުރައްވާ، ކަސްޓަމް އިރުޝާދު ސެޓް ކުރައްވާ، އަދި ޗެޓް ތައް އެއް ތަނެއްގައި ތަރުތީބު ކުރައްވާ.
					</p>
					<button
						onclick={onCreateProject}
						class="thaana inline-flex items-center gap-2 px-5 py-2.5 mt-2 text-sm
							border border-border rounded-full
							text-foreground hover:bg-accent
							transition-colors duration-150"
					>
						<Plus class="w-4 h-4" />
						އައު ޕްރޮޖެކްޓް
					</button>
				</div>
			{/if}
		</div>
	</div>
</div>
