<script lang="ts">
	import { onMount } from 'svelte';
	import { Plus, Sparkles } from 'lucide-svelte';
	import { db } from '$lib/db';
	import { formatRelativeTime } from '$lib/chat-history';
	import { inspirationCards, type InspirationCard } from '$lib/inspiration-cards';

	let {
		onNewArtifact = () => {},
		onSelectCard = (_id: string) => {}
	}: {
		onNewArtifact?: () => void;
		onSelectCard?: (id: string) => void;
	} = $props();

	let activeTab = $state<'inspiration' | 'yours'>('inspiration');
	let activeCategory = $state('all');

	// --- User artifacts ---
	interface UserArtifact {
		id: string;
		label: string;
		filename: string;
		mimeType: string;
		sessionId: string;
		updatedAt: number;
		/** Text preview (first ~30 lines) — empty for binary files */
		preview: string;
	}

	let userArtifacts = $state<UserArtifact[]>([]);
	let loadingArtifacts = $state(true);

	/** Returns true if the mime type is likely to contain readable text */
	function isTextMime(mime: string): boolean {
		if (mime.startsWith('text/')) return true;
		if (mime.includes('json') || mime.includes('xml') || mime.includes('javascript') || mime.includes('python')) return true;
		return false;
	}

	/** Decode base64 to utf-8 string */
	function b64decode(b64: string): string {
		try {
			const bin = atob(b64);
			const bytes = new Uint8Array(bin.length);
			for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
			return new TextDecoder('utf-8').decode(bytes);
		} catch {
			return '';
		}
	}

	async function loadUserArtifacts() {
		loadingArtifacts = true;
		try {
			const sessions = await db.sessions
				.where('[archived+updatedAt]')
				.between([0, Dexie.minKey], [0, Dexie.maxKey])
				.reverse()
				.toArray();

			const arts: UserArtifact[] = [];

			for (const session of sessions) {
				if (!session.agentMessages) continue;

				let messages: any[];
				try {
					messages = JSON.parse(session.agentMessages);
				} catch {
					continue;
				}

				// Parse FS snapshot for content previews
				let fs: Record<string, string> = {};
				if (session.fsSnapshot) {
					try {
						fs = JSON.parse(session.fsSnapshot);
					} catch { /* ignore */ }
				}

				for (const msg of messages) {
					if (!msg.steps) continue;
					for (const step of msg.steps) {
						if (step.kind !== 'artifact') continue;

						// Find matching file in FS snapshot
						let preview = '';
						const fname = step.filename as string;
						if (isTextMime(step.mimeType || '')) {
							// Try exact path match first, then search by filename
							const matchingPath = Object.keys(fs).find(
								(p) => p.endsWith('/' + fname) || p === fname
							);
							if (matchingPath && fs[matchingPath]) {
								const full = b64decode(fs[matchingPath]);
								// Take first ~30 lines for preview
								preview = full.split('\n').slice(0, 30).join('\n');
							}
						}

						arts.push({
							id: `${session.id}-${fname}-${arts.length}`,
							label: step.label || fname,
							filename: fname,
							mimeType: step.mimeType || 'application/octet-stream',
							sessionId: session.id,
							updatedAt: session.updatedAt,
							preview
						});
					}
				}
			}

			userArtifacts = arts;
		} catch (e) {
			console.error('[ArtifactsPage] Failed to load artifacts:', e);
		}
		loadingArtifacts = false;
	}

	// Need Dexie for min/max key
	import Dexie from 'dexie';

	onMount(() => {
		loadUserArtifacts();
	});

	// --- Detect if preview is code ---
	const CODE_EXTENSIONS = new Set([
		'py', 'js', 'ts', 'jsx', 'tsx', 'html', 'css', 'json', 'xml', 'yaml', 'yml',
		'sh', 'bash', 'php', 'rb', 'java', 'c', 'cpp', 'h', 'rs', 'go', 'sql', 'csv'
	]);

	function isCodeFile(filename: string): boolean {
		const ext = filename.split('.').pop()?.toLowerCase() || '';
		return CODE_EXTENSIONS.has(ext);
	}

	const categories = [
		{ id: 'all', label: 'ހުރިހާ' },
		{ id: 'learn', label: 'އެއްޗެއް ދަސްކުރޭ' },
		{ id: 'tips', label: 'ލައިފް ހެކްސް' },
		{ id: 'game', label: 'ގޭމެއް ކުޅޭ' },
		{ id: 'creative', label: 'ކްރިއޭޓިވް ވޭ' },
		{ id: 'relax', label: 'ބޭރަށް ނުކުމޭ' }
	];

	const filteredCards = $derived(
		activeCategory === 'all'
			? inspirationCards
			: inspirationCards.filter((c) => c.category === activeCategory)
	);
</script>

<div class="flex-1 overflow-y-auto">
	<div class="max-w-5xl mx-auto px-6 py-8 lg:py-12" dir="rtl">
		<!-- Header -->
		<div class="flex items-center justify-between mb-10">
			<h1 class="thaana text-4xl text-primary" style="line-height: 1.4;">އާޓިފެކްޓް</h1>
			<button
				onclick={onNewArtifact}
				class="thaana flex items-center gap-2 px-4 py-2 text-sm rounded-lg
					bg-foreground text-background hover:bg-foreground/90 transition-colors duration-150"
			>
				<Plus class="w-4 h-4" />
				އައު އާޓިފެކްޓް
			</button>
		</div>

		<!-- Tabs -->
		<div class="flex gap-8 mb-0">
			<button
				class="thaana pb-3 text-sm font-medium transition-colors relative
					{activeTab === 'inspiration' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeTab = 'inspiration')}
			>
				އިންސްޕިރޭޝަން
				{#if activeTab === 'inspiration'}
					<div class="absolute bottom-0 inset-x-0 h-[2px] bg-foreground rounded-full"></div>
				{/if}
			</button>
			<button
				class="thaana pb-3 text-sm font-medium transition-colors relative
					{activeTab === 'yours' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'}"
				onclick={() => (activeTab = 'yours')}
			>
				ތިބާގެ އާޓިފެކްޓް
				{#if activeTab === 'yours'}
					<div class="absolute bottom-0 inset-x-0 h-[2px] bg-foreground rounded-full"></div>
				{/if}
			</button>
		</div>
		<div class="h-px bg-border mb-8"></div>

		{#if activeTab === 'inspiration'}
			<!-- Category pills -->
			<div class="flex gap-2 mb-8 flex-wrap">
				{#each categories as cat}
					<button
						class="thaana px-4 py-1.5 text-xs rounded-full transition-colors duration-150
							{activeCategory === cat.id
							? 'bg-foreground text-background font-medium'
							: 'text-muted-foreground hover:text-foreground'}"
						onclick={() => (activeCategory = cat.id)}
					>
						{cat.label}
					</button>
				{/each}
			</div>

			<!-- Inspiration cards grid -->
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
				{#each filteredCards as card (card.id)}
					<button class="group text-right" onclick={() => onSelectCard(card.id)}>
						<div
							class="aspect-[4/3] rounded-2xl bg-gradient-to-br {card.bg} border border-white/[0.06]
								overflow-hidden mb-3 transition-all duration-200
								group-hover:border-white/[0.12] group-hover:scale-[1.02]
								flex items-center justify-center relative"
						>
							{#if card.id === 'writing-editor'}
								<div class="bg-white rounded-xl shadow-lg p-4 w-[65%] space-y-2 -rotate-1">
									<div class="flex items-center gap-1">
										<span class="text-[9px] text-red-400 font-medium line-through decoration-red-500">me and my collegue</span>
									</div>
									<div class="inline-block">
										<span class="text-[9px] bg-emerald-400/90 text-white px-2 py-0.5 rounded font-medium">my colleague and I</span>
									</div>
									<p class="text-[7px] text-gray-400 leading-relaxed">Use 'I' instead of 'me' as the subject</p>
									<div class="space-y-1.5 pt-1">
										<div class="h-[3px] w-full bg-gray-200 rounded-full"></div>
										<div class="h-[3px] w-4/5 bg-gray-200 rounded-full"></div>
										<div class="h-[3px] w-3/5 bg-gray-200 rounded-full"></div>
										<div class="h-[3px] w-full bg-gray-200 rounded-full"></div>
									</div>
								</div>
							{:else if card.id === 'document-gen'}
								<div class="bg-white rounded-xl shadow-lg w-[72%] overflow-hidden rotate-1">
									<div class="flex items-center gap-1.5 px-3 py-2 bg-gray-50 border-b border-gray-200">
										<div class="w-2 h-2 rounded-full bg-red-400"></div>
										<div class="w-2 h-2 rounded-full bg-yellow-400"></div>
										<div class="w-2 h-2 rounded-full bg-green-400"></div>
									</div>
									<div class="p-3 space-y-2.5">
										<div class="flex items-center gap-2">
											<div class="w-9 h-9 rounded-lg bg-sky-400/25 flex items-center justify-center shrink-0">
												<span class="text-[8px] font-bold text-sky-600">PRD</span>
											</div>
											<div class="flex-1 space-y-1.5">
												<div class="h-[3px] w-full bg-gray-200 rounded-full"></div>
												<div class="h-[3px] w-3/4 bg-sky-200 rounded-full"></div>
											</div>
										</div>
										<div class="space-y-1.5">
											<div class="h-[3px] w-full bg-gray-100 rounded-full"></div>
											<div class="h-[3px] w-5/6 bg-gray-100 rounded-full"></div>
											<div class="h-[3px] w-2/3 bg-gray-100 rounded-full"></div>
										</div>
									</div>
								</div>
							{:else if card.id === 'project-insights'}
								<div class="w-[72%] space-y-2 -rotate-1">
									<div class="bg-white rounded-lg shadow-md px-3 py-2 flex items-center gap-2">
										<div class="w-5 h-5 rounded bg-violet-100 flex items-center justify-center shrink-0">
											<span class="text-[10px]">🔍</span>
										</div>
										<span class="text-[8px] text-gray-500">onboarding</span>
									</div>
									<div class="bg-white rounded-lg shadow-md p-2.5 space-y-2">
										<span class="text-[8px] text-gray-500 font-medium"># ux-feedback</span>
										<div class="space-y-1 ps-2">
											<div class="h-[2px] w-full bg-gray-100 rounded-full"></div>
											<div class="h-[2px] w-4/5 bg-gray-100 rounded-full"></div>
										</div>
									</div>
									<div class="bg-white rounded-lg shadow-md p-2.5">
										<span class="text-[8px] text-gray-500 font-medium"># proj-onboarding</span>
										<div class="space-y-1 ps-2 mt-1.5">
											<div class="h-[2px] w-full bg-gray-100 rounded-full"></div>
										</div>
									</div>
								</div>
							{:else if card.id === 'note-transform'}
								<div class="flex items-center gap-3 w-[85%]">
									<div class="bg-white rounded-lg shadow-md p-3 flex-1 space-y-2">
										<div class="h-[3px] w-full bg-gray-300 rounded-full" style="transform: rotate(-2deg)"></div>
										<div class="h-[3px] w-3/4 bg-gray-300 rounded-full" style="transform: rotate(1.5deg)"></div>
										<div class="h-[3px] w-5/6 bg-gray-300 rounded-full" style="transform: rotate(-1deg)"></div>
										<div class="h-[3px] w-2/3 bg-gray-300 rounded-full" style="transform: rotate(2deg)"></div>
									</div>
									<span class="text-white/50 text-sm shrink-0">→</span>
									<div class="bg-white rounded-lg shadow-md p-3 flex-1 space-y-2 border-s-2 border-teal-400">
										<div class="h-[3px] w-full bg-gray-200 rounded-full"></div>
										<div class="h-[3px] w-3/4 bg-gray-200 rounded-full"></div>
										<div class="h-[3px] w-5/6 bg-gray-200 rounded-full"></div>
										<div class="h-[3px] w-2/3 bg-gray-200 rounded-full"></div>
									</div>
								</div>
							{:else if card.id === 'brainstorm'}
								<div class="relative">
									<div class="w-28 h-[72px] bg-white rounded-[40px] shadow-lg flex items-center justify-center relative z-10">
										<span class="text-3xl text-cyan-500/80 font-bold select-none">?</span>
									</div>
									<div class="absolute -top-3 left-4 w-10 h-10 bg-white rounded-full shadow-sm z-0"></div>
									<div class="absolute -top-2 right-3 w-7 h-7 bg-white rounded-full shadow-sm z-0"></div>
									<div class="absolute top-1 -left-2 w-6 h-6 bg-white rounded-full shadow-sm z-0"></div>
								</div>
							{:else if card.id === 'flashcards'}
								<div class="relative w-[55%]">
									<div class="absolute top-3 -left-3 w-full aspect-[3/2] bg-white rounded-xl shadow-md rotate-6 flex items-center justify-center">
										<span class="text-base font-medium text-gray-500">hola</span>
									</div>
									<div class="relative w-full aspect-[3/2] bg-white rounded-xl shadow-lg -rotate-3 flex items-center justify-center z-10">
										<span class="thaana text-base font-medium text-gray-700">ސަލާމް</span>
									</div>
								</div>

							{:else if card.id === 'quiz-maker'}
								<!-- Quiz: numbered questions with radio buttons -->
								<div class="bg-white rounded-xl shadow-lg p-4 w-[70%] space-y-2.5 rotate-1">
									<div class="text-[9px] font-bold text-gray-700">Q1</div>
									<div class="space-y-1.5">
										{#each [true, false, false] as checked}
											<div class="flex items-center gap-1.5">
												<div class="w-2.5 h-2.5 rounded-full border {checked ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}"></div>
												<div class="h-[3px] rounded-full {checked ? 'w-16 bg-amber-200' : 'w-12 bg-gray-200'}"></div>
											</div>
										{/each}
									</div>
									<div class="text-[9px] font-bold text-gray-700 pt-1">Q2</div>
									<div class="space-y-1.5">
										{#each [false, true, false] as checked}
											<div class="flex items-center gap-1.5">
												<div class="w-2.5 h-2.5 rounded-full border {checked ? 'border-amber-500 bg-amber-500' : 'border-gray-300'}"></div>
												<div class="h-[3px] rounded-full {checked ? 'w-14 bg-amber-200' : 'w-10 bg-gray-200'}"></div>
											</div>
										{/each}
									</div>
								</div>

							{:else if card.id === 'unit-converter'}
								<!-- Unit converter: two boxes with arrow -->
								<div class="w-[75%] space-y-2">
									<div class="bg-white rounded-lg shadow-md p-3 flex items-center justify-between">
										<span class="text-[11px] font-mono font-bold text-gray-700">42</span>
										<span class="text-[8px] text-rose-500 font-medium bg-rose-50 px-1.5 py-0.5 rounded">°C</span>
									</div>
									<div class="flex justify-center text-white/50 text-xs">↕</div>
									<div class="bg-white rounded-lg shadow-md p-3 flex items-center justify-between">
										<span class="text-[11px] font-mono font-bold text-gray-700">107.6</span>
										<span class="text-[8px] text-rose-500 font-medium bg-rose-50 px-1.5 py-0.5 rounded">°F</span>
									</div>
								</div>

							{:else if card.id === 'budget-tracker'}
								<!-- Budget: bar chart mockup -->
								<div class="bg-white rounded-xl shadow-lg p-3 w-[70%] -rotate-1">
									<div class="flex items-end gap-2 h-16 justify-center">
										<div class="w-5 bg-lime-400/80 rounded-t" style="height: 60%"></div>
										<div class="w-5 bg-lime-500/80 rounded-t" style="height: 85%"></div>
										<div class="w-5 bg-lime-400/80 rounded-t" style="height: 45%"></div>
										<div class="w-5 bg-red-400/80 rounded-t" style="height: 100%"></div>
										<div class="w-5 bg-lime-500/80 rounded-t" style="height: 55%"></div>
										<div class="w-5 bg-lime-400/80 rounded-t" style="height: 30%"></div>
									</div>
									<div class="h-px bg-gray-200 mt-1"></div>
									<div class="flex justify-between mt-1.5">
										<span class="text-[7px] text-gray-400">ޖެނު</span>
										<span class="text-[7px] text-gray-400">ޖޫން</span>
									</div>
								</div>

							{:else if card.id === 'meal-planner'}
								<!-- Meal planner: weekly grid -->
								<div class="bg-white rounded-xl shadow-lg p-3 w-[72%] rotate-1">
									<div class="grid grid-cols-7 gap-1">
										{#each ['ހޯ', 'އަ', 'ބު', 'ބު', 'ބު', 'ހޮ', 'އާ'] as day}
											<div class="text-center">
												<span class="text-[6px] text-gray-400 block">{day}</span>
												<div class="w-full aspect-square rounded bg-orange-100/80 mt-0.5 flex items-center justify-center">
													<span class="text-[8px]">{['🍳', '🥗', '🍲', '🐟', '🍛', '🥘', '🍜'][['ހޯ', 'އަ', 'ބު', 'ބު', 'ބު', 'ހޮ', 'އާ'].indexOf(day)]}</span>
												</div>
											</div>
										{/each}
									</div>
								</div>

							{:else if card.id === 'tic-tac-toe'}
								<!-- Tic tac toe: 3x3 grid -->
								<div class="bg-white rounded-xl shadow-lg p-3 w-[55%]">
									<div class="grid grid-cols-3 gap-0">
										{#each ['X', 'O', '', '', 'X', '', 'O', '', 'X'] as cell, i}
											<div class="aspect-square flex items-center justify-center text-sm font-bold
												{i % 3 !== 2 ? 'border-r border-gray-200' : ''}
												{i < 6 ? 'border-b border-gray-200' : ''}
												{cell === 'X' ? 'text-fuchsia-500' : 'text-gray-400'}">
												{cell}
											</div>
										{/each}
									</div>
								</div>

							{:else if card.id === 'memory-game'}
								<!-- Memory game: grid of face-down cards with one flipped -->
								<div class="grid grid-cols-4 gap-1.5 w-[65%]">
									{#each Array(8) as _, i}
										<div class="aspect-square rounded-lg flex items-center justify-center text-[10px]
											{i === 2 ? 'bg-white shadow-md' : i === 5 ? 'bg-white shadow-md' : 'bg-pink-200/80'}">
											{i === 2 ? '🌟' : i === 5 ? '🌟' : '?'}
										</div>
									{/each}
								</div>

							{:else if card.id === 'snake-game'}
								<!-- Snake game: pixel grid with snake -->
								<div class="bg-gray-900 rounded-xl p-3 w-[60%] aspect-square relative">
									<!-- Snake body -->
									<div class="absolute top-[30%] left-[20%] w-3 h-3 rounded-sm bg-green-400"></div>
									<div class="absolute top-[30%] left-[calc(20%+14px)] w-3 h-3 rounded-sm bg-green-500"></div>
									<div class="absolute top-[30%] left-[calc(20%+28px)] w-3 h-3 rounded-sm bg-green-500"></div>
									<div class="absolute top-[calc(30%+14px)] left-[calc(20%+28px)] w-3 h-3 rounded-sm bg-green-500"></div>
									<!-- Apple -->
									<div class="absolute top-[60%] left-[55%] w-3 h-3 rounded-sm bg-red-500"></div>
									<!-- Score -->
									<span class="absolute top-1.5 right-2 text-[8px] font-mono text-green-400/70">Score: 3</span>
								</div>

							{:else if card.id === 'breathing'}
								<!-- Breathing exercise: pulsing circle -->
								<div class="flex flex-col items-center gap-3">
									<div class="w-20 h-20 rounded-full border-2 border-sky-300/60 flex items-center justify-center">
										<div class="w-12 h-12 rounded-full bg-sky-300/30 flex items-center justify-center">
											<div class="w-5 h-5 rounded-full bg-sky-400/60"></div>
										</div>
									</div>
									<span class="text-[9px] text-white/50 font-medium tracking-wider">BREATHE</span>
								</div>

							{:else if card.id === 'color-palette'}
								<!-- Color palette: swatch strips -->
								<div class="w-[70%] space-y-1.5">
									{#each [
										['bg-indigo-300', 'bg-indigo-400', 'bg-indigo-500', 'bg-indigo-600', 'bg-indigo-800'],
										['bg-amber-200', 'bg-amber-300', 'bg-amber-400', 'bg-amber-500', 'bg-amber-700'],
										['bg-rose-200', 'bg-rose-300', 'bg-rose-400', 'bg-rose-500', 'bg-rose-700']
									] as row}
										<div class="flex gap-1">
											{#each row as swatch}
												<div class="flex-1 h-6 rounded-md {swatch} first:rounded-s-lg last:rounded-e-lg"></div>
											{/each}
										</div>
									{/each}
								</div>

							{:else if card.id === 'nature-sounds'}
								<!-- Nature sounds: waveform bars -->
								<div class="flex items-end gap-[3px] h-16">
									{#each [30, 60, 40, 80, 55, 35, 70, 45, 65, 50, 30, 75, 40, 55, 35, 60, 45, 70, 50, 35] as h}
										<div class="w-1.5 rounded-full bg-teal-400/60" style="height: {h}%"></div>
									{/each}
								</div>
							{/if}
						</div>
						<span class="thaana text-sm text-primary">{card.title}</span>
					</button>
				{/each}
			</div>
		{:else}
			<!-- Your artifacts -->
			{#if loadingArtifacts}
				<!-- Loading skeleton matching card layout -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
					{#each Array(6) as _}
						<div class="animate-pulse">
							<div class="aspect-[4/3] rounded-2xl bg-accent/40 mb-3"></div>
							<div class="h-4 w-3/4 bg-accent/40 rounded mb-1.5"></div>
							<div class="h-3 w-1/2 bg-accent/30 rounded"></div>
						</div>
					{/each}
				</div>
			{:else if userArtifacts.length === 0}
				<!-- Empty state -->
				<div class="flex flex-col items-center justify-center py-24 gap-4">
					<div class="w-16 h-16 rounded-2xl bg-accent/50 flex items-center justify-center">
						<Sparkles class="w-7 h-7 text-muted-foreground/30" />
					</div>
					<p class="thaana text-muted-foreground/50 text-sm">އާޓިފެކްޓް ނެތް</p>
					<p class="thaana text-muted-foreground/30 text-xs">ޗެޓް ތެރެއިން އުފެދޭ ފައިލްތައް މިތާ ފެންނާނެ</p>
				</div>
			{:else}
				<!-- Artifact cards grid -->
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mt-4">
					{#each userArtifacts as artifact (artifact.id)}
						<button class="group text-left">
							<!-- Preview card -->
							<div
								class="aspect-[4/3] rounded-2xl border border-border/60 overflow-hidden mb-3
									transition-all duration-200 group-hover:border-border group-hover:scale-[1.01]
									bg-card relative"
							>
								<!-- Inner preview window -->
								<div class="absolute inset-3 rounded-xl border border-border/40 overflow-hidden flex flex-col bg-background">
									<!-- Window top bar -->
									<div class="h-6 bg-accent/30 border-b border-border/30 shrink-0"></div>

									<!-- Content preview -->
									<div class="flex-1 overflow-hidden p-3">
										{#if artifact.preview}
											{#if isCodeFile(artifact.filename)}
												<!-- Code preview with left accent -->
												<div class="border-s-2 border-primary/40 ps-3">
													<pre class="text-[10px] leading-[1.6] text-foreground/80 font-mono whitespace-pre overflow-hidden">{artifact.preview}</pre>
												</div>
											{:else}
												<!-- Document preview -->
												<div class="space-y-1">
													{#each artifact.preview.split('\n').slice(0, 20) as line}
														{#if line.startsWith('#') || (line.length > 0 && line.length < 60 && line === line.replace(/[^A-Za-z\u0780-\u07BF\s]/g, ''))}
															<p class="text-[11px] font-semibold text-foreground/90 leading-snug">{line.replace(/^#+\s*/, '')}</p>
														{:else if line.trim()}
															<p class="text-[10px] text-muted-foreground/70 leading-relaxed">{line}</p>
														{:else}
															<div class="h-1.5"></div>
														{/if}
													{/each}
												</div>
											{/if}
										{:else}
											<!-- Binary file placeholder -->
											<div class="flex items-center justify-center h-full">
												<div class="text-center space-y-2">
													<div class="text-2xl text-muted-foreground/20">
														{#if artifact.mimeType.includes('pdf')}📄
														{:else if artifact.mimeType.includes('image')}🖼️
														{:else if artifact.mimeType.includes('spreadsheet') || artifact.filename.endsWith('.xlsx')}📊
														{:else if artifact.mimeType.includes('word') || artifact.filename.endsWith('.docx')}📝
														{:else}📎
														{/if}
													</div>
													<p class="text-[10px] text-muted-foreground/30 font-mono">{artifact.filename}</p>
												</div>
											</div>
										{/if}
									</div>
								</div>
							</div>

							<!-- Title & timestamp -->
							<p class="thaana text-sm text-primary truncate">{artifact.label}</p>
							<p class="thaana text-xs text-muted-foreground/50 mt-0.5">
								{formatRelativeTime(artifact.updatedAt)}
							</p>
						</button>
					{/each}
				</div>
			{/if}
		{/if}
	</div>
</div>
