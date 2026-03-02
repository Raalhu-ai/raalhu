<script lang="ts">
	import { Copy, Check, Mail, MessageSquare, RotateCcw, ChevronDown } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { MessageComposeData, MessageComposeVariant } from '$lib/agent/types';

	let { data }: { data: MessageComposeData } = $props();

	const LABELS = 'ABCDEFGHIJ';

	let selectedIdx = $state(0);
	let copied = $state(false);

	// Editable overrides per variant
	let bodyOverrides: Record<number, string> = $state({});
	let subjectOverrides: Record<number, string> = $state({});

	const currentVariant = $derived(data.variants[selectedIdx]);
	const currentBody = $derived(bodyOverrides[selectedIdx] ?? currentVariant?.body ?? '');
	const currentSubject = $derived(subjectOverrides[selectedIdx] ?? currentVariant?.subject ?? '');
	const isEdited = $derived(
		(bodyOverrides[selectedIdx] != null && bodyOverrides[selectedIdx] !== currentVariant?.body) ||
		(subjectOverrides[selectedIdx] != null && subjectOverrides[selectedIdx] !== currentVariant?.subject)
	);

	function selectVariant(idx: number) {
		selectedIdx = idx;
		copied = false;
	}

	function onBodyInput(e: Event) {
		const textarea = e.target as HTMLTextAreaElement;
		bodyOverrides[selectedIdx] = textarea.value;
	}

	function onSubjectInput(e: Event) {
		const input = e.target as HTMLInputElement;
		subjectOverrides[selectedIdx] = input.value;
	}

	function resetEdits() {
		delete bodyOverrides[selectedIdx];
		delete subjectOverrides[selectedIdx];
		// Trigger reactivity
		bodyOverrides = { ...bodyOverrides };
		subjectOverrides = { ...subjectOverrides };
	}

	function copyMessage() {
		const text = data.kind === 'email' && currentSubject
			? `Subject: ${currentSubject}\n\n${currentBody}`
			: currentBody;
		navigator.clipboard.writeText(text);
		copied = true;
		setTimeout(() => { copied = false; }, 2000);
	}

	function openInGmail() {
		const subject = encodeURIComponent(currentSubject);
		const body = encodeURIComponent(currentBody);
		window.open(`https://mail.google.com/mail/?view=cm&su=${subject}&body=${body}`, '_blank');
	}

	function openInMail() {
		const subject = encodeURIComponent(currentSubject);
		const body = encodeURIComponent(currentBody);
		window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
	}

	function openInMessages() {
		const body = encodeURIComponent(currentBody);
		window.open(`sms:?body=${body}`, '_blank');
	}
</script>

<div class="rounded-2xl overflow-hidden border border-muted-foreground/20 bg-muted/50 transition-colors focus-within:border-primary/30" style="font-family: var(--font-thaana);">
	<!-- Variant tabs -->
	{#if data.variants.length > 1}
		<div class="flex gap-1 p-1.5 border-b border-muted-foreground/15 overflow-x-auto">
			{#each data.variants as variant, idx}
				<button
					type="button"
					onclick={() => selectVariant(idx)}
					class="group/tab flex shrink-0 items-center gap-2 px-2.5 py-1.5 rounded-full transition-all
						{selectedIdx === idx
							? 'bg-primary/10 border border-primary/25'
							: 'border border-transparent hover:bg-accent/60'}"
				>
					<span
						class="flex size-5 font-semibold shrink-0 items-center justify-center rounded-full text-[10px] transition
							{selectedIdx === idx
								? 'bg-primary text-primary-foreground font-bold'
								: 'bg-accent text-muted-foreground group-hover/tab:bg-muted'}"
					>
						{LABELS[idx] || idx + 1}
					</span>
					<span
						class="text-xs whitespace-nowrap transition-colors
							{selectedIdx === idx
								? 'text-primary font-medium'
								: 'text-muted-foreground'}"
					>
						{variant.label}
					</span>
				</button>
			{/each}
		</div>
	{/if}

	<!-- Subject line (email only) -->
	{#if data.kind === 'email'}
		<div class="flex items-center border-b border-muted-foreground/15 px-5 py-3">
			<label class="shrink-0 pl-3 text-xs text-muted-foreground thaana">ސަބްޖެކްޓް:</label>
			<input
				type="text"
				placeholder="Email subject"
				class="thaana flex-1 w-full text-sm bg-transparent border-none text-foreground placeholder:text-muted-foreground/50 outline-none ring-0"
				value={currentSubject}
				oninput={onSubjectInput}
			/>
		</div>
	{/if}

	<!-- Message body -->
	<div class="overflow-y-auto max-h-[400px]">
		<textarea
			placeholder="Write your message..."
			class="thaana px-5 pt-4 pb-4 w-full resize-none bg-transparent border-none text-[18.5px] leading-[45px] text-foreground placeholder:text-muted-foreground/50 outline-none ring-0"
			style="field-sizing: content; min-height: 180px;"
			value={currentBody}
			oninput={onBodyInput}
		></textarea>
	</div>

	<!-- Actions bar -->
	<div class="flex items-center justify-end gap-1.5 px-4 py-3 border-t border-muted-foreground/15">
		<!-- Copy -->
		<div class="flex items-center h-8 rounded-lg border border-muted-foreground/20 overflow-hidden">
			<button
				type="button"
				onclick={copyMessage}
				class="h-8 w-8 flex items-center justify-center hover:bg-accent/60 transition-colors"
				aria-label="Copy message"
			>
				{#if copied}
					<Check class="w-4 h-4 text-green-400" />
				{:else}
					<Copy class="w-4 h-4 text-muted-foreground" />
				{/if}
			</button>

			{#if isEdited}
				<div class="w-px h-4 bg-border/50"></div>
				<button
					type="button"
					onclick={resetEdits}
					class="h-8 w-8 flex items-center justify-center hover:bg-accent/60 transition-colors"
					aria-label="Reset changes"
				>
					<RotateCcw class="w-3.5 h-3.5 text-muted-foreground" />
				</button>
			{/if}
		</div>

		<!-- Contextual action -->
		{#if data.kind === 'email'}
			<div class="flex h-8 rounded-lg border border-muted-foreground/20 overflow-hidden">
				<button
					type="button"
					onclick={openInGmail}
					class="h-full px-2.5 flex items-center gap-2 hover:bg-accent/60
						text-xs font-medium text-foreground transition-colors"
				>
					<svg width="16" height="16" viewBox="0 0 16 16" class="shrink-0">
						<path d="M1.95455 13.2527H4.18182V7.84362L1 5.45725V12.2982C1 12.8263 1.42795 13.2527 1.95455 13.2527Z" fill="#4285F4"/>
						<path d="M11.8184 13.2527H14.0456C14.5738 13.2527 15.0002 12.8248 15.0002 12.2982V5.45725L11.8184 7.84362" fill="#34A853"/>
						<path d="M11.8184 3.70725V7.84362L15.0002 5.45725V4.18453C15.0002 3.00407 13.6527 2.33112 12.7093 3.03907" fill="#FBBC04"/>
						<path d="M4.18164 7.84362V3.70725L7.99982 6.57089L11.818 3.70725V7.84362L7.99982 10.7073" fill="#EA4335"/>
						<path d="M1 4.18453V5.45725L4.18182 7.84362V3.70725L3.29091 3.03907C2.34591 2.33112 1 3.00407 1 4.18453Z" fill="#C5221F"/>
					</svg>
					<span class="thaana">ޖީމެއިލް އިން ފޮނުވާ</span>
				</button>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="h-full w-8 flex items-center justify-center border-l border-r border-muted-foreground/20 hover:bg-accent/60 transition-colors"
					>
						<ChevronDown class="w-3.5 h-3.5 text-muted-foreground" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content class="w-44" align="end" side="top">
						<DropdownMenu.Item class="thaana text-xs gap-2" onclick={openInMail}>
							<Mail class="w-3.5 h-3.5" />
							ޑިފޯލްޓް މެއިލް އެޕް
						</DropdownMenu.Item>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		{:else if data.kind === 'textMessage'}
			<button
				type="button"
				onclick={openInMessages}
				class="h-8 px-3 flex items-center gap-2 rounded-lg border border-muted-foreground/20 hover:bg-accent/60
					text-xs font-medium text-foreground transition-colors"
			>
				<MessageSquare class="w-3.5 h-3.5" />
				<span class="thaana">މެސެޖް އެޕް އިން ފޮނުވާ</span>
			</button>
		{/if}
	</div>
</div>
