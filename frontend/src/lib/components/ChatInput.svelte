<script lang="ts" module>
	export interface AttachedFile {
		id: string;
		file: File;
		type: string;
		preview: string | null;
		uploadStatus: 'pending' | 'uploading' | 'complete';
	}

	export interface PastedContent {
		id: string;
		content: string;
		timestamp: Date;
	}

	export type StyleId = 'normal' | 'learning' | 'concise' | 'explanatory' | 'formal';

	export interface ChatInputSendData {
		message: string;
		files: AttachedFile[];
		pastedContent: PastedContent[];
		webSearchEnabled: boolean;
		style: StyleId;
	}
</script>

<script lang="ts">
		import { Plus, ArrowUp, Archive, X, FileText, Loader2, Sparkles, Paperclip, Camera, Globe, Feather, Check, KeyRound } from 'lucide-svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { modelDisplayName } from '$lib/modes';
	import { Mic, Square } from 'lucide-svelte';
	import { createVoiceRecorder, type VoiceState } from '$lib/voice';
	import { transcribeAudio } from '$lib/transcribe';
	import WaveformVisualizer from './WaveformVisualizer.svelte';

	let {
		value = $bindable(''),
		selectedModel = $bindable('gemini-3-flash-preview'),
		models = [],
		placeholder = 'މެސެޖެއް ލިޔުއްވާ...',
		onSend,
		disabled = false,
		autofocus = false,
		incognito = false,
		modelProvider = 'code-assist',
	}: {
		value: string;
		selectedModel?: string;
		models?: string[];
		placeholder?: string;
		onSend: (data: ChatInputSendData) => void;
		disabled?: boolean;
		autofocus?: boolean;
		incognito?: boolean;
		modelProvider?: 'code-assist' | 'gemini-api';
	} = $props();

	let files = $state<AttachedFile[]>([]);
	let pastedContent = $state<PastedContent[]>([]);
	let isDragging = $state(false);
	let webSearchEnabled = $state(false);
	let activeStyle = $state<StyleId>('normal');
	let textareaEl = $state<HTMLTextAreaElement | undefined>();
	let fileInputEl = $state<HTMLInputElement | undefined>();

	let voiceState = $state<VoiceState>('idle');
	let recorder = createVoiceRecorder();
	let micPermissionDenied = $state(false);

	export function focus() {
		textareaEl?.focus();
	}

	$effect(() => {
		return () => {
			recorder.destroy();
		};
	});

	const styles: { id: StyleId; label: string }[] = [
		{ id: 'normal', label: 'ނޯމަލް' },
		{ id: 'learning', label: 'ދަސްކުރުން' },
		{ id: 'concise', label: 'ކުރުކޮށް' },
		{ id: 'explanatory', label: 'ތަފްސީލީ' },
		{ id: 'formal', label: 'ރަސްމީ' },
	];

	const hasContent = $derived(value.trim() || files.length > 0 || pastedContent.length > 0);

	// Auto-resize textarea
	$effect(() => {
		value;
		if (textareaEl) {
			textareaEl.style.height = 'auto';
			textareaEl.style.height = Math.min(textareaEl.scrollHeight, 384) + 'px';
		}
	});

	function genId(): string {
		return Math.random().toString(36).slice(2, 11);
	}

	function formatFileSize(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
	}

	// --- File handling ---
	function handleFiles(fileList: FileList | File[]) {
		const newFiles: AttachedFile[] = Array.from(fileList).map(file => {
			const isImage = file.type.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name);
			return {
				id: genId(),
				file,
				type: isImage ? (file.type || 'image/unknown') : (file.type || 'application/octet-stream'),
				preview: isImage ? URL.createObjectURL(file) : null,
				uploadStatus: 'pending' as const,
			};
		});

		files = [...files, ...newFiles];

		newFiles.forEach(f => {
			setTimeout(() => {
				files = files.map(p => p.id === f.id ? { ...p, uploadStatus: 'uploading' as const } : p);
			}, 100);
			setTimeout(() => {
				files = files.map(p => p.id === f.id ? { ...p, uploadStatus: 'complete' as const } : p);
			}, 800 + Math.random() * 1000);
		});
	}

	function removeFile(id: string) {
		const file = files.find(f => f.id === id);
		if (file?.preview) URL.revokeObjectURL(file.preview);
		files = files.filter(f => f.id !== id);
	}

	function removePastedContent(id: string) {
		pastedContent = pastedContent.filter(c => c.id !== id);
	}

	// --- Screenshot ---
	async function takeScreenshot() {
		try {
			const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
			const video = document.createElement('video');
			video.srcObject = stream;
			await video.play();

			const canvas = document.createElement('canvas');
			canvas.width = video.videoWidth;
			canvas.height = video.videoHeight;
			canvas.getContext('2d')!.drawImage(video, 0, 0);

			stream.getTracks().forEach(t => t.stop());

			const blob = await new Promise<Blob>((resolve) =>
				canvas.toBlob(b => resolve(b!), 'image/png')
			);
			const file = new File([blob], `screenshot-${Date.now()}.png`, { type: 'image/png' });
			handleFiles([file]);
		} catch {
			// User cancelled the screen picker
		}
	}

	// --- Paste handling ---
	function handlePaste(e: ClipboardEvent) {
		const items = e.clipboardData?.items;
		if (!items) return;

		const pastedFiles: File[] = [];
		for (let i = 0; i < items.length; i++) {
			if (items[i].kind === 'file') {
				const file = items[i].getAsFile();
				if (file) pastedFiles.push(file);
			}
		}

		if (pastedFiles.length > 0) {
			e.preventDefault();
			handleFiles(pastedFiles);
			return;
		}

		const text = e.clipboardData?.getData('text') || '';
		if (text.length > 300) {
			e.preventDefault();
			pastedContent = [...pastedContent, {
				id: genId(),
				content: text,
				timestamp: new Date(),
			}];
		}
	}

	async function startRecording() {
		try {
			await recorder.start();
			voiceState = 'recording';
			micPermissionDenied = false;
		} catch (e: any) {
			if (e.name === 'NotAllowedError') micPermissionDenied = true;
			console.error('[Voice] start failed:', e);
		}
	}

	async function stopRecording() {
		voiceState = 'transcribing';
		try {
			const blob = await recorder.stop();
			const text = await transcribeAudio(blob);
			if (text) value = value ? value + ' ' + text : text;
		} catch (e) {
			console.error('[Voice] transcription failed:', e);
		}
		voiceState = 'idle';
	}

	function cancelRecording() {
		recorder.cancel();
		voiceState = 'idle';
	}

	// --- Send ---
	function handleSend() {
		if (!hasContent || disabled) return;
		const data: ChatInputSendData = {
			message: value,
			files: [...files],
			pastedContent: [...pastedContent],
			webSearchEnabled,
			style: activeStyle,
		};
		onSend(data);
		value = '';
		files = [];
		pastedContent = [];
		if (textareaEl) textareaEl.style.height = 'auto';
	}

	function onKeyDown(e: KeyboardEvent) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}

	// --- Drag & Drop ---
	function onDragOver(e: DragEvent) {
		e.preventDefault();
		isDragging = true;
	}

	function onDragLeave(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
	}

	function onDrop(e: DragEvent) {
		e.preventDefault();
		isDragging = false;
		if (e.dataTransfer?.files) handleFiles(e.dataTransfer.files);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files) handleFiles(input.files);
		input.value = '';
	}
</script>

{#snippet fileCard(file: AttachedFile)}
	<div class="relative group shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-border bg-muted
		transition-all hover:border-muted-foreground/40">
		{#if file.type.startsWith('image/') && file.preview}
			<img src={file.preview} alt={file.file.name} class="w-full h-full object-cover" />
			<div class="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors"></div>
		{:else}
			<div class="w-full h-full p-2.5 flex flex-col justify-between">
				<div class="flex items-center gap-1.5">
					<div class="p-1 bg-border rounded">
						<FileText class="w-3.5 h-3.5 text-muted-foreground" />
					</div>
					<span class="text-[9px] font-medium text-muted-foreground uppercase tracking-wider truncate">
						{file.file.name.split('.').pop()}
					</span>
				</div>
				<div>
					<p class="text-[11px] text-foreground truncate" title={file.file.name}>{file.file.name}</p>
					<p class="text-[9px] text-muted-foreground">{formatFileSize(file.file.size)}</p>
				</div>
			</div>
		{/if}

		<button
			onclick={() => removeFile(file.id)}
			class="absolute top-1 end-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white
				opacity-0 group-hover:opacity-100 transition-opacity"
		>
			<X class="w-3 h-3" />
		</button>

		{#if file.uploadStatus === 'uploading' || file.uploadStatus === 'pending'}
			<div class="absolute inset-0 bg-black/40 flex items-center justify-center">
				<Loader2 class="w-5 h-5 text-white animate-spin" />
			</div>
		{/if}
	</div>
{/snippet}

{#snippet pastedCard(content: PastedContent)}
	<div class="relative group shrink-0 w-28 h-28 rounded-2xl overflow-hidden border border-border bg-card
		p-3 flex flex-col justify-between shadow-sm">
		<div class="overflow-hidden w-full">
			<p class="text-[10px] text-muted-foreground leading-[1.4] font-mono break-words whitespace-pre-wrap
				select-none line-clamp-4">
				{content.content}
			</p>
		</div>
		<div class="flex items-center mt-2">
			<span class="thaana inline-flex items-center px-1.5 py-0.5 rounded border border-border bg-card
				text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
				ޕޭސްޓް
			</span>
		</div>
		<button
			onclick={() => removePastedContent(content.id)}
			class="absolute top-2 end-2 p-0.5 bg-card border border-border rounded-full text-muted-foreground
				hover:text-foreground transition-colors shadow-sm
				opacity-0 group-hover:opacity-100"
		>
			<X class="w-2.5 h-2.5" />
		</button>
	</div>
{/snippet}

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
	class="relative w-full"
	ondragover={onDragOver}
	ondragleave={onDragLeave}
	ondrop={onDrop}
>
	<!-- Main container -->
	<div class="flex flex-col rounded-2xl border bg-card
		shadow-sm hover:shadow-md focus-within:shadow-md
		transition-all duration-200
		{incognito ? 'border-dashed border-ring/60 focus-within:border-ring' : 'border-border focus-within:border-ring/50'}">

		<div class="flex flex-col px-3 pt-3 pb-3 gap-2">
			<!-- Attachments row -->
			{#if files.length > 0 || pastedContent.length > 0}
				<div class="flex gap-3 overflow-x-auto pb-2 px-1">
					{#each pastedContent as pc}
						{@render pastedCard(pc)}
					{/each}
					{#each files as f}
						{@render fileCard(f)}
					{/each}
				</div>
			{/if}

			<!-- Textarea area -->
			<div class="relative min-h-[2.5rem]">
				<textarea
					bind:this={textareaEl}
					bind:value
					onpaste={handlePaste}
					onkeydown={onKeyDown}
					{placeholder}
					dir="rtl"
					rows="1"
					style="min-height: 2.5rem; max-height: 384px;"
					class="thaana w-full bg-transparent text-foreground text-[18px]
						placeholder:text-muted-foreground resize-none overflow-hidden
						focus:outline-none leading-relaxed px-1 py-1"
					disabled={disabled}
					autofocus={autofocus}
				></textarea>
			</div>

			<!-- Action bar -->
			<div class="flex items-center gap-1">
				<!-- Plus menu (dropdown) -->
				<DropdownMenu.Root>
					<DropdownMenu.Trigger
						class="inline-flex items-center justify-center h-8 w-8 rounded-lg
							text-muted-foreground hover:text-foreground hover:bg-accent
							transition-colors duration-200 active:scale-95"
					>
						<Plus class="w-5 h-5" />
					</DropdownMenu.Trigger>
					<DropdownMenu.Content side="top" align="start" class="w-56">
						<!-- Add files -->
						<DropdownMenu.Item
							onclick={() => fileInputEl?.click()}
							class="thaana gap-3 text-base py-2.5"
						>
							<Paperclip class="w-5 h-5" />
							ފައިލް ނުވަތަ ފޮޓޯ
						</DropdownMenu.Item>

						<!-- Take screenshot -->
						<DropdownMenu.Item
							onclick={takeScreenshot}
							class="thaana gap-3 text-base py-2.5"
						>
							<Camera class="w-5 h-5" />
							ސްކްރީންޝޮޓް ނަގާ
						</DropdownMenu.Item>

						<DropdownMenu.Separator />

						<!-- Style submenu -->
						<DropdownMenu.Sub>
							<DropdownMenu.SubTrigger class="thaana gap-3 text-base py-2.5">
								<Feather class="w-5 h-5" />
								ސްޓައިލް
							</DropdownMenu.SubTrigger>
							<DropdownMenu.SubContent side="left" class="w-48">
								<DropdownMenu.RadioGroup bind:value={activeStyle}>
									{#each styles as style}
										<DropdownMenu.RadioItem value={style.id} class="thaana gap-3 text-base py-2.5">
											<Feather class="w-5 h-5" />
											{style.label}
											{#if activeStyle === style.id}
												<Check class="w-5 h-5 ms-auto text-primary" />
											{/if}
										</DropdownMenu.RadioItem>
									{/each}
								</DropdownMenu.RadioGroup>
							</DropdownMenu.SubContent>
						</DropdownMenu.Sub>
					</DropdownMenu.Content>
				</DropdownMenu.Root>

				<!-- Model switcher -->
					{#if models.length > 0}
						<DropdownMenu.Root>
						<DropdownMenu.Trigger
							class="inline-flex items-center justify-center h-8 gap-1.5 px-2 rounded-lg
								text-muted-foreground hover:text-foreground hover:bg-accent
								transition-colors duration-200 active:scale-95"
						>
							<Sparkles class="w-4.5 h-4.5" />
							<span class="thaana text-[11px] font-medium max-w-[120px] truncate">{modelDisplayName(selectedModel)}</span>
						</DropdownMenu.Trigger>
						<DropdownMenu.Content side="top" align="start" class="w-56">
							<DropdownMenu.RadioGroup bind:value={selectedModel}>
								{#each models as model}
									<DropdownMenu.RadioItem value={model} class="thaana gap-3 text-sm">
										<span class={selectedModel === model ? 'text-foreground font-medium' : ''}>{modelDisplayName(model)}</span>
										{#if selectedModel === model}
											<Check class="w-3.5 h-3.5 ms-auto text-primary" />
										{/if}
									</DropdownMenu.RadioItem>
								{/each}
							</DropdownMenu.RadioGroup>
						</DropdownMenu.Content>
						</DropdownMenu.Root>
					{/if}

					<span
						class="thaana inline-flex items-center gap-1 h-8 px-2 rounded-lg border text-[10px] shrink-0
							{modelProvider === 'gemini-api'
								? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
								: 'border-border text-muted-foreground'}"
						title={modelProvider === 'gemini-api' ? 'Gemini BYOK' : 'Code Assist proxy'}
					>
						{#if modelProvider === 'gemini-api'}
							<KeyRound class="w-3 h-3" />
							BYOK
						{:else}
							<Sparkles class="w-3 h-3" />
							ޕްރޮކްސީ
						{/if}
					</span>

					<div class="flex-1"></div>

				<!-- Active modifiers pills -->
				{#if webSearchEnabled || activeStyle !== 'normal'}
					<div class="flex items-center gap-1.5">
						{#if webSearchEnabled}
							<span class="thaana inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-primary bg-primary/10 rounded-full border border-primary/20">
								<Globe class="w-3 h-3" />
								ވެބް
							</span>
						{/if}
						{#if activeStyle !== 'normal'}
							<span class="thaana inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-primary bg-primary/10 rounded-full border border-primary/20">
								<Feather class="w-3 h-3" />
								{styles.find(s => s.id === activeStyle)?.label}
							</span>
						{/if}
					</div>
				{/if}

				<!-- Mic button -->
				{#if voiceState === 'idle'}
					<button
						onclick={startRecording}
						type="button"
						disabled={disabled}
						class="inline-flex items-center justify-center h-8 w-8 rounded-xl
							text-muted-foreground hover:text-foreground hover:bg-accent
							transition-colors duration-200 active:scale-95"
						aria-label="އަޑު ރެކޯޑް ކުރޭ"
					>
						<Mic class="w-4 h-4" />
					</button>
				{:else if voiceState === 'recording'}
					<div class="flex items-center gap-1">
						<WaveformVisualizer getFrequencyData={() => recorder.getFrequencyData()} />
						<button
							onclick={cancelRecording}
							type="button"
							class="inline-flex items-center justify-center h-8 w-8 rounded-xl
								text-muted-foreground hover:text-foreground hover:bg-accent
								transition-colors duration-200 active:scale-95"
							aria-label="ކެންސަލް"
						>
							<X class="w-4 h-4" />
						</button>
						<button
							onclick={stopRecording}
							type="button"
							class="inline-flex items-center justify-center h-8 w-8 rounded-xl
								bg-red-500 text-white hover:bg-red-600
								transition-colors duration-200 active:scale-95"
							aria-label="ހުއްޓާ"
						>
							<Square class="w-3.5 h-3.5" />
						</button>
					</div>
				{:else if voiceState === 'transcribing'}
					<div class="inline-flex items-center justify-center h-8 w-8">
						<Loader2 class="w-4 h-4 animate-spin text-muted-foreground" />
					</div>
				{/if}

				<!-- Send button -->
				<button
					onclick={handleSend}
					type="button"
					disabled={!hasContent || disabled}
					class="inline-flex items-center justify-center h-8 w-8 rounded-xl
						transition-colors duration-200 active:scale-95
						{hasContent ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm' : 'text-muted-foreground opacity-50 cursor-default'}"
					aria-label="ފޮނުވާ"
				>
					<ArrowUp class="w-4 h-4" />
				</button>
			</div>
		</div>
	</div>

	<!-- Drag overlay -->
	{#if isDragging}
		<div class="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-2xl z-50
			flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
			<Archive class="w-10 h-10 text-primary mb-2 animate-bounce" />
			<p class="thaana text-primary font-medium">ފައިލް ދޫކޮށްލާ</p>
		</div>
	{/if}

	<!-- Hidden file input -->
	<input
		bind:this={fileInputEl}
		type="file"
		multiple
		class="hidden"
		onchange={handleFileInput}
	/>
</div>
