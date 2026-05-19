<script lang="ts">
	import { tick, onMount, onDestroy } from 'svelte';
	import {
		Copy, Check, Download, ChevronDown, ChevronRight, ChevronLeft,
		FileText, Paperclip,
		Pencil, Trash2, X, ArrowLeft
	} from 'lucide-svelte';
	import ChatInput from './ChatInput.svelte';
	import type { ChatInputSendData, AttachedFile } from './ChatInput.svelte';
	import ArtifactPreview from './ArtifactPreview.svelte';
	import * as Drawer from '$lib/components/ui/drawer';
	import ToolCallStep from './tool-renderers/ToolCallStep.svelte';
	import ThinkingBlock from './ThinkingBlock.svelte';
	import CodeBlock from './CodeBlock.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { TextShimmer } from '$lib/components/ui/text-shimmer';
	import { PyodideSandbox } from '$lib/agent/sandbox';
	import { agentLoop, buildContents } from '$lib/agent/loop';
	import { getPromptModule } from '$lib/prompts';
	import MessageCompose from './MessageCompose.svelte';
	import RecipeDisplay from './RecipeDisplay.svelte';
	import WidgetDisplay from './WidgetDisplay.svelte';
	import type { AgentMessage, AgentStep, Artifact, GeminiContent, UserInputQuestion, MessageComposeData, RecipeData, WidgetData } from '$lib/agent/types';
	import {
		fetchAITitle,
		updateSessionTitle
	} from '$lib/chat-history';
	import { saveAgentMessages, saveAgentFS, loadAgentFS, saveAgentContents, loadAgentContents } from '$lib/chat-history';
	import { parseMarkdown } from '$lib/markdown';
	import { injectProjectContext, type ProjectContext } from '$lib/project-context';
	import { verifyFilePermission } from '$lib/project-store';

	let {
		model = $bindable('gemini-3-flash-preview'),
		models = [],
		quotaExhausted = false,
		sessionId,
		initialMessages = [],
		initialUserMessage = '',
		initialUserFiles = [] as AttachedFile[],
		onRename = (_title: string) => {},
		onDelete = () => {},
		onRefreshSessions = () => {},
		onArtifactOpen = () => {},
		title = '',
		projectContext = undefined,
		incognito = false,
		onExitIncognito = () => {}
	}: {
		model: string;
		models?: string[];
		quotaExhausted?: boolean;
		sessionId: string;
		initialMessages?: AgentMessage[];
		initialUserMessage?: string;
		initialUserFiles?: AttachedFile[];
		onRename?: (title: string) => void;
		onDelete?: () => void;
		onRefreshSessions?: () => void;
		onArtifactOpen?: () => void;
		title?: string;
		projectContext?: ProjectContext;
		incognito?: boolean;
		onExitIncognito?: () => void;
	} = $props();

	let messages = $state<AgentMessage[]>(initialMessages);
	let sandbox = new PyodideSandbox();
	sandbox.onProgress = (step: string) => { sandboxStep = step; };
	let sandboxLoading = $state(false);
	let sandboxStep = $state('');
	let panelWidth = $state(45);
	let resizing = $state(false);
	let containerEl = $state<HTMLDivElement | undefined>();

	// Mobile detection (below Tailwind md breakpoint)
	let isMobile = $state(false);
	const mobileQuery = typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)') : null;
	if (mobileQuery) {
		isMobile = mobileQuery.matches;
		mobileQuery.addEventListener('change', (e) => { isMobile = e.matches; });
	}

	function onResizeStart(e: MouseEvent) {
		e.preventDefault();
		resizing = true;

		function onMouseMove(e: MouseEvent) {
			if (!containerEl) return;
			const rect = containerEl.getBoundingClientRect();
			const x = e.clientX - rect.left;
			const pct = (x / rect.width) * 100;
			panelWidth = Math.max(20, Math.min(70, pct));
		}

		function onMouseUp() {
			resizing = false;
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		}

		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}
	let running = $state(false);
	let inputValue = $state('');
	let messagesEl = $state<HTMLDivElement | undefined>();
	let chatInputRef: ReturnType<typeof ChatInput> | undefined;
	let copiedId = $state<string | null>(null);
	let contents: GeminiContent[] = [];
	let renamingTitle = $state(false);
	let renameValue = $state('');
	let titleRequested = false;
	let activeArtifact = $state<Artifact | null>(null);

	// --- Spinner verbs ---
	const SPINNER_VERBS = [
		'ތައްޔާރުކުރަނީ', 'އުފައްދަނީ', 'ދިރުވަނީ', 'ގެނެސްދެނީ',
		'ރާވަނީ', 'ހޭލައްވަނީ', 'އެއްކުރަނީ', 'ބަދަލުކުރަނީ',
		'ތަރުތީބުކުރަނީ', 'ފިލްޓަރުކުރަނީ', 'ޖާދޫކުރަނީ', 'ހަދަނީ',
		'ވިސްނަނީ', 'ހޯދަނީ', 'ލިޔަނީ', 'ދިރާސާކުރަނީ',
		'ކުރިއަށް ދަނީ', 'ހިންގަނީ', 'ގުޅާލަނީ', 'ޗެކްކުރަނީ',
		'ލޯޑްކުރަނީ', 'ޕްރޮސެސްކުރަނީ', 'ކޮމްޕިއުޓްކުރަނީ',
	];

	const TOOL_VERBS: Record<string, string> = {
		web_search: 'ވެބް ހޯދަނީ',
		web_fetch: 'ވެބް ލޯޑްކުރަނީ',
		execute_python: 'ކޯޑް ހިންގަނީ',
		write_file: 'ފައިލް ލިޔަނީ',
		read_file: 'ފައިލް ކިޔަނީ',
		list_directory: 'ފޯލްޑަރު ބަލަނީ',
		present_file: 'ފައިލް ތައްޔާރުކުރަނީ',
		message_compose: 'މެސެޖް ލިޔަނީ',
		recipe_display: 'ރެސިޕީ ތައްޔާރުކުރަނީ',
		read_skill: 'ސްކިލް ކިޔަނީ',
		ask_user_input: 'ސުވާލުކުރަނީ',
		get_document_template: 'ޓެމްޕްލޭޓް ހޯދަނީ',
	};

	let spinnerVerb = $state('');
	let verbTimer: ReturnType<typeof setInterval> | null = null;
	let verbIndex = $state(0);

	function startVerbCycle() {
		verbIndex = Math.floor(Math.random() * SPINNER_VERBS.length);
		spinnerVerb = SPINNER_VERBS[verbIndex];
		verbTimer = setInterval(() => {
			verbIndex = (verbIndex + 1) % SPINNER_VERBS.length;
			spinnerVerb = SPINNER_VERBS[verbIndex];
		}, 3000);
	}

	function stopVerbCycle() {
		if (verbTimer) { clearInterval(verbTimer); verbTimer = null; }
		spinnerVerb = '';
	}

	function setToolVerb(toolName: string) {
		if (verbTimer) { clearInterval(verbTimer); verbTimer = null; }
		spinnerVerb = TOOL_VERBS[toolName] || 'ޕްރޮސެސްކުރަނީ';
	}

	// User input widget state
	let pendingQuestions = $state<UserInputQuestion[]>([]);
	let currentQuestionIdx = $state(0);
	let questionSelections = $state<Record<number, Set<string>>>({});
	let customInputs = $state<Record<number, string>>({});
	let focusedOptionIdx = $state(0); // 0..options.length = options, options.length = custom input
	let userInputWidgetEl = $state<HTMLDivElement | undefined>();

	function hasPendingInput(): boolean {
		return pendingQuestions.length > 0;
	}

	// Auto-focus widget when it appears
	$effect(() => {
		if (pendingQuestions.length > 0 && userInputWidgetEl) {
			tick().then(() => userInputWidgetEl?.focus());
		}
	});

	// Reset focused index when question changes
	$effect(() => {
		currentQuestionIdx;
		focusedOptionIdx = 0;
	});

	function optionCount(): number {
		const q = pendingQuestions[currentQuestionIdx];
		return q ? q.options.length + 1 : 0; // +1 for custom input row
	}

	function toggleOption(qIdx: number, option: string) {
		const current = questionSelections[qIdx] || new Set<string>();
		const q = pendingQuestions[qIdx];
		if (q?.type === 'multi_select') {
			const next = new Set(current);
			if (next.has(option)) next.delete(option);
			else next.add(option);
			questionSelections = { ...questionSelections, [qIdx]: next };
		} else {
			// single_select — replace
			questionSelections = { ...questionSelections, [qIdx]: new Set([option]) };
		}
	}

	function isOptionSelected(qIdx: number, option: string): boolean {
		return questionSelections[qIdx]?.has(option) ?? false;
	}

	function selectedCount(qIdx: number): number {
		return (questionSelections[qIdx]?.size ?? 0) + (customInputs[qIdx]?.trim() ? 1 : 0);
	}

	function totalSelectedCount(): number {
		let count = 0;
		for (let i = 0; i < pendingQuestions.length; i++) {
			count += selectedCount(i);
		}
		return count;
	}

	function canAdvance(): boolean {
		return selectedCount(currentQuestionIdx) > 0;
	}

	function isLastQuestion(): boolean {
		return currentQuestionIdx >= pendingQuestions.length - 1;
	}

	function advanceOrSubmit() {
		if (!canAdvance()) return;
		if (isLastQuestion()) {
			submitUserInput();
		} else {
			currentQuestionIdx++;
		}
	}

	function handleWidgetKeydown(e: KeyboardEvent) {
		const total = optionCount();
		if (total === 0) return;

		if (e.key === 'ArrowDown') {
			e.preventDefault();
			focusedOptionIdx = (focusedOptionIdx + 1) % total;
			// If landing on custom input, focus it
			if (focusedOptionIdx === total - 1) {
				tick().then(() => {
					userInputWidgetEl?.querySelector<HTMLInputElement>('input[data-custom-input]')?.focus();
				});
			} else {
				// Blur custom input if we left it
				userInputWidgetEl?.querySelector<HTMLInputElement>('input[data-custom-input]')?.blur();
			}
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			focusedOptionIdx = (focusedOptionIdx - 1 + total) % total;
			if (focusedOptionIdx === total - 1) {
				tick().then(() => {
					userInputWidgetEl?.querySelector<HTMLInputElement>('input[data-custom-input]')?.focus();
				});
			} else {
				userInputWidgetEl?.querySelector<HTMLInputElement>('input[data-custom-input]')?.blur();
			}
		} else if (e.key === 'Enter') {
			e.preventDefault();
			const q = pendingQuestions[currentQuestionIdx];
			if (!q) return;
			if (focusedOptionIdx < q.options.length) {
				// Toggle the focused option
				toggleOption(currentQuestionIdx, q.options[focusedOptionIdx]);
			} else {
				// On custom input row — submit if there's a selection
				if (canAdvance()) advanceOrSubmit();
			}
		} else if (e.key === 'Escape') {
			dismissUserInput();
		}
	}

	function submitUserInput() {
		// Format as Q\nA\n\nQ\nA
		const lines: string[] = [];
		for (let i = 0; i < pendingQuestions.length; i++) {
			const q = pendingQuestions[i];
			const selected = Array.from(questionSelections[i] || []);
			const custom = customInputs[i]?.trim();
			if (custom) selected.push(custom);
			if (selected.length === 0) continue;
			lines.push(q.question);
			lines.push(selected.join('، '));
		}
		const message = lines.join('\n');

		// Clear state
		pendingQuestions = [];
		currentQuestionIdx = 0;
		questionSelections = {};
		customInputs = {};
		focusedOptionIdx = 0;

		if (message.trim()) {
			handleSend({ message, files: [], pastedContent: [], webSearchEnabled: false, style: 'normal' });
		}
	}

	function dismissUserInput() {
		pendingQuestions = [];
		currentQuestionIdx = 0;
		questionSelections = {};
		customInputs = {};
		focusedOptionIdx = 0;
	}

	// Build system instruction (project context injected async in onMount)
	const promptModule = getPromptModule();
	const baseSystemPromptText = promptModule.getSystemPrompt();
	let systemInstruction = $state({
		role: 'user' as const,
		parts: [{ text: baseSystemPromptText }] as [{ text: string }]
	});
	let systemPromptReady = $state(!projectContext);

	// Rebuild contents from existing messages on mount (for resumed sessions)
	onMount(async () => {
		console.log(`[AgentChat] Mounted. sessionId=${sessionId} initialMessages=${initialMessages.length}`);

		// Build project context async (reads files from handles)
		if (projectContext) {
			for (const file of projectContext.files) {
				await verifyFilePermission(file.handle);
			}
			const enrichedPrompt = await injectProjectContext(baseSystemPromptText, projectContext);
			systemInstruction = {
				role: 'user' as const,
				parts: [{ text: enrichedPrompt }] as [{ text: string }]
			};
			systemPromptReady = true;
		}
		if (initialMessages.length > 0) {
			const savedContents = await loadAgentContents(sessionId);
			if (savedContents) {
				contents = savedContents;
				console.log(`[AgentChat] Restored ${contents.length} raw contents from IndexedDB`);
			} else {
				for (const msg of initialMessages) {
					if (msg.role === 'user') {
						contents.push({ role: 'user', parts: [{ text: msg.content }] });
					} else if (msg.role === 'assistant') {
						contents.push({ role: 'model', parts: [{ text: msg.content }] });
					}
				}
				console.log(`[AgentChat] Fallback: rebuilt ${contents.length} contents from ${initialMessages.length} messages`);
			}

			const fsSnapshot = await loadAgentFS(sessionId);
			if (fsSnapshot) {
				console.log(`[AgentChat] Restoring FS snapshot (${Object.keys(fsSnapshot).length} files)`);
				sandboxLoading = true;
				try {
					await sandbox.init();
					await sandbox.restoreFS(fsSnapshot);
					console.log('[AgentChat] FS restored successfully');
				} catch (err) {
					console.error('[AgentChat] FS restore failed:', err);
				} finally {
					sandboxLoading = false;
					sandboxStep = '';
				}

				// Recreate blob URLs for artifact steps from fsSnapshot base64 data
				let restored = 0;
				for (const msg of messages) {
					if (!msg.steps) continue;
					for (const step of msg.steps) {
						if (step.kind !== 'artifact' || step.url) continue;
						const fname = (step as any).filename as string;
						const matchingPath = Object.keys(fsSnapshot).find(
							(p) => p.endsWith('/' + fname) || p === fname
						);
						if (matchingPath && fsSnapshot[matchingPath]) {
							try {
								const bin = atob(fsSnapshot[matchingPath]);
								const bytes = new Uint8Array(bin.length);
								for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
								const blob = new Blob([bytes], { type: (step as any).mimeType || 'application/octet-stream' });
								(step as any).url = URL.createObjectURL(blob);
								restored++;
							} catch { /* skip corrupt entries */ }
						}
					}
				}
				if (restored > 0) {
					messages = [...messages];
					console.log(`[AgentChat] Restored ${restored} artifact blob URLs from FS snapshot`);
				}
			}

			titleRequested = true;
		}

		// Auto-send initial message from dashboard
		if (initialUserMessage && messages.length === 0) {
			handleSend({ message: initialUserMessage, files: initialUserFiles, pastedContent: [], webSearchEnabled: false, style: 'normal' });
		}
	});

	onDestroy(() => {
		console.log('[AgentChat] Destroying');
		stopVerbCycle();
		sandbox.destroy();
	});

	// Auto-scroll
	$effect(() => {
		messages;
		running;
		tick().then(() => {
			if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
		});
	});

	async function fileToInlineData(f: AttachedFile): Promise<{ inlineData: { mimeType: string; data: string } }> {
		const buf = await f.file.arrayBuffer();
		const bytes = new Uint8Array(buf);
		let binary = '';
		for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
		return {
			inlineData: {
				mimeType: f.file.type || 'application/octet-stream',
				data: btoa(binary)
			}
		};
	}

	async function handleSend(data: ChatInputSendData) {
		const text = data.message.trim();
		const imageFiles = data.files.filter(f => f.type.startsWith('image/'));
		if ((!text && imageFiles.length === 0) || running || quotaExhausted || !systemPromptReady) return;

		console.log(`[AgentChat] ▶ User message: "${text.slice(0, 100)}${text.length > 100 ? '...' : ''}" (${imageFiles.length} image(s))`);

		const imageParts = await Promise.all(imageFiles.map(fileToInlineData));

		const userMsg: AgentMessage = {
			id: crypto.randomUUID(),
			role: 'user',
			content: text,
			...(imageParts.length > 0 && { images: imageParts.map(p => p.inlineData) })
		};
		messages = [...messages, userMsg];

		if (!sandbox.ready) {
			console.log('[AgentChat] Sandbox not ready, initializing...');
			sandboxLoading = true;
			try {
				await sandbox.init();
				console.log('[AgentChat] Sandbox initialized');
			} catch (err: any) {
				console.error('[AgentChat] Sandbox init failed:', err);
				messages = [
					...messages,
					{
						id: crypto.randomUUID(),
						role: 'assistant',
						content: `Sandbox initialization failed: ${err.message}`
					}
				];
				sandboxLoading = false;
				sandboxStep = '';
				return;
			}
			sandboxStep = '';
		}

		contents = buildContents(contents, text, imageParts);
		running = true;
		sandboxLoading = false;
		startVerbCycle();

		const assistantMsg: AgentMessage = {
			id: crypto.randomUUID(),
			role: 'assistant',
			content: '',
			steps: []
		};
		messages = [...messages, assistantMsg];

		function updateUI() {
			messages = [...messages.slice(0, -1), { ...assistantMsg, steps: [...(assistantMsg.steps || [])] }];
		}

		// Debounced UI update for high-frequency delta events (~30fps cap)
		let uiUpdateTimer: ReturnType<typeof setTimeout> | null = null;

		function scheduleUIUpdate() {
			if (!uiUpdateTimer) {
				uiUpdateTimer = setTimeout(() => {
					uiUpdateTimer = null;
					updateUI();
				}, 32);
			}
		}

		function flushUIUpdate() {
			if (uiUpdateTimer) {
				clearTimeout(uiUpdateTimer);
				uiUpdateTimer = null;
			}
			updateUI();
		}

		try {
			const loop = agentLoop({ model, contents, systemInstruction, sandbox });

			for await (const event of loop) {
				const steps = assistantMsg.steps!;

				switch (event.type) {
					case 'thinking-delta': {
						const last = steps[steps.length - 1];
						if (last && last.kind === 'thinking') {
							last.content = (last.content || '') + event.content;
						} else {
							steps.push({ kind: 'thinking', content: event.content });
							spinnerVerb = 'ވިސްނަނީ';
						}
						scheduleUIUpdate();
						break;
					}

					case 'text-delta': {
						const last = steps[steps.length - 1];
						if (last && last.kind === 'text') {
							last.content += event.content;
						} else {
							steps.push({ kind: 'text', content: event.content });
							spinnerVerb = 'ލިޔަނީ';
						}
						assistantMsg.content = steps
							.filter(s => s.kind === 'text')
							.map(s => (s as { kind: 'text'; content: string }).content)
							.join('');
						scheduleUIUpdate();
						break;
					}

					case 'thinking':
						spinnerVerb = 'ވިސްނަނީ';
						steps.push({ kind: 'thinking', content: event.content });
						updateUI();
						break;

					case 'tool-call':
						setToolVerb(event.name);
						steps.push({
							kind: 'tool-call',
							name: event.name,
							args: event.args,
							status: 'running'
						});
						updateUI();
						break;

					case 'tool-result': {
						startVerbCycle();
						for (let i = steps.length - 1; i >= 0; i--) {
							const s = steps[i];
							if (s.kind === 'tool-call' && s.status === 'running') {
								steps[i] = {
									...s,
									status: event.result.success ? 'done' : 'error',
									result: event.result
								};
								break;
							}
						}
						updateUI();
						break;
					}

					case 'text':
						spinnerVerb = 'ލިޔަނީ';
						steps.push({ kind: 'text', content: event.content });
						assistantMsg.content = event.content;
						updateUI();
						break;

					case 'artifact': {
						const art: Artifact = {
							url: event.url,
							label: event.label,
							filename: event.filename,
							mimeType: event.mimeType
						};
						steps.push({ kind: 'artifact', ...art });
						activeArtifact = art;
						onArtifactOpen();
						updateUI();
						break;
					}

					case 'ask-user-input':
						pendingQuestions = event.questions;
						currentQuestionIdx = 0;
						questionSelections = {};
						customInputs = {};
						break;

					case 'message-compose':
						steps.push({ kind: 'message-compose', data: event.data });
						updateUI();
						break;

					case 'recipe-display':
						steps.push({ kind: 'recipe-display', data: event.data });
						updateUI();
						break;

					case 'show-widget':
						steps.push({ kind: 'show-widget', data: event.data });
						updateUI();
						break;

					case 'error':
						assistantMsg.content =
							(assistantMsg.content ? assistantMsg.content + '\n\n' : '') +
							`**Error:** ${event.message}`;
						steps.push({ kind: 'text', content: `**Error:** ${event.message}` });
						updateUI();
						break;
				}
			}
			// Flush any pending debounced UI update
			flushUIUpdate();
		} catch (err: any) {
			console.error('[AgentChat] Agent loop error:', err);
			assistantMsg.content =
				(assistantMsg.content ? assistantMsg.content + '\n\n' : '') +
				`**Error:** ${err.message}`;
			assistantMsg.steps!.push({ kind: 'text', content: `**Error:** ${err.message}` });
			flushUIUpdate();
		}

		running = false;
		stopVerbCycle();

		// Auto-focus chat input on desktop when streaming ends
		if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
			await tick();
			chatInputRef?.focus();
		}

		if (!incognito) {
			await saveAgentMessages(sessionId, messages);
			await saveAgentContents(sessionId, contents);

			try {
				const fs = await sandbox.snapshotFS();
				if (Object.keys(fs).length > 0) {
					await saveAgentFS(sessionId, fs);
				}
			} catch (err) {
				console.warn('[AgentChat] FS snapshot failed:', err);
			}

			if (!titleRequested) {
				titleRequested = true;
				const aiTitle = await fetchAITitle(text);
				if (aiTitle) {
					await updateSessionTitle(sessionId, aiTitle);
					onRefreshSessions();
				}
			}

			onRefreshSessions();
		}
	}

	function copyMessage(id: string, content: string) {
		navigator.clipboard.writeText(content);
		copiedId = id;
		setTimeout(() => (copiedId = null), 1500);
	}

	function downloadArtifact(artifact: Artifact) {
		const a = document.createElement('a');
		a.href = artifact.url;
		a.download = artifact.filename;
		a.click();
	}

	async function openArtifact(step: AgentStep) {
		if (step.kind !== 'artifact') return;
		let url = step.url;

		// Reconstruct blob URL from fsSnapshot if missing (e.g. after page refresh)
		if (!url) {
			const fs = await loadAgentFS(sessionId);
			if (fs) {
				const fname = step.filename;
				const matchingPath = Object.keys(fs).find(
					(p) => p.endsWith('/' + fname) || p === fname
				);
				if (matchingPath && fs[matchingPath]) {
					try {
						const bin = atob(fs[matchingPath]);
						const bytes = new Uint8Array(bin.length);
						for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
						const blob = new Blob([bytes], { type: step.mimeType || 'application/octet-stream' });
						url = URL.createObjectURL(blob);
						(step as any).url = url;
					} catch { /* skip */ }
				}
			}
		}

		activeArtifact = { url, label: step.label, filename: step.filename, mimeType: step.mimeType };
		onArtifactOpen();
	}

	function getArtifactTypeLabel(filename: string): string {
		const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
		if (['DOCX', 'DOC'].includes(ext)) return `Document · ${ext}`;
		if (ext === 'PDF') return `Document · ${ext}`;
		if (['XLSX', 'XLS'].includes(ext)) return `Spreadsheet · ${ext}`;
		if (ext === 'CSV') return `Data · ${ext}`;
		if (['PNG', 'JPG', 'JPEG', 'GIF', 'SVG', 'WEBP'].includes(ext)) return `Image · ${ext}`;
		return `File · ${ext}`;
	}

	function startRenameTitle() {
		renameValue = title;
		renamingTitle = true;
	}

	function submitRename() {
		if (renameValue.trim() && renameValue.trim() !== title) {
			onRename(renameValue.trim());
		}
		renamingTitle = false;
	}

	function handleRenameKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			submitRename();
		} else if (e.key === 'Escape') {
			renamingTitle = false;
		}
	}
</script>

<div class="flex h-full" bind:this={containerEl} class:select-none={resizing}>
	<!-- Chat column -->
	<div class="flex-1 min-w-0 flex flex-col relative">
		<!-- Top bar -->
		<div class="shrink-0 pe-5 ps-14 lg:ps-5 py-3 z-10">
			{#if incognito}
				<div class="flex items-center justify-between gap-2">
					<span class="thaana text-sm text-muted-foreground">ސިއްރު ޗެޓް</span>
					<button
						onclick={onExitIncognito}
						class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
						title="ނިންމާ"
					>
						<X class="w-4 h-4" />
					</button>
				</div>
			{:else if renamingTitle}
				<div class="flex items-center gap-2">
					<input
						bind:value={renameValue}
						onkeydown={handleRenameKeydown}
						onblur={submitRename}
						autofocus
						class="thaana flex-1 min-w-0 px-2 py-1 text-sm bg-background border border-border rounded-lg
							text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
					/>
				</div>
			{:else}
				<div class="flex items-center gap-1">
					<DropdownMenu.Root>
						<DropdownMenu.Trigger class="flex items-center gap-1.5 min-w-0 rounded-lg px-2 py-1
							hover:bg-accent transition-colors duration-150">
							<span class="thaana text-sm text-muted-foreground truncate">{title || 'އޭޖެންޓް'}</span>
							<ChevronDown class="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Content class="w-44" align="start" side="bottom">
							<DropdownMenu.Item class="thaana text-xs gap-2" onclick={startRenameTitle}>
								<Pencil class="w-3.5 h-3.5" />
								ނަން ބަދަލުކުރޭ
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item class="thaana text-xs gap-2 text-destructive" onclick={onDelete}>
								<Trash2 class="w-3.5 h-3.5" />
								ޑިލީޓް
							</DropdownMenu.Item>
						</DropdownMenu.Content>
					</DropdownMenu.Root>
				</div>
			{/if}
		</div>

		<!-- Messages -->
		<div class="flex-1 overflow-hidden relative">
			<div class="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent z-[5] pointer-events-none"></div>
			<div class="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-[5] pointer-events-none"></div>
			<div bind:this={messagesEl} class="h-full overflow-y-auto">
				<div class="max-w-[760px] mx-auto p-5 flex flex-col gap-2.5">
					{#each messages as message}
						{#if message.role === 'user'}
							<div class="animate-fade-in-up max-w-[65%] self-start flex flex-col gap-1.5">
								{#if message.images && message.images.length > 0}
									<div class="flex flex-wrap gap-2">
										{#each message.images as img}
											<img
												src="data:{img.mimeType};base64,{img.data}"
												alt=""
												class="max-h-48 max-w-full rounded-xl border border-primary/20 object-cover"
											/>
										{/each}
									</div>
								{:else if message.imageCount && message.imageCount > 0}
									<div class="thaana inline-flex items-center gap-1.5 self-end px-2.5 py-1 text-xs text-muted-foreground bg-muted border border-border rounded-full w-fit">
										<Paperclip class="w-3 h-3" />
										<span>{message.imageCount > 1 ? `${message.imageCount} ފޮޓޯ` : 'ފޮޓޯ'}</span>
									</div>
								{/if}
								{#if message.content}
									<div class="px-3.5 py-2.5 break-words thaana text-[18.5px] leading-[45px] bg-primary/10 border border-primary/20 rounded-[14px] rounded-tr-sm">
										{message.content}
									</div>
								{/if}
							</div>
						{:else}
							<div class="max-w-full self-start flex flex-col group/msg">
								<!-- Sequential steps -->
								{#if message.steps && message.steps.length > 0}
									{#each message.steps as step, idx}
										{#if step.kind === 'tool-call'}
											<ToolCallStep
												name={step.name}
												args={step.args}
												status={step.status}
												result={step.result}
											/>
										{:else if step.kind === 'thinking'}
											<ThinkingBlock content={step.content} />
										{:else if step.kind === 'text'}
											{@const segments = parseMarkdown(step.content)}
											<div class="pt-1 break-words thaana prose-chat">
												{#each segments as seg}
													{#if seg.type === 'html'}
														{@html seg.content}
													{:else}
														<CodeBlock code={seg.code} language={seg.language} />
													{/if}
												{/each}
											</div>
										{/if}
										<!-- artifact steps are NOT rendered inline — shown as download bar below -->
									{/each}
								{:else if message.content}
									{@const segments = parseMarkdown(message.content)}
									<div class="pt-1 break-words thaana prose-chat">
										{#each segments as seg}
											{#if seg.type === 'html'}
												{@html seg.content}
											{:else}
												<CodeBlock code={seg.code} language={seg.language} />
											{/if}
										{/each}
									</div>
								{/if}

								<!-- Artifact download bar(s) at bottom of message -->
								{#if (message.steps || []).some(s => s.kind === 'artifact')}
									<div class="flex flex-col gap-2 mt-3">
										{#each (message.steps || []).filter(s => s.kind === 'artifact') as art}
											{#if art.kind === 'artifact'}
												<!-- svelte-ignore a11y_no_static_element_interactions -->
												<div
													onclick={() => openArtifact(art)}
													class="group/artifact w-full flex items-center rounded-lg border border-border/40 hover:border-border/70
														hover:bg-accent/20 transition-all duration-200 cursor-pointer px-4 overflow-hidden"
													role="button"
													tabindex="0"
												>
													<!-- Doc thumbnail (RTL: appears on right) -->
													<div class="flex items-end w-[72px] relative shrink-0 self-stretch pl-2">
														<div class="absolute left-4 flex overflow-hidden w-[52px] h-[64px] rounded-t-lg border border-border/60
															select-none scale-100 group-hover/artifact:scale-[1.035]
															-rotate-[0.1rad] group-hover/artifact:-rotate-[0.065rad]
															duration-300 ease-out transition-transform translate-y-[10%]
															bg-gradient-to-b from-muted/80 to-muted/20 pt-4 items-start justify-center">
															<FileText class="w-5 h-5 text-muted-foreground" />
														</div>
													</div>
													<!-- Title & type -->
													<div class="flex flex-col gap-1 py-4 min-w-0 flex-1">
														<span class="thaana text-sm font-medium text-foreground truncate leading-tight">{art.label}</span>
														<span class="text-xs text-muted-foreground">
															{getArtifactTypeLabel(art.filename)}
														</span>
													</div>
													<!-- Download button (RTL: appears on left) -->
													<div class="flex items-center shrink-0">
														<button
															onclick={(e) => { e.stopPropagation(); downloadArtifact(art); }}
															class="h-9 px-6 rounded-lg border border-border/50 hover:border-border
																bg-transparent hover:bg-accent/40 text-sm font-medium
																text-foreground transition-all duration-100 active:scale-[0.985] cursor-pointer"
														>
															<span class="thaana">ޑައުންލޯޑް</span>
														</button>
													</div>
												</div>
											{/if}
										{/each}
									</div>
								{/if}

								<!-- Message compose widget(s) -->
								{#if (message.steps || []).some(s => s.kind === 'message-compose')}
									<div class="flex flex-col gap-2 mt-3">
										{#each (message.steps || []).filter(s => s.kind === 'message-compose') as step}
											{#if step.kind === 'message-compose'}
												<MessageCompose data={step.data} />
											{/if}
										{/each}
									</div>
								{/if}

								<!-- Recipe display widget(s) -->
								{#if (message.steps || []).some(s => s.kind === 'recipe-display')}
									<div class="flex flex-col gap-2 mt-3">
										{#each (message.steps || []).filter(s => s.kind === 'recipe-display') as step}
											{#if step.kind === 'recipe-display'}
												<RecipeDisplay data={step.data} />
											{/if}
										{/each}
									</div>
								{/if}

								<!-- Widget display(s) -->
								{#if (message.steps || []).some(s => s.kind === 'show-widget')}
									<div class="flex flex-col gap-2 mt-3">
										{#each (message.steps || []).filter(s => s.kind === 'show-widget') as step}
											{#if step.kind === 'show-widget'}
												<WidgetDisplay data={step.data} onSendPrompt={(text) => handleSend({ message: text })} />
											{/if}
										{/each}
									</div>
								{/if}

								<!-- Copy action -->
								{#if message.content}
									<div class="flex items-center gap-1 mt-1 self-start opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
										<button
											onclick={() => copyMessage(message.id, message.content)}
											class="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
										>
											{#if copiedId === message.id}
												<Check class="w-3.5 h-3.5 text-green-400" />
											{:else}
												<Copy class="w-3.5 h-3.5" />
											{/if}
										</button>
									</div>
								{/if}
							</div>
						{/if}
					{/each}

					<!-- Wave loading indicator -->
					{#if sandboxLoading || running}
						<div class="self-start flex items-center gap-3 px-2 py-3 min-h-[47px]" dir="rtl">
							<svg viewBox="0 0 44 28" width="36" height="23" class="text-primary overflow-visible shrink-0">
								<g clip-path="url(#wave-clip)">
									<path
										d="M-20,8 Q-15,4 -10,8 Q-5,12 0,8 Q5,4 10,8 Q15,12 20,8 Q25,4 30,8 Q35,12 40,8 Q45,4 50,8 Q55,12 60,8"
										fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.7"
									>
										<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="1.5s" repeatCount="indefinite" />
									</path>
									<path
										d="M-20,14 Q-15,10 -10,14 Q-5,18 0,14 Q5,10 10,14 Q15,18 20,14 Q25,10 30,14 Q35,18 40,14 Q45,10 50,14 Q55,18 60,14"
										fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.5"
									>
										<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="2s" repeatCount="indefinite" />
									</path>
									<path
										d="M-20,20 Q-15,16 -10,20 Q-5,24 0,20 Q5,16 10,20 Q15,24 20,20 Q25,16 30,20 Q35,24 40,20 Q45,16 50,20 Q55,24 60,20"
										fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.35"
									>
										<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="2.5s" repeatCount="indefinite" />
									</path>
								</g>
								<defs>
									<clipPath id="wave-clip">
										<rect x="0" y="0" width="44" height="28" />
									</clipPath>
								</defs>
							</svg>
							{#if sandboxStep}
								<TextShimmer class="thaana text-xs" duration={1.5} spread={1.5}>{sandboxStep}</TextShimmer>
							{:else if spinnerVerb}
								<TextShimmer class="thaana text-xs" duration={1.5} spread={1.5}>{spinnerVerb}...</TextShimmer>
							{/if}
						</div>
					{/if}
				</div>
			</div>
		</div>

		<!-- Input -->
		<div class="max-w-[760px] mx-auto w-full shrink-0">
			{#if quotaExhausted}
				<div class="px-4 pt-2 pb-0">
					<span class="thaana text-[10px] text-destructive">ކޯޓާ ހުސްވެއްޖެ</span>
				</div>
			{/if}
			<div class="p-4 pt-2">
				{#if hasPendingInput()}
					{@const q = pendingQuestions[currentQuestionIdx]}
					<!-- User Input Widget — replaces ChatInput -->
					<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
					<div
						bind:this={userInputWidgetEl}
						tabindex="0"
						dir="rtl"
						onkeydown={handleWidgetKeydown}
						class="flex flex-col rounded-[20px] border border-border bg-card/90 backdrop-blur-md
							shadow-[0_0.25rem_1.25rem_hsl(0_0%_0%/7.5%),0_0_0_0.5px_hsla(0_0%_50%/0.15)]
							overflow-hidden pt-4 transition-all duration-200 outline-none"
					>

						<!-- Question header -->
						<div class="flex items-center gap-2 px-5 pb-2" dir="rtl">
							<span class="flex-1 thaana text-sm text-foreground font-medium leading-relaxed">{q.question}</span>

							<!-- Prev/Next for multiple questions -->
							{#if pendingQuestions.length > 1}
								<div class="flex items-center gap-0.5 shrink-0">
									<button
										onclick={() => { if (currentQuestionIdx > 0) currentQuestionIdx--; }}
										disabled={currentQuestionIdx === 0}
										class="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground
											hover:text-foreground disabled:opacity-30 transition-colors"
										aria-label="ކުރީގެ ސުވާލު"
									>
										<ChevronRight class="w-3.5 h-3.5" />
									</button>
									<span class="text-xs text-muted-foreground/50 tabular-nums">
										{currentQuestionIdx + 1} / {pendingQuestions.length}
									</span>
									<button
										onclick={() => { if (currentQuestionIdx < pendingQuestions.length - 1) currentQuestionIdx++; }}
										disabled={currentQuestionIdx >= pendingQuestions.length - 1}
										class="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground
											hover:text-foreground disabled:opacity-30 transition-colors"
										aria-label="ދެން ސުވާލު"
									>
										<ChevronLeft class="w-3.5 h-3.5" />
									</button>
								</div>
							{/if}

							<!-- Dismiss -->
							<button
								onclick={dismissUserInput}
								class="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground
									hover:text-foreground transition-colors shrink-0"
								aria-label="ކެންސަލް"
							>
								<X class="w-4 h-4" />
							</button>
						</div>

						<!-- Options list -->
						<div class="flex-1 p-1.5">
							<div class="flex flex-col">
								{#each q.options as option, optIdx}
									{@const selected = isOptionSelected(currentQuestionIdx, option)}
									{@const focused = focusedOptionIdx === optIdx}
									<div>
										<button
											type="button"
											onclick={() => { focusedOptionIdx = optIdx; toggleOption(currentQuestionIdx, option); }}
											class="group/row flex w-full items-center gap-3 h-14 px-3 cursor-pointer
												rounded-2xl transition-all duration-100 active:scale-[0.99]
												{selected ? 'bg-accent' : focused ? 'bg-accent/30' : 'hover:bg-accent/50'}"
										>
											<!-- Checkbox / Radio indicator -->
											<div class="flex w-[30px] shrink-0 items-center justify-center">
												<div class="w-5 h-5 flex items-center justify-center border rounded
													transition-colors duration-100
													{selected
														? 'bg-primary border-primary'
														: 'bg-card border-border hover:border-muted-foreground/50'}
													{q.type === 'multi_select' ? 'rounded' : 'rounded-full'}"
												>
													{#if selected}
														<Check class="w-3 h-3 text-primary-foreground" />
													{/if}
												</div>
											</div>
											<span class="flex-1 min-w-0 thaana text-sm truncate text-start
												{selected ? 'text-foreground' : 'text-muted-foreground'}">
												{option}
											</span>
										</button>
										<div class="h-px bg-border/30 mx-3"></div>
									</div>
								{/each}

								<!-- "Something else" custom input -->
								<div class="flex w-full items-center gap-3 h-14 px-3
									{focusedOptionIdx === q.options.length ? 'bg-accent/30 rounded-2xl' : ''}">
									<div class="flex w-[30px] shrink-0 items-center justify-center">
										<div class="w-5 h-5 flex items-center justify-center border rounded
											transition-colors duration-100
											{customInputs[currentQuestionIdx]?.trim()
												? 'bg-primary border-primary'
												: 'bg-card border-border'}
											{q.type === 'multi_select' ? 'rounded' : 'rounded-full'}"
										>
											{#if customInputs[currentQuestionIdx]?.trim()}
												<Check class="w-3 h-3 text-primary-foreground" />
											{/if}
										</div>
									</div>
									<input
										data-custom-input
										placeholder="އެހެން ޖަވާބެއް..."
										type="text"
										dir="rtl"
										bind:value={customInputs[currentQuestionIdx]}
										onfocus={() => { focusedOptionIdx = q.options.length; }}
										onkeydown={(e) => {
											if (e.key === 'Enter') { e.preventDefault(); if (canAdvance()) advanceOrSubmit(); }
											else if (e.key === 'Escape') { dismissUserInput(); }
											else if (e.key === 'ArrowUp') { e.preventDefault(); focusedOptionIdx = q.options.length - 1; (e.target as HTMLInputElement).blur(); userInputWidgetEl?.focus(); }
											else if (e.key === 'ArrowDown') { e.preventDefault(); focusedOptionIdx = 0; (e.target as HTMLInputElement).blur(); userInputWidgetEl?.focus(); }
										}}
										class="thaana flex-1 min-w-0 bg-transparent text-sm text-foreground
											placeholder:text-muted-foreground/50 outline-none ring-0 border-0"
									/>
								</div>
							</div>
						</div>

						<!-- Bottom bar -->
						<div class="h-px bg-border/30 mx-0"></div>
						<div class="flex items-center justify-between gap-1 px-5 py-2.5 min-h-[54px]" dir="ltr">
							<span class="thaana text-xs text-muted-foreground">
								{totalSelectedCount()} ހޮވާފައި
							</span>

							<div class="flex items-center gap-2">
								<!-- Skip button -->
								<button
									onclick={dismissUserInput}
									class="thaana h-7 px-3 min-w-[3.5rem] rounded-md text-xs font-medium
										border border-border text-muted-foreground hover:text-foreground
										hover:bg-accent transition-colors active:scale-[0.985]"
								>
									ދޫކޮށްލާ
								</button>

								<!-- Next / Submit button -->
								<button
									onclick={advanceOrSubmit}
									disabled={!canAdvance()}
									class="h-8 w-8 rounded-lg flex items-center justify-center
										transition-colors duration-100 active:scale-95
										{canAdvance()
											? 'bg-foreground text-background hover:bg-foreground/90'
											: 'bg-foreground/30 text-background/60 cursor-default'}"
									aria-label={isLastQuestion() ? 'ފޮނުވާ' : 'ދެން'}
								>
									<ArrowLeft class="w-4 h-4" />
								</button>
							</div>
						</div>
					</div>
				{:else}
					<ChatInput
						bind:this={chatInputRef}
						bind:value={inputValue}
						bind:selectedModel={model}
						{models}
						onSend={handleSend}
						disabled={running || quotaExhausted || sandboxLoading}
						{incognito}
					/>
				{/if}
			</div>
		</div>
	</div>

	<!-- Artifact preview panel (desktop/tablet) -->
	{#if !isMobile}
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			onmousedown={activeArtifact ? onResizeStart : undefined}
			class="shrink-0 relative flex items-center justify-start group transition-[width] duration-250 ease-out overflow-hidden"
			style="width: {activeArtifact ? panelWidth + '%' : '0%'}"
			class:cursor-col-resize={activeArtifact}
		>
			{#if activeArtifact}
				<div class="absolute inset-y-0 left-0 w-px bg-border z-10"></div>
				<div class="absolute left-0 -translate-x-[80%] z-20 w-[7px] h-[18px] rounded-full bg-muted-foreground/50 group-hover:bg-muted-foreground/80 transition-colors top-1/2 -translate-y-1/2"></div>
			{/if}
			<div class="absolute inset-0 pl-4">
				{#if activeArtifact}
					<ArtifactPreview
						artifact={activeArtifact}
						onClose={() => { activeArtifact = null; }}
						onDownload={() => { if (activeArtifact) downloadArtifact(activeArtifact); }}
					/>
				{/if}
			</div>
		</div>
	{/if}
</div>

<!-- Artifact drawer (mobile) -->
{#if isMobile}
	<Drawer.Root open={!!activeArtifact} onOpenChange={(open) => { if (!open) activeArtifact = null; }}>
		<Drawer.Content class="h-[85vh]">
			{#if activeArtifact}
				<div class="flex-1 overflow-hidden min-h-0">
					<ArtifactPreview
						artifact={activeArtifact}
						onClose={() => { activeArtifact = null; }}
						onDownload={() => { if (activeArtifact) downloadArtifact(activeArtifact); }}
					/>
				</div>
			{/if}
		</Drawer.Content>
	</Drawer.Root>
{/if}
