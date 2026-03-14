import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowRight, EllipsisVertical, Pencil, Trash2, Plus, X } from 'lucide-react';
import ChatInput, { type ChatInputSendData } from '../ChatInput';
import type { Project, ProjectFile, ChatSession } from '@raalhu/shared';
import {
	getProject,
	updateProjectInstructions,
	renameProject,
	deleteProject,
	addFileToProject,
	removeFileFromProject,
	getProjectSessions,
	totalFileSizeBytes,
	formatRelativeTime,
} from '@raalhu/shared';

interface ProjectViewProps {
	projectId: string;
	onBack: () => void;
	onStartChat: (text: string) => void;
	onOpenSession: (id: string) => void;
	selectedModel: string;
	onModelChange: (m: string) => void;
	models: string[];
	onRefreshProjects?: () => void;
}

function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ProjectView({
	projectId,
	onBack,
	onStartChat,
	onOpenSession,
	selectedModel,
	onModelChange,
	models,
	onRefreshProjects,
}: ProjectViewProps) {
	const [project, setProject] = useState<Project | null>(null);
	const [sessions, setSessions] = useState<ChatSession[]>([]);
	const [instructions, setInstructions] = useState('');
	const [inputValue, setInputValue] = useState('');
	const [renamingTitle, setRenamingTitle] = useState(false);
	const [renameValue, setRenameValue] = useState('');
	const [editingInstructions, setEditingInstructions] = useState(false);
	const [showMenu, setShowMenu] = useState(false);
	const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	const loadProject = useCallback(async () => {
		const p = await getProject(projectId);
		setProject(p ?? null);
		if (p) {
			setInstructions(p.instructions);
		}
		const s = await getProjectSessions(projectId);
		setSessions(s);
	}, [projectId]);

	useEffect(() => {
		loadProject();
	}, [loadProject]);

	const onInstructionsInput = useCallback((value: string) => {
		setInstructions(value);
		if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
		saveTimerRef.current = setTimeout(async () => {
			await updateProjectInstructions(projectId, value);
		}, 800);
	}, [projectId]);

	const startRename = useCallback(() => {
		setRenameValue(project?.name ?? '');
		setRenamingTitle(true);
		setShowMenu(false);
	}, [project]);

	const submitRename = useCallback(async () => {
		if (renameValue.trim() && project && renameValue.trim() !== project.name) {
			await renameProject(projectId, renameValue.trim());
			await loadProject();
			onRefreshProjects?.();
		}
		setRenamingTitle(false);
	}, [renameValue, project, projectId, loadProject, onRefreshProjects]);

	const handleDelete = useCallback(async () => {
		await deleteProject(projectId);
		onRefreshProjects?.();
		onBack();
	}, [projectId, onRefreshProjects, onBack]);

	const triggerFileUpload = useCallback(async () => {
		try {
			const handles = await (window as any).showOpenFilePicker({ multiple: true });
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
	}, [projectId, loadProject]);

	const handleRemoveFile = useCallback(async (fileId: string) => {
		await removeFileFromProject(projectId, fileId);
		await loadProject();
	}, [projectId, loadProject]);

	const handleSend = useCallback((data: ChatInputSendData) => {
		const trimmed = data.message.trim();
		if (!trimmed) return;
		onStartChat(trimmed);
	}, [onStartChat]);

	const fileSizeUsed = project ? totalFileSizeBytes(project.files) : 0;

	if (!project) return null;

	return (
		<div className="flex flex-col h-full overflow-hidden" dir="rtl">
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-6xl mx-auto px-6 ps-14 lg:ps-6 py-8">
					{/* Back link */}
					<button
						onClick={onBack}
						className="thaana inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
					>
						<ArrowRight className="w-4 h-4" />
						ހުރިހާ ޕްރޮޖެކްޓް
					</button>

					{/* Two-column layout */}
					<div className="flex flex-col lg:flex-row gap-8">
						{/* Left column */}
						<div className="flex-1 min-w-0 flex flex-col gap-5">
							{/* Project name + menu */}
							<div className="flex items-start gap-3 py-4">
								<div className="flex-1 min-w-0">
									{renamingTitle ? (
										<input
											value={renameValue}
											onChange={(e) => setRenameValue(e.target.value)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') { e.preventDefault(); submitRename(); }
												if (e.key === 'Escape') setRenamingTitle(false);
											}}
											onBlur={submitRename}
											autoFocus
											dir="rtl"
											className="thaana w-full px-2 py-1 text-xl bg-background border border-border rounded-lg
												text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
										/>
									) : (
										<>
											<h1 className="thaana text-xl text-foreground">{project.name}</h1>
											{project.instructions && (
												<p className="thaana text-sm text-muted-foreground mt-1">{project.instructions}</p>
											)}
										</>
									)}
								</div>

								<div className="relative">
									<button
										onClick={() => setShowMenu(!showMenu)}
										className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors shrink-0"
									>
										<EllipsisVertical className="w-4 h-4" />
									</button>
									{showMenu && (
										<div className="absolute left-0 top-full mt-1 w-40 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
											<button
												onClick={startRename}
												className="thaana flex items-center gap-2 w-full px-3 py-2 text-xs hover:bg-accent transition-colors text-right"
											>
												<Pencil className="w-3.5 h-3.5" />
												ނަން ބަދަލުކުރޭ
											</button>
											<div className="h-px bg-border mx-2 my-1" />
											<button
												onClick={() => { setShowMenu(false); handleDelete(); }}
												className="thaana flex items-center gap-2 w-full px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors text-right"
											>
												<Trash2 className="w-3.5 h-3.5" />
												ޑިލީޓް
											</button>
										</div>
									)}
								</div>
							</div>

							{/* Chat input */}
							<ChatInput
								value={inputValue}
								onChange={setInputValue}
								selectedModel={selectedModel}
								onModelChange={onModelChange}
								models={models}
								onSend={handleSend}
								placeholder="ޖަވާބު..."
							/>

							{/* Hint text */}
							<div className="border border-border rounded-xl p-8 text-center">
								<h3 className="thaana text-sm text-muted-foreground/50 text-balance">
									ޗެޓެއް ފައްޓަވައިގެން ވާހަކަ ތަރުތީބުކޮށް ޕްރޮޖެކްޓް މައުލޫމާތު ބޭނުންކުރައްވާ.
								</h3>
							</div>

							{/* Sessions */}
							{sessions.length > 0 && (
								<div className="flex flex-col gap-1 mt-2">
									{sessions.map(session => (
										<button
											key={session.id}
											onClick={() => onOpenSession(session.id)}
											className="flex items-center gap-3 px-4 py-3 border border-border rounded-xl
												hover:bg-accent/50 hover:border-border/80 transition-all text-right w-full"
										>
											<div className="flex-1 min-w-0">
												<span className="thaana text-sm text-foreground truncate block">{session.title}</span>
												<span className="text-[10px] text-muted-foreground">{formatRelativeTime(session.updatedAt)}</span>
											</div>
										</button>
									))}
								</div>
							)}
						</div>

						{/* Right column */}
						<div className="w-full lg:w-96 shrink-0 border border-border rounded-2xl flex flex-col lg:mt-4">
							{/* Instructions */}
							<div className="px-5 py-4 mt-1">
								<div className="flex flex-col gap-0.5">
									<div className="h-6 flex items-center justify-between gap-4">
										<h3 className="thaana text-sm font-semibold text-foreground">އިރުޝާދުތައް</h3>
										{!editingInstructions && (
											<button
												onClick={() => setEditingInstructions(true)}
												className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors -me-2"
											>
												<Plus className="w-3.5 h-3.5" />
											</button>
										)}
									</div>
									{editingInstructions ? (
										<>
											<textarea
												value={instructions}
												onChange={(e) => onInstructionsInput(e.target.value)}
												dir="rtl"
												rows={4}
												placeholder="ރާޅު ގެ ޖަވާބުތައް ބައްޓަން ކުރުމަށް އިރުޝާދު ލިޔާށެވެ..."
												autoFocus
												className="thaana w-full mt-2 px-3 py-2.5 bg-background border border-border rounded-lg
													text-foreground text-sm leading-relaxed resize-y
													focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40
													placeholder:text-muted-foreground/40"
											/>
											<div className="flex items-center gap-2 mt-2">
												<button
													onClick={() => setEditingInstructions(false)}
													className="thaana text-xs text-muted-foreground hover:text-foreground transition-colors"
												>
													ނިންމާ
												</button>
											</div>
										</>
									) : instructions ? (
										<button
											onClick={() => setEditingInstructions(true)}
											className="thaana text-sm text-muted-foreground/70 mt-1 text-right w-full hover:text-muted-foreground transition-colors line-clamp-2"
										>
											{instructions}
										</button>
									) : (
										<p className="thaana text-sm text-muted-foreground/40 mt-0.5">
											ރާޅު ގެ ޖަވާބުތައް ބައްޓަން ކުރުމަށް އިރުޝާދު އެޑް ކުރައްވާ
										</p>
									)}
								</div>
							</div>

							<div className="h-[0.5px] w-full bg-border" />

							{/* Files */}
							<div className="px-5 py-4 flex flex-col gap-2 mb-1">
								<div className="h-6 flex items-center justify-between gap-4">
									<h3 className="thaana text-sm font-semibold text-foreground">ފައިލްތައް</h3>
									<button
										onClick={triggerFileUpload}
										className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors -me-2"
									>
										<Plus className="w-3.5 h-3.5" />
									</button>
								</div>

								{project.files.length > 0 ? (
									<div className="flex flex-col gap-1.5">
										{project.files.map(file => (
											<div key={file.id} className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg group/file">
												<div className="flex-1 min-w-0">
													<span className="text-sm text-foreground truncate block">{file.name}</span>
													<span className="text-[10px] text-muted-foreground">{formatFileSize(file.size)}</span>
												</div>
												<button
													onClick={() => handleRemoveFile(file.id)}
													className="p-1 rounded text-muted-foreground hover:text-destructive
														opacity-0 group-hover/file:opacity-100 transition-all shrink-0"
												>
													<X className="w-3.5 h-3.5" />
												</button>
											</div>
										))}
										{fileSizeUsed > 0 && (
											<span className="text-[10px] text-muted-foreground tabular-nums mt-1">
												{formatFileSize(fileSizeUsed)}
											</span>
										)}
									</div>
								) : (
									<div className="flex flex-col items-center justify-center h-40 bg-muted/30 rounded-2xl gap-3">
										<svg viewBox="0 0 80 60" width="80" height="60" className="text-muted-foreground/20">
											<rect x="5" y="8" width="28" height="36" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
											<line x1="11" y1="18" x2="27" y2="18" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
											<line x1="11" y1="24" x2="27" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
											<rect x="26" y="14" width="28" height="36" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
											<line x1="32" y1="24" x2="48" y2="24" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
											<line x1="32" y1="30" x2="48" y2="30" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
											<circle cx="62" cy="22" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
											<line x1="62" y1="17" x2="62" y2="27" stroke="currentColor" strokeWidth="2" />
											<line x1="57" y1="22" x2="67" y2="22" stroke="currentColor" strokeWidth="2" />
										</svg>
										<p className="thaana text-xs text-muted-foreground/50 text-center leading-relaxed max-w-[14.5rem]">
											PDF، ޑޮކިއުމެންޓް، ނުވަތަ ޓެކްސްޓް ފައިލް އެޑް ކުރައްވާ މި ޕްރޮޖެކްޓްގައި ބޭނުންކުރަން.
										</p>
									</div>
								)}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
