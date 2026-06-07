<script lang="ts">
	import { onMount } from 'svelte';
	import { ArrowRight, Pencil, Trash2, Plus, X, FileText, EllipsisVertical, Lock } from 'lucide-svelte';
	import ChatInput from './ChatInput.svelte';
	import type { ChatInputSendData } from './ChatInput.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import type { Project, ProjectFile } from '$lib/db';
	import type { ChatSession } from '$lib/db';
	import {
		getProject,
		updateProjectInstructions,
		updateProjectMemory,
		renameProject,
		deleteProject,
		addFileToProject,
		removeFileFromProject,
		getProjectSessions,
		totalFileSizeBytes
	} from '$lib/project-store';
	import { formatRelativeTime } from '$lib/chat-history';

	let {
		projectId,
		onBack,
		onStartChat,
			onOpenSession,
			selectedModel = $bindable('gemini-3-flash-preview'),
			models = [],
			modelProvider = 'code-assist',
			onRefreshProjects = () => {}
		}: {
		projectId: string;
		onBack: () => void;
		onStartChat: (text: string) => void | Promise<void>;
		onOpenSession: (id: string) => void;
			selectedModel?: string;
			models?: string[];
			modelProvider?: 'code-assist' | 'gemini-api';
			onRefreshProjects?: () => void;
		} = $props();

	let project = $state<Project | null>(null);
	let sessions = $state<ChatSession[]>([]);
	let instructions = $state('');
	let memory = $state('');
	let inputValue = $state('');
	let renamingTitle = $state(false);
	let renameValue = $state('');
	let saveTimer: ReturnType<typeof setTimeout> | null = null;
	let memorySaveTimer: ReturnType<typeof setTimeout> | null = null;
	let editingInstructions = $state(false);
	let editingMemory = $state(false);

	const fileSizeUsed = $derived(project ? totalFileSizeBytes(project.files) : 0);

	async function loadProject() {
		project = (await getProject(projectId)) ?? null;
		if (project) {
			instructions = project.instructions;
			memory = project.memory || '';
		}
		sessions = await getProjectSessions(projectId);
	}

	onMount(() => {
		loadProject();
	});

	// Debounced save for instructions
	function onInstructionsInput() {
		if (saveTimer) clearTimeout(saveTimer);
		saveTimer = setTimeout(async () => {
			await updateProjectInstructions(projectId, instructions);
		}, 800);
	}

	// Debounced save for memory
	function onMemoryInput() {
		if (memorySaveTimer) clearTimeout(memorySaveTimer);
		memorySaveTimer = setTimeout(async () => {
			await updateProjectMemory(projectId, memory);
		}, 800);
	}

	// Rename
	function startRename() {
		renameValue = project?.name ?? '';
		renamingTitle = true;
	}

	async function submitRename() {
		if (renameValue.trim() && project && renameValue.trim() !== project.name) {
			await renameProject(projectId, renameValue.trim());
			await loadProject();
			onRefreshProjects();
		}
		renamingTitle = false;
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') { e.preventDefault(); submitRename(); }
		else if (e.key === 'Escape') { renamingTitle = false; }
	}

	// Delete
	async function handleDelete() {
		await deleteProject(projectId);
		onRefreshProjects();
		onBack();
	}

	// File upload via File System Access API
	async function triggerFileUpload() {
		try {
			const handles = await window.showOpenFilePicker({ multiple: true });
			for (const handle of handles) {
				const file = await handle.getFile();
				const pf: ProjectFile = {
					id: crypto.randomUUID(),
					name: file.name,
					mimeType: file.type || 'application/octet-stream',
					size: file.size,
					handle,
					addedAt: Date.now()
				};
				await addFileToProject(projectId, pf);
			}
			await loadProject();
		} catch (err: any) {
			if (err.name !== 'AbortError') {
				console.error('[ProjectView] File picker error:', err);
			}
		}
	}

	async function handleRemoveFile(fileId: string) {
		await removeFileFromProject(projectId, fileId);
		await loadProject();
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	// Send message
	async function handleSend(data: ChatInputSendData) {
		const text = data.message.trim();
		if (!text) return;
		if (memorySaveTimer) {
			clearTimeout(memorySaveTimer);
			memorySaveTimer = null;
			await updateProjectMemory(projectId, memory);
		}
		await onStartChat(text);
	}
</script>

{#if project}
	<div class="flex flex-col h-full overflow-hidden" dir="rtl">
		<div class="flex-1 overflow-y-auto">
			<div class="max-w-6xl mx-auto px-6 ps-14 lg:ps-6 py-8">

				<!-- Back link -->
				<button
					onclick={onBack}
					class="thaana inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
				>
					<ArrowRight class="w-3.5 h-3.5 rotate-180" />
					ހުރިހާ ޕްރޮޖެކްޓް
				</button>

				<!-- Two-column layout -->
				<div class="flex flex-col lg:flex-row gap-8">

					<!-- Left column: project info + chat -->
					<div class="flex-1 min-w-0 flex flex-col gap-5">

						<!-- Project name + menu -->
						<div class="flex items-start gap-3 py-4">
							<div class="flex-1 min-w-0">
								{#if renamingTitle}
									<input
										bind:value={renameValue}
										onkeydown={handleRenameKeydown}
										onblur={submitRename}
										autofocus
										dir="rtl"
										class="thaana w-full px-2 py-1 text-xl bg-background border border-border rounded-lg
											text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
									/>
								{:else}
									<h1 class="thaana text-xl text-foreground">{project.name}</h1>
									{#if project.instructions}
										<p class="thaana text-sm text-muted-foreground mt-1">{project.instructions}</p>
									{/if}
								{/if}
							</div>

							<DropdownMenu.Root>
								<DropdownMenu.Trigger class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0">
									<EllipsisVertical class="w-4 h-4" />
								</DropdownMenu.Trigger>
								<DropdownMenu.Content class="w-40" align="start">
									<DropdownMenu.Item class="thaana text-xs gap-2" onclick={startRename}>
										<Pencil class="w-3.5 h-3.5" />
										ނަން ބަދަލުކުރޭ
									</DropdownMenu.Item>
									<DropdownMenu.Separator />
									<DropdownMenu.Item class="thaana text-xs gap-2 text-destructive" onclick={handleDelete}>
										<Trash2 class="w-3.5 h-3.5" />
										ޑިލީޓް
									</DropdownMenu.Item>
								</DropdownMenu.Content>
							</DropdownMenu.Root>
						</div>

						<!-- Chat input -->
						<div>
							<ChatInput
								bind:value={inputValue}
									bind:selectedModel
									{models}
									{modelProvider}
									onSend={handleSend}
									placeholder="ޖަވާބު..."
								/>
						</div>

						<!-- Hint text -->
						<div class="border border-border rounded-xl p-8 text-center">
							<h3 class="thaana text-sm text-muted-foreground/50 text-balance">
								ޗެޓެއް ފައްޓަވައިގެން ވާހަކަ ތަރުތީބުކޮށް ޕްރޮޖެކްޓް މައުލޫމާތު ބޭނުންކުރައްވާ.
							</h3>
						</div>

						<!-- Sessions list -->
						{#if sessions.length > 0}
							<div class="flex flex-col gap-1 mt-2">
								{#each sessions as session (session.id)}
									<button
										onclick={() => onOpenSession(session.id)}
										class="flex items-center gap-3 px-4 py-3 border border-border rounded-xl
											hover:bg-accent/50 hover:border-border/80 transition-all text-right w-full"
									>
										<div class="flex-1 min-w-0">
											<span class="thaana text-sm text-foreground truncate block">{session.title}</span>
											<span class="text-[10px] text-muted-foreground">{formatRelativeTime(session.updatedAt)}</span>
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>

					<!-- Right column: memory + instructions + files -->
					<div class="w-full lg:w-96 shrink-0 border border-border rounded-2xl flex flex-col lg:mt-4">

						<!-- Memory section -->
						<div class="px-5 py-4 mt-1">
							<div class="flex flex-col gap-0.5">
								<div class="h-6 flex items-center justify-between gap-4 mb-1">
									<h3 class="thaana text-sm font-semibold text-foreground">ހަނދާންތައް</h3>
									{#if !editingMemory}
										<div class="flex items-center gap-2">
											<div class="inline-flex items-center gap-1 px-2 py-0.5 text-muted-foreground rounded-md border border-border text-[11px] leading-none">
												<Lock class="w-3.5 h-3.5 shrink-0" />
												<span class="thaana translate-y-[3px]">ހަމައެކަނި ތިބާ</span>
											</div>
											<button
												onclick={() => { editingMemory = true; }}
												class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors -me-2"
											>
												<Plus class="w-4 h-4" />
											</button>
										</div>
									{/if}
								</div>
								{#if editingMemory}
									<textarea
										bind:value={memory}
										oninput={onMemoryInput}
										dir="rtl"
										rows="4"
										placeholder="ޕްރޮޖެކްޓާ ގުޅޭ ހަނދާންތައް ލިޔާށެވެ..."
										autofocus
										class="thaana w-full mt-2 px-3 py-2.5 bg-background border border-border rounded-lg
											text-foreground text-sm leading-relaxed resize-y
											focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40
											placeholder:text-muted-foreground/40"
									></textarea>
									<div class="flex items-center gap-2 mt-2">
										<button
											onclick={() => { editingMemory = false; }}
											class="thaana text-xs text-muted-foreground hover:text-foreground transition-colors"
										>
											ނިންމާ
										</button>
									</div>
								{:else if memory}
									<button
										onclick={() => { editingMemory = true; }}
										class="thaana text-sm text-muted-foreground/70 mt-1 text-right w-full hover:text-muted-foreground transition-colors line-clamp-2"
									>
										{memory}
									</button>
								{:else}
									<p class="thaana text-sm text-muted-foreground/40 mt-0.5">
										މި ޕްރޮޖެކްޓަށް ޚާއްޞަ ހަނދާން ލިޔުމަށް މިތާ ފިތާލާ.
									</p>
								{/if}
							</div>
						</div>

						<div class="h-[0.5px] w-full bg-border"></div>

						<!-- Instructions section -->
						<div class="px-5 py-4 mt-1">
							<div class="flex flex-col gap-0.5">
								<div class="h-6 flex items-center justify-between gap-4">
									<h3 class="thaana text-sm font-semibold text-foreground">އިރުޝާދުތައް</h3>
									{#if !editingInstructions}
										<button
											onclick={() => { editingInstructions = true; }}
											class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors -me-2"
										>
											<Plus class="w-4 h-4" />
										</button>
									{/if}
								</div>
								{#if editingInstructions}
									<textarea
										bind:value={instructions}
										oninput={onInstructionsInput}
										dir="rtl"
										rows="4"
										placeholder="ރާޅު ގެ ޖަވާބުތައް ބައްޓަން ކުރުމަށް އިރުޝާދު ލިޔާށެވެ..."
										autofocus
										class="thaana w-full mt-2 px-3 py-2.5 bg-background border border-border rounded-lg
											text-foreground text-sm leading-relaxed resize-y
											focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40
											placeholder:text-muted-foreground/40"
									></textarea>
									<div class="flex items-center gap-2 mt-2">
										<button
											onclick={() => { editingInstructions = false; }}
											class="thaana text-xs text-muted-foreground hover:text-foreground transition-colors"
										>
											ނިންމާ
										</button>
									</div>
								{:else if instructions}
									<button
										onclick={() => { editingInstructions = true; }}
										class="thaana text-sm text-muted-foreground/70 mt-1 text-right w-full hover:text-muted-foreground transition-colors line-clamp-2"
									>
										{instructions}
									</button>
								{:else}
									<p class="thaana text-sm text-muted-foreground/40 mt-0.5">
										ރާޅު ގެ ޖަވާބުތައް ބައްޓަން ކުރުމަށް އިރުޝާދު އެޑް ކުރައްވާ
									</p>
								{/if}
							</div>
						</div>

						<!-- Divider -->
						<div class="h-[0.5px] w-full bg-border"></div>

						<!-- Files section -->
						<div class="px-5 py-4 flex flex-col gap-2 mb-1">
							<div class="h-6 flex items-center justify-between gap-4">
								<h3 class="thaana text-sm font-semibold text-foreground">ފައިލްތައް</h3>
								<button
									onclick={triggerFileUpload}
									class="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors -me-2"
								>
									<Plus class="w-4 h-4" />
								</button>
							</div>

							{#if project.files.length > 0}
								<div class="flex flex-col gap-1.5">
									{#each project.files as file (file.id)}
										<div class="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg group/file">
											<FileText class="w-4 h-4 text-muted-foreground shrink-0" />
											<div class="flex-1 min-w-0">
												<span class="text-sm text-foreground truncate block">{file.name}</span>
												<span class="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
											</div>
											<button
												onclick={() => handleRemoveFile(file.id)}
												class="p-1 rounded text-muted-foreground hover:text-destructive
													opacity-0 group-hover/file:opacity-100 transition-all shrink-0"
											>
												<X class="w-3.5 h-3.5" />
											</button>
										</div>
									{/each}
									{#if fileSizeUsed > 0}
										<span class="text-[10px] text-muted-foreground tabular-nums mt-1">
											{formatFileSize(fileSizeUsed)}
										</span>
									{/if}
								</div>
							{:else}
								<!-- Empty state -->
								<div class="flex flex-col items-center justify-center h-40 bg-muted/30 rounded-2xl gap-3">
									<div class="relative">
										<svg viewBox="0 0 80 60" width="80" height="60" class="text-muted-foreground/20">
											<rect x="5" y="8" width="28" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2" />
											<line x1="11" y1="18" x2="27" y2="18" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
											<line x1="11" y1="24" x2="27" y2="24" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
											<line x1="11" y1="30" x2="22" y2="30" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
											<rect x="26" y="14" width="28" height="36" rx="3" fill="none" stroke="currentColor" stroke-width="2" />
											<line x1="32" y1="24" x2="48" y2="24" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
											<line x1="32" y1="30" x2="48" y2="30" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
											<line x1="32" y1="36" x2="43" y2="36" stroke="currentColor" stroke-width="1.5" opacity="0.5" />
											<circle cx="62" cy="22" r="10" fill="none" stroke="currentColor" stroke-width="2" />
											<line x1="62" y1="17" x2="62" y2="27" stroke="currentColor" stroke-width="2" />
											<line x1="57" y1="22" x2="67" y2="22" stroke="currentColor" stroke-width="2" />
										</svg>
									</div>
									<p class="thaana text-xs text-muted-foreground/50 text-center leading-relaxed max-w-[14.5rem]">
										PDF، ޑޮކިއުމެންޓް، ނުވަތަ ޓެކްސްޓް ފައިލް އެޑް ކުރައްވާ މި ޕްރޮޖެކްޓްގައި ބޭނުންކުރަން.
									</p>
								</div>
							{/if}
						</div>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
