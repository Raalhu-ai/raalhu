import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useChat, Chat } from '@ai-sdk/react';
import { lastAssistantMessageIsCompleteWithToolCalls } from 'ai';
import type { UIMessage } from 'ai';
import ChatInput, { type ChatInputSendData } from '../ChatInput';
import { UserInputWidget } from './UserInputWidget';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallStep } from './tool-renderers';
import { MessageContent } from './MessageContent';
import { ArtifactBar } from './ArtifactBar';
import { ArtifactPreview } from './ArtifactPreview';
import { MessageCompose } from './MessageCompose';
import { RecipeDisplay } from './RecipeDisplay';
import { WidgetDisplay } from './WidgetDisplay';
import { WaveIndicator } from './WaveIndicator';
import { FileText } from 'lucide-react';
import { PyodideSandbox } from '../agent/sandbox';
import { GeminiChatTransport } from '../agent/gemini-transport';
import { executeToolCall } from '../agent/executor';
import { getSystemPrompt } from '../agent/prompt';
import { SPINNER_VERBS, TOOL_VERBS } from '../agent/constants';
import type { UserInputQuestion, MessageComposeData, RecipeData, WidgetData, Artifact } from '../agent/types';
import {
	updateSessionTitle,
	saveAgentMessages, saveAgentFS, loadAgentFS,
} from '@raalhu/shared';
import { fetchWithRetry } from '../agent/retry';

interface AgentChatProps {
	model: string;
	onModelChange: (m: string) => void;
	models: string[];
	quotaExhausted: boolean;
	sessionId: string;
	initialMessages: UIMessage[];
	initialUserMessage?: string;
	title: string;
	onRename: (title: string) => void;
	onRefreshSessions: () => void;
}

/** Extract text content from a UIMessage */
function getMessageText(msg: UIMessage): string {
	return msg.parts
		.filter((p): p is { type: 'text'; text: string } => p.type === 'text')
		.map((p) => p.text)
		.join('');
}

/** Map DynamicToolUIPart state to ToolCallStep status */
function toolState(state: string): 'running' | 'done' | 'error' {
	if (state === 'output-available') return 'done';
	if (state === 'output-error') return 'error';
	return 'running';
}

/** Desktop title generation via /api/generate (no /api/title endpoint) */
async function fetchDesktopTitle(message: string): Promise<string> {
	try {
		const res = await fetchWithRetry('/api/generate', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: 'gemini-2.0-flash',
				contents: [{
					role: 'user',
					parts: [{ text: `Generate a short title (max 6 words) in Dhivehi (Thaana script) for a chat that starts with this message. Return ONLY the title, nothing else:\n\n${message}` }]
				}],
				generationConfig: { maxOutputTokens: 50 }
			})
		});
		if (!res.ok) return '';
		const data = await res.json();
		const candidate = data?.candidates?.[0] || data?.response?.candidates?.[0];
		const text = candidate?.content?.parts?.[0]?.text?.trim() || '';
		return text.slice(0, 60);
	} catch {
		return '';
	}
}

export function AgentChat({
	model,
	onModelChange,
	models,
	quotaExhausted,
	sessionId,
	initialMessages,
	initialUserMessage = '',
	title,
	onRename,
	onRefreshSessions,
}: AgentChatProps) {
	const [inputValue, setInputValue] = useState('');
	const [spinnerVerb, setSpinnerVerb] = useState('');
	const [sandboxLoading, setSandboxLoading] = useState(false);
	const [sandboxStep, setSandboxStep] = useState('');
	const [pendingQuestions, setPendingQuestions] = useState<UserInputQuestion[]>([]);
	const [copiedId, setCopiedId] = useState<string | null>(null);
	const [renamingTitle, setRenamingTitle] = useState(false);
	const [renameValue, setRenameValue] = useState('');
	const [activeArtifact, setActiveArtifact] = useState<Artifact | null>(null);
	const [artifactMap, setArtifactMap] = useState<Record<string, Artifact>>({});

	const messagesRef = useRef<HTMLDivElement>(null);
	const sandboxRef = useRef<PyodideSandbox>(new PyodideSandbox());
	const verbTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const titleRequestedRef = useRef(initialMessages.length > 0);
	const firstUserMessageRef = useRef<string>('');

	// Create transport (stable ref)
	const transportRef = useRef<GeminiChatTransport>();
	if (!transportRef.current) {
		transportRef.current = new GeminiChatTransport({
			model,
			systemInstruction: {
				role: 'user',
				parts: [{ text: getSystemPrompt() }]
			}
		});
	}

	// Update model on transport when it changes
	useEffect(() => {
		transportRef.current!.setModel(model);
	}, [model]);

	// Create Chat instance (stable ref)
	const chatInstanceRef = useRef<Chat<UIMessage>>();
	if (!chatInstanceRef.current) {
		chatInstanceRef.current = new Chat({
			transport: transportRef.current,
			messages: initialMessages,
			onToolCall: async ({ toolCall }) => {
				const sandbox = sandboxRef.current;
				if (!sandbox.ready) {
					setSandboxLoading(true);
					await sandbox.init();
					setSandboxLoading(false);
					setSandboxStep('');
				}

				const toolName = toolCall.toolName;
				const toolCallId = toolCall.toolCallId;
				const args = (toolCall as any).input as Record<string, unknown> || {};

				// Update spinner verb for this tool
				if (verbTimerRef.current) clearInterval(verbTimerRef.current);
				verbTimerRef.current = null;
				setSpinnerVerb(TOOL_VERBS[toolName] || 'ޕްރޮސެސްކުރަނީ');

				if (toolName === 'ask_user_input') {
					const rawQuestions = ((args as any).questions as any[]) || [];
					const questions: UserInputQuestion[] = rawQuestions.map((q: any) => ({
						question: q.question || '',
						options: q.options || [],
						type: q.type || 'single_select'
					}));
					setPendingQuestions(questions);

					chatInstanceRef.current!.addToolOutput({
						tool: toolName as any,
						toolCallId,
						output: { success: true, message: 'Questions presented to user. Their response will follow as the next user message.' }
					});
					return;
				}

				try {
					const { response, artifact } = await executeToolCall(
						sandbox,
						toolName,
						args as Record<string, unknown>
					);

					if (artifact) {
						setArtifactMap((prev) => ({
							...prev,
							[toolCallId]: artifact
						}));
					}

					chatInstanceRef.current!.addToolOutput({
						tool: toolName as any,
						toolCallId,
						output: artifact ? { ...response, _artifact: artifact } : response
					});
				} catch (err: any) {
					chatInstanceRef.current!.addToolOutput({
						state: 'output-error',
						tool: toolName as any,
						toolCallId,
						errorText: err.message
					});
				}

				startVerbCycle();
			},
			onFinish: async ({ message, messages: allMessages }) => {
				stopVerbCycle();

				// Persist messages
				await saveAgentMessages(sessionId, allMessages);

				// Persist FS
				try {
					const sandbox = sandboxRef.current;
					if (sandbox.ready) {
						const fs = await sandbox.snapshotFS();
						if (Object.keys(fs).length > 0) await saveAgentFS(sessionId, fs);
					}
				} catch {}

				// Generate title for first message
				if (!titleRequestedRef.current && firstUserMessageRef.current) {
					titleRequestedRef.current = true;
					const aiTitle = await fetchDesktopTitle(firstUserMessageRef.current);
					if (aiTitle) {
						await updateSessionTitle(sessionId, aiTitle);
						onRename(aiTitle);
						onRefreshSessions();
					}
				}
				onRefreshSessions();
			},
			onError: (error) => {
				stopVerbCycle();
				console.error('[AgentChat] Error:', error);
			},
			sendAutomaticallyWhen: ({ messages: msgs }) => {
				if (!lastAssistantMessageIsCompleteWithToolCalls({ messages: msgs })) {
					return false;
				}

				const lastMsg = msgs[msgs.length - 1];
				if (lastMsg?.role === 'assistant') {
					const toolParts = lastMsg.parts.filter(
						(p) => p.type === 'dynamic-tool'
					) as any[];
					if (toolParts.some((p: any) => p.toolName === 'ask_user_input')) {
						return false;
					}
				}

				return true;
			}
		});
	}

	const {
		messages,
		sendMessage,
		status,
	} = useChat({ chat: chatInstanceRef.current, experimental_throttle: 32 });

	const running = status === 'streaming' || status === 'submitted';

	// Scroll to bottom on new messages
	useEffect(() => {
		if (messagesRef.current) {
			messagesRef.current.scrollTop = messagesRef.current.scrollHeight;
		}
	}, [messages, running]);

	// Init: restore FS from IndexedDB
	useEffect(() => {
		sandboxRef.current.onProgress = (step: string) => setSandboxStep(step);

		(async () => {
			if (initialMessages.length > 0) {
				const fsSnapshot = await loadAgentFS(sessionId);
				if (fsSnapshot) {
					setSandboxLoading(true);
					try {
						await sandboxRef.current.init();
						await sandboxRef.current.restoreFS(fsSnapshot);
					} catch (err) {
						console.error('[AgentChat] FS restore failed:', err);
					} finally {
						setSandboxLoading(false);
						setSandboxStep('');
					}

					// Reconstruct blob URLs for artifact tool outputs
					const newArtifacts: Record<string, Artifact> = {};
					for (const msg of initialMessages) {
						if (msg.role !== 'assistant') continue;
						for (const part of msg.parts) {
							if (part.type !== 'dynamic-tool') continue;
							const tp = part as any;
							if (tp.state !== 'output-available') continue;
							if (tp.toolName !== 'present_file') continue;
							const output = tp.output as any;
							if (!output?._artifact) continue;
							const fname = output._artifact.filename;
							const matchingPath = Object.keys(fsSnapshot).find(
								(p) => p.endsWith('/' + fname) || p === fname
							);
							if (matchingPath && fsSnapshot[matchingPath]) {
								try {
									const bin = atob(fsSnapshot[matchingPath]);
									const bytes = new Uint8Array(bin.length);
									for (let i = 0; i < bin.length; i++)
										bytes[i] = bin.charCodeAt(i);
									const blob = new Blob([bytes], {
										type: output._artifact.mimeType || 'application/octet-stream'
									});
									newArtifacts[tp.toolCallId] = {
										url: URL.createObjectURL(blob),
										label: output._artifact.label,
										filename: fname,
										mimeType: output._artifact.mimeType
									};
								} catch { /* skip */ }
							}
						}
					}
					if (Object.keys(newArtifacts).length > 0) {
						setArtifactMap(newArtifacts);
					}
				}
			}

			// Auto-send initial message
			if (initialUserMessage && initialMessages.length === 0) {
				firstUserMessageRef.current = initialUserMessage;
				handleSend({ message: initialUserMessage, files: [], pastedContent: [], webSearchEnabled: false, style: 'normal' });
			}
		})();

		return () => {
			stopVerbCycle();
			sandboxRef.current.destroy();
		};
	}, [sessionId]);

	function startVerbCycle() {
		let idx = Math.floor(Math.random() * SPINNER_VERBS.length);
		setSpinnerVerb(SPINNER_VERBS[idx]);
		verbTimerRef.current = setInterval(() => {
			idx = (idx + 1) % SPINNER_VERBS.length;
			setSpinnerVerb(SPINNER_VERBS[idx]);
		}, 3000);
	}

	function stopVerbCycle() {
		if (verbTimerRef.current) {
			clearInterval(verbTimerRef.current);
			verbTimerRef.current = null;
		}
		setSpinnerVerb('');
	}

	const handleSend = useCallback(
		async (data: ChatInputSendData | string) => {
			const text = typeof data === 'string' ? data : data.message;
			const trimmed = text.trim();
			if (!trimmed || running || quotaExhausted) return;

			if (!firstUserMessageRef.current) {
				firstUserMessageRef.current = trimmed;
			}

			const sandbox = sandboxRef.current;
			if (!sandbox.ready) {
				setSandboxLoading(true);
				try {
					await sandbox.init();
				} catch (err: any) {
					setSandboxLoading(false);
					setSandboxStep('');
					return;
				}
				setSandboxStep('');
			}

			setSandboxLoading(false);
			startVerbCycle();
			setInputValue('');

			// Convert attached files to FileUIPart[] (data URLs)
			const files = typeof data !== 'string' && data.files?.length
				? await Promise.all(
					data.files.map(async (af) => {
						const buf = await af.file.arrayBuffer();
						const bytes = new Uint8Array(buf);
						let binary = '';
						for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
						const b64 = btoa(binary);
						return {
							type: 'file' as const,
							mediaType: af.file.type || 'application/octet-stream',
							filename: af.file.name,
							url: `data:${af.file.type || 'application/octet-stream'};base64,${b64}`,
						};
					})
				)
				: undefined;

			await sendMessage({ text: trimmed, files });
		},
		[running, quotaExhausted, sendMessage]
	);

	const copyMessage = (id: string, content: string) => {
		navigator.clipboard.writeText(content);
		setCopiedId(id);
		setTimeout(() => setCopiedId(null), 1500);
	};

	const downloadArtifact = async (art: Artifact) => {
		if (window.platform?.saveFile) {
			try {
				const res = await fetch(art.url);
				const buf = await res.arrayBuffer();
				const base64 = btoa(
					new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), '')
				);
				await window.platform.saveFile(base64, art.filename);
				return;
			} catch { /* fallback below */ }
		}
		const a = document.createElement('a');
		a.href = art.url;
		a.download = art.filename;
		a.click();
	};

	const submitRename = () => {
		if (renameValue.trim() && renameValue.trim() !== title) {
			onRename(renameValue.trim());
		}
		setRenamingTitle(false);
	};

	return (
		<div className="flex-1 flex min-w-0 h-full">
			<div className="flex-1 flex flex-col min-w-0">
				{/* Top bar */}
				<div className="px-5 py-3 z-10">
					{renamingTitle ? (
						<input
							autoFocus
							value={renameValue}
							onChange={(e) => setRenameValue(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter') submitRename();
								if (e.key === 'Escape') setRenamingTitle(false);
							}}
							onBlur={submitRename}
							className="thaana flex-1 min-w-0 px-2 py-1 text-sm bg-background border border-border rounded-lg
								text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
						/>
					) : (
						<div className="flex items-center gap-1">
							<button
								onClick={() => {
									setRenameValue(title);
									setRenamingTitle(true);
								}}
								className="thaana text-sm text-muted-foreground hover:bg-accent px-2 py-1 rounded-lg transition-colors"
							>
								{title || 'އޭޖެންޓް'}
							</button>
						</div>
					)}
				</div>

				{/* Messages */}
				<div className="flex-1 overflow-hidden relative">
					<div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-background to-transparent z-[5] pointer-events-none" />
					<div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent z-[5] pointer-events-none" />
					<div ref={messagesRef} className="h-full overflow-y-auto">
						<div className="max-w-[760px] mx-auto p-5 flex flex-col gap-2.5">
							{messages.map((message) => {
								if (message.role === 'user') {
									const text = getMessageText(message);
									const fileParts = message.parts.filter((p) => p.type === 'file') as any[];
									return (
										<div
											key={message.id}
											className="animate-fade-in-up max-w-[65%] self-start"
											style={{ direction: 'rtl' }}
										>
											{fileParts.length > 0 && (
												<div className="flex flex-wrap gap-2 mb-2">
													{fileParts.map((fp: any, i: number) => {
														const isImage = fp.mediaType?.startsWith('image/');
														return isImage ? (
															<img
																key={i}
																src={fp.url}
																alt={fp.filename || 'attachment'}
																className="max-w-[200px] max-h-[200px] rounded-lg border border-primary/20 object-cover"
															/>
														) : (
															<div key={i} className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 border border-primary/20 rounded-lg text-xs text-muted-foreground">
																<FileText className="w-3.5 h-3.5" />
																<span>{fp.filename || 'file'}</span>
															</div>
														);
													})}
												</div>
											)}
											<div className="px-3.5 py-2.5 break-words thaana text-[18.5px] leading-[45px] bg-primary/10 border border-primary/20 rounded-[14px] rounded-tr-sm">
												{text}
											</div>
										</div>
									);
								}

								const text = getMessageText(message);
								const toolParts = message.parts.filter(
									(p) => p.type === 'dynamic-tool'
								) as any[];
								const artifactToolParts = toolParts.filter(
									(p: any) =>
										p.toolName === 'present_file' &&
										p.state === 'output-available'
								);
								const composeToolParts = toolParts.filter(
									(p: any) =>
										p.toolName === 'message_compose' &&
										p.state === 'output-available'
								);
								const recipeToolParts = toolParts.filter(
									(p: any) =>
										p.toolName === 'recipe_display' &&
										p.state === 'output-available'
								);
								const widgetToolParts = toolParts.filter(
									(p: any) =>
										p.toolName === 'show_widget' &&
										p.state === 'output-available'
								);

								return (
									<div
										key={message.id}
										className="max-w-full self-start flex flex-col group/msg"
										style={{ direction: 'rtl' }}
									>
										{message.parts.map((part, idx) => {
											if (part.type === 'dynamic-tool') {
												const tp = part as any;
												return (
													<ToolCallStep
														key={idx}
														name={tp.toolName}
														args={
															(tp.input as Record<string, unknown>) || {}
														}
														status={toolState(tp.state)}
														result={
															tp.state === 'output-available'
																? tp.output
																: tp.state === 'output-error'
																	? tp.errorText
																	: undefined
														}
													/>
												);
											}
											if (part.type === 'reasoning') {
												return (
													<ThinkingBlock
														key={idx}
														content={(part as any).text}
													/>
												);
											}
											if (part.type === 'text') {
												return (
													<MessageContent
														key={idx}
														content={(part as any).text}
													/>
												);
											}
											return null;
										})}

										{/* Artifact download bars */}
										{artifactToolParts.length > 0 && (
											<div className="flex flex-col gap-2 mt-3">
												{artifactToolParts.map((tp: any, i: number) => {
													const art =
														artifactMap[tp.toolCallId] ||
														tp.output?._artifact;
													if (!art) return null;
													return (
														<ArtifactBar
															key={i}
															artifact={art}
															onOpen={() => setActiveArtifact(art)}
															onDownload={() => downloadArtifact(art)}
														/>
													);
												})}
											</div>
										)}

										{/* Message compose */}
										{composeToolParts.map((tp: any, i: number) => {
											const output = tp.output;
											if (!output?.variants) return null;
											const data: MessageComposeData = {
												kind: output.kind,
												summaryTitle: output.summary_title,
												variants: output.variants
											};
											return <MessageCompose key={i} data={data} />;
										})}

										{/* Recipe display */}
										{recipeToolParts.map((tp: any, i: number) => {
											const output = tp.output;
											if (!output?.title) return null;
											const data: RecipeData = {
												title: output.title,
												description: output.description,
												ingredients: output.ingredients,
												steps: output.steps,
												base_servings: output.base_servings || 4,
												notes: output.notes
											};
											return <RecipeDisplay key={i} data={data} />;
										})}

										{/* Widget display */}
										{widgetToolParts.map((tp: any, i: number) => {
											const output = tp.output;
											if (!output?.widget_code) return null;
											const wData: WidgetData = {
												title: output.title,
												widget_code: output.widget_code,
												mode: output.mode || 'html'
											};
											return <WidgetDisplay key={i} data={wData} />;
										})}

										{/* Copy button */}
										{text && (
											<div className="flex items-center gap-1 mt-1 self-start opacity-0 group-hover/msg:opacity-100 transition-opacity duration-150">
												<button
													onClick={() => copyMessage(message.id, text)}
													className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
												>
													{copiedId === message.id ? '✓' : '📋'}
												</button>
											</div>
										)}
									</div>
								);
							})}

							{/* Loading indicator */}
							{(sandboxLoading || running) && (
								<WaveIndicator
									verb={spinnerVerb}
									sandboxStep={sandboxStep}
								/>
							)}
						</div>
					</div>
				</div>

				{/* Input area */}
				<div className="max-w-[760px] mx-auto w-full shrink-0">
					{quotaExhausted && (
						<div className="px-4 pt-2">
							<span className="thaana text-[10px] text-destructive">
								ކޯޓާ ހުސްވެއްޖެ
							</span>
						</div>
					)}
					<div className="p-4 pt-2">
						{pendingQuestions.length > 0 ? (
							<UserInputWidget
								questions={pendingQuestions}
								onSubmit={(message) => {
									setPendingQuestions([]);
									handleSend({ message, files: [], pastedContent: [], webSearchEnabled: false, style: 'normal' });
								}}
								onDismiss={() => setPendingQuestions([])}
							/>
						) : (
							<ChatInput
								value={inputValue}
								onChange={setInputValue}
								selectedModel={model}
								onModelChange={onModelChange}
								models={models}
								onSend={handleSend}
								disabled={running || quotaExhausted || sandboxLoading}
								autofocus
							/>
						)}
					</div>
				</div>
			</div>

			{/* Artifact Preview Panel */}
			{activeArtifact && (
				<div className="w-[420px] shrink-0 h-full">
					<ArtifactPreview
						artifact={activeArtifact}
						onClose={() => setActiveArtifact(null)}
						onDownload={() => downloadArtifact(activeArtifact)}
					/>
				</div>
			)}
		</div>
	);
}
