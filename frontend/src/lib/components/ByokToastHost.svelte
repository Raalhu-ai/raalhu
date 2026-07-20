<script lang="ts">
	import { onDestroy, onMount } from 'svelte';
	import { AlertTriangle, KeyRound, X } from 'lucide-svelte';
	import type { ByokRuntimeEvent } from '$lib/byok-runtime';

	type ToastItem = ByokRuntimeEvent & { id: string };

	let toasts = $state<ToastItem[]>([]);
	const timers = new Map<string, ReturnType<typeof setTimeout>>();

	const operationLabels: Record<ByokRuntimeEvent['operation'], string> = {
		chat: 'Chat',
		title: 'Title generation',
		'web-search': 'Web search',
		'web-fetch': 'Web fetch'
	};

	function dismiss(id: string) {
		const timer = timers.get(id);
		if (timer) clearTimeout(timer);
		timers.delete(id);
		toasts = toasts.filter((toast) => toast.id !== id);
	}

	function titleFor(toast: ToastItem): string {
		if (toast.kind === 'disabled') {
			return 'BYOK 3 ފަހަރު ދިގުދަށް ފޭލްވެއްޖެ';
		}
		if (toast.kind === 'stream-interrupted') {
			return `BYOK ސްޓްރީމް މަގުން ކެނޑިއްޖެ (${toast.failureCount}/3)`;
		}
		return `BYOK ފޭލްވެ، ޕްރޮކްސީ ފޯލްބެކް ޓްރިގަރ ވެއްޖެ (${toast.failureCount}/3)`;
	}

	function descriptionFor(toast: ToastItem): string {
		if (toast.kind === 'disabled') {
			return toast.fallbackUsed
				? 'މި ރިކުއެސްޓް ޕްރޮކްސީއިން ރީޓްރައިކޮށް، ކީ އިންވެލިޑްކޮށް ޕްރޮކްސީ މޯޑަށް ބަދަލުކުރެވިއްޖެ.'
				: 'ޑުޕްލިކޭޓް އައުޓްޕުޓް ނުހެދުމަށް ޕްރޮކްސީ ރީޕްލޭ ނުކުރެވޭ. ކީ އިންވެލިޑްކޮށް ޕްރޮކްސީ މޯޑަށް ބަދަލުކުރެވިއްޖެ.';
		}
		if (toast.kind === 'stream-interrupted') {
			return 'ޑުޕްލިކޭޓް އައުޓްޕުޓް ނުހެދުމަށް ޕްރޮކްސީ ރީޕްލޭ ނުކުރެވޭ.';
		}
		return 'ދެން ކުރާ ރިކުއެސްޓް އަލުން BYOK މަގުން ހިނގާނެ.';
	}

	onMount(() => {
		const onRuntimeEvent = (event: Event) => {
			const detail = (event as CustomEvent<ByokRuntimeEvent>).detail;
			const id = crypto.randomUUID();
			toasts = [...toasts, { ...detail, id }];
			if (detail.kind !== 'disabled') {
				timers.set(id, setTimeout(() => dismiss(id), 6000));
			}
		};

		window.addEventListener('mogger-byok-runtime', onRuntimeEvent);
		return () => window.removeEventListener('mogger-byok-runtime', onRuntimeEvent);
	});

	onDestroy(() => {
		for (const timer of timers.values()) clearTimeout(timer);
		timers.clear();
	});
</script>

<div
	class="pointer-events-none fixed inset-x-3 top-3 z-[100] flex flex-col items-end gap-2 sm:start-auto sm:end-4 sm:w-[390px]"
	aria-live="polite"
	aria-atomic="false"
>
	{#each toasts as toast (toast.id)}
		<div
			class="pointer-events-auto w-full rounded-2xl border px-4 py-3 shadow-xl backdrop-blur-md
				{toast.kind === 'disabled'
					? 'border-destructive/40 bg-card/95 text-destructive'
					: 'border-amber-500/35 bg-card/95 text-foreground'}"
			role={toast.kind === 'disabled' ? 'alert' : 'status'}
			dir="rtl"
		>
			<div class="flex items-start gap-3">
				{#if toast.kind === 'disabled'}
					<AlertTriangle class="mt-0.5 h-4 w-4 shrink-0" />
				{:else}
					<KeyRound class="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
				{/if}
				<div class="min-w-0 flex-1">
					<div class="thaana text-sm font-medium">{titleFor(toast)}</div>
					<div class="thaana mt-1 text-xs text-muted-foreground">{descriptionFor(toast)}</div>
					<div class="mt-2 text-[10px] text-muted-foreground" dir="ltr">
						{operationLabels[toast.operation]} · {toast.provider}
					</div>
					<div class="mt-1 max-h-20 overflow-auto break-words text-[10px] text-muted-foreground" dir="ltr">
						{toast.message}
					</div>
				</div>
				<button
					type="button"
					onclick={() => dismiss(toast.id)}
					class="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
					aria-label="Dismiss notification"
				>
					<X class="h-4 w-4" />
				</button>
			</div>
		</div>
	{/each}
</div>
