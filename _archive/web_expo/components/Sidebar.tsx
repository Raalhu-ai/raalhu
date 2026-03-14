import React, { useState, useCallback, useEffect } from 'react';
import { View, Pressable, ScrollView, TextInput } from 'react-native';
import { Text } from '@raalhu/ui';
import type { ChatSession, User, QuotaModel } from '@raalhu/shared';
import { formatRelativeTime, modelDisplayName } from '@raalhu/shared';
import {
	Waves, Plus, PanelLeft, X, MessageSquare, FolderOpen, Sparkles,
	EllipsisVertical, Pencil, Archive, Settings, LogOut, RefreshCw, MessageSquareDashed
} from 'lucide-react';

type Tab = 'chat' | 'projects' | 'artifacts';
type NavAction = 'projects' | 'artifacts';

interface SidebarProps {
	user: User | null;
	sessions: ChatSession[];
	activeSessionId: string | null;
	quotas: QuotaModel[];
	collapsed?: boolean;
	closeMode?: boolean;
	onNewChat: () => void;
	onLoadSession: (id: string) => void;
	onRenameSession: (id: string, title: string) => void;
	onArchiveSession: (id: string) => void;
	onRefreshQuota: () => void;
	onSettings: () => void;
	onLogout: () => void;
	onClose?: () => void;
	onToggleCollapse?: () => void;
	onNavigate?: (action: NavAction) => void;
	selectedModel?: string;
}

function quotaColor(pct: number): string {
	if (pct > 40) return 'bg-gradient-to-r from-primary/80 to-primary';
	if (pct > 15) return 'bg-yellow-500';
	return 'bg-destructive';
}

function formatResetTime(resetTime: string): string {
	if (!resetTime) return '';
	const reset = new Date(resetTime);
	const now = new Date();
	const diffMs = reset.getTime() - now.getTime();
	if (diffMs <= 0) return 'ރީސެޓް ވަނީ...';
	const hours = Math.floor(diffMs / 3600000);
	const minutes = Math.floor((diffMs % 3600000) / 60000);
	const seconds = Math.floor((diffMs % 60000) / 1000);
	if (hours > 0) return `${hours}ގ ${minutes}މ`;
	if (minutes > 0) return `${minutes}މ ${seconds}ސ`;
	return `${seconds}ސ`;
}

export function Sidebar({
	user,
	sessions,
	activeSessionId,
	quotas,
	collapsed = false,
	closeMode = false,
	onNewChat,
	onLoadSession,
	onRenameSession,
	onArchiveSession,
	onRefreshQuota,
	onSettings,
	onLogout,
	onClose,
	onToggleCollapse,
	onNavigate,
	selectedModel = '',
}: SidebarProps) {
	const [activeTab, setActiveTab] = useState<Tab>('chat');
	const [renamingId, setRenamingId] = useState<string | null>(null);
	const [renameValue, setRenameValue] = useState('');
	const [showQuotaDropdown, setShowQuotaDropdown] = useState(false);
	const [countdownText, setCountdownText] = useState('');

	const selectedQuota = quotas.find(q => q.modelId === selectedModel) || quotas[0];
	const selectedPct = selectedQuota ? (selectedQuota.remainingFraction ?? 0) * 100 : 0;

	// Animated countdown timer
	useEffect(() => {
		const resetTime = selectedQuota?.resetTime;
		if (!resetTime) {
			setCountdownText('');
			return;
		}
		function update() {
			setCountdownText(formatResetTime(resetTime!));
		}
		update();
		const interval = setInterval(update, 1000);
		return () => clearInterval(interval);
	}, [selectedQuota?.resetTime]);

	const startRename = useCallback((id: string, currentTitle: string) => {
		setRenamingId(id);
		setRenameValue(currentTitle);
	}, []);

	const submitRename = useCallback((id: string) => {
		if (renameValue.trim() && renamingId) {
			onRenameSession(id, renameValue.trim());
		}
		setRenamingId(null);
	}, [renameValue, renamingId, onRenameSession]);

	if (collapsed) {
		return (
			<div className="w-14 h-full bg-card border-e border-border flex flex-col items-center py-3 gap-3">
				<button onClick={onToggleCollapse} className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
					<Waves className="w-6 h-6 text-primary" />
				</button>
				<div className="h-px w-8 bg-border/50" />
				<button onClick={onNewChat} className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
					<Plus className="w-4 h-4 text-muted-foreground" />
				</button>
				<div className="flex-1" />
				{user && (
					<button onClick={onSettings} className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-accent transition-colors">
						<Settings className="w-4 h-4 text-muted-foreground" />
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="w-[260px] h-full bg-card border-e border-border flex flex-col p-2 gap-3">
			{/* Branding */}
			<div className="flex items-center gap-3 shrink-0 px-2">
				<Waves className="w-10 h-10 text-primary shrink-0" />
				<span className="thaana-heading text-5xl font-normal text-primary" style={{ lineHeight: 1, marginTop: 10, verticalAlign: 'middle' }}>ރާޅު</span>
				<div className="flex-1" />
				<button
					onClick={closeMode ? onClose : onToggleCollapse}
					className="py-1.5 px-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
				>
					{closeMode ? <X className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
				</button>
			</div>

			{/* New Chat button */}
			<button
				onClick={onNewChat}
				className="thaana flex items-center gap-2 w-full px-2 py-2 text-sm text-foreground shrink-0
					rounded-lg hover:bg-accent transition-all duration-150"
			>
				<Plus className="w-4 h-4 shrink-0" />
				އައު ޗެޓް
			</button>

			{/* Navigation links */}
			<div className="flex flex-col gap-0.5 shrink-0">
				<button
					onClick={() => {
						setActiveTab('chat');
						onNewChat();
					}}
					className={`thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg
						transition-all duration-150
						${activeTab === 'chat' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
				>
					<MessageSquare className="w-4 h-4 shrink-0" />
					ޗެޓް
				</button>
				<button
					onClick={() => {
						setActiveTab('projects');
						onNavigate?.('projects');
					}}
					className={`thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg
						transition-all duration-150
						${activeTab === 'projects' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
				>
					<FolderOpen className="w-4 h-4 shrink-0" />
					ޕްރޮޖެކްޓް
				</button>
				<button
					onClick={() => {
						setActiveTab('artifacts');
						onNavigate?.('artifacts');
					}}
					className={`thaana flex items-center gap-2 w-full px-2 py-1.5 text-sm rounded-lg
						transition-all duration-150
						${activeTab === 'artifacts' ? 'text-foreground bg-accent' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'}`}
				>
					<Sparkles className="w-4 h-4 shrink-0" />
					އާޓިފެކްޓް
				</button>
			</div>

			<div className="h-px bg-border shrink-0" />

			{/* Chat History */}
			<div className="flex flex-col flex-1 min-h-0">
				<span className="thaana text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5 shrink-0 px-2">
					ޗެޓް ހިސްޓްރީ
				</span>

				{sessions.length === 0 ? (
					<div className="flex-1 flex flex-col items-center justify-center gap-3">
						<MessageSquareDashed className="w-14 h-14 text-muted-foreground/20" />
						<span className="thaana text-base text-muted-foreground/50">ޗެޓް ތައް</span>
					</div>
				) : (
					<div className="flex-1 overflow-y-auto flex flex-col gap-0.5">
						{sessions.map(session => {
							const isActive = session.id === activeSessionId;
							const isRenaming = renamingId === session.id;

							return (
								<div
									key={session.id}
									className={`group/item flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer
										transition-all duration-150
										${isActive ? 'bg-accent' : 'hover:bg-accent/50'}`}
								>
									{isRenaming ? (
										<input
											autoFocus
											value={renameValue}
											onChange={(e) => setRenameValue(e.target.value)}
											onBlur={() => submitRename(session.id)}
											onKeyDown={(e) => {
												if (e.key === 'Enter') submitRename(session.id);
												if (e.key === 'Escape') setRenamingId(null);
											}}
											className="thaana flex-1 min-w-0 px-1.5 py-0.5 text-xs bg-background border border-border rounded
												text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40"
										/>
									) : (
										<>
											<button
												onClick={() => onLoadSession(session.id)}
												className="flex-1 min-w-0 text-right"
											>
												<div className="thaana text-sm text-foreground truncate">{session.title}</div>
											</button>

											<div className="opacity-0 group-hover/item:opacity-100 transition-opacity duration-150 shrink-0">
												<div className="relative group/menu">
													<button
														onClick={(e) => e.stopPropagation()}
														className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-background/50 transition-colors duration-150 peer"
													>
														<EllipsisVertical className="w-3.5 h-3.5" />
													</button>
													<div className="hidden peer-focus:block hover:block absolute start-0 top-full mt-0.5 w-36 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
														<button
															onClick={(e) => { e.stopPropagation(); startRename(session.id, session.title); }}
															className="thaana flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-accent transition-colors text-right"
														>
															<Pencil className="w-3.5 h-3.5" />
															ނަން ބަދަލުކުރޭ
														</button>
														<button
															onClick={(e) => { e.stopPropagation(); onArchiveSession(session.id); }}
															className="thaana flex items-center gap-2 w-full px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10 transition-colors text-right"
														>
															<Archive className="w-3.5 h-3.5" />
															އާކައިވް
														</button>
													</div>
												</div>
											</div>
										</>
									)}
								</div>
							);
						})}
					</div>
				)}
			</div>

			{/* Bottom: Quota + User */}
			<div className="shrink-0 flex flex-col gap-3 border-t border-border pt-3 px-2">
				{/* Quota bar */}
				{quotas.length > 0 && (
					<button
						onClick={() => setShowQuotaDropdown(!showQuotaDropdown)}
						className="flex flex-col gap-1 w-full cursor-pointer rounded-lg py-1.5
							hover:bg-accent/50 transition-colors duration-150"
					>
						<div className="flex items-center gap-2">
							<div className="flex-1 min-w-0">
								<div className="h-1.5 bg-border rounded-full overflow-hidden">
									<div
										className={`h-full rounded-full transition-all duration-300 ${quotaColor(selectedPct)}`}
										style={{ width: `${selectedPct}%` }}
									/>
								</div>
							</div>
							<span className="text-[11px] tabular-nums text-muted-foreground font-medium shrink-0">
								{Math.round(selectedPct)}%
							</span>
						</div>
						{countdownText && (
							<div className="thaana flex items-center gap-1 text-[10px] text-muted-foreground/70 tabular-nums">
								<span>ރީސެޓް:</span>
								<span>{countdownText}</span>
							</div>
						)}
					</button>
				)}

				{showQuotaDropdown && quotas.length > 0 && (
					<div className="rounded-lg border border-border bg-card p-3">
						<div className="flex items-center justify-between mb-2.5">
							<button
								onClick={onRefreshQuota}
								className="thaana inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] text-muted-foreground
									border border-border rounded-md
									hover:text-foreground hover:border-input hover:bg-accent
									transition-all duration-150"
							>
								<RefreshCw className="w-2.5 h-2.5" />
								ރީފްރެޝް
							</button>
							<span className="thaana text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">ކޯޓާ</span>
						</div>
						<div className="flex flex-col gap-2">
							{quotas.map((q, i) => {
								const pct = (q.remainingFraction ?? 0) * 100;
								const isSelected = q.modelId === selectedModel;
								return (
									<div key={i} className={`text-xs ${isSelected ? 'opacity-100' : 'opacity-70'}`}>
										<div className="flex justify-between mb-0.5 text-muted-foreground">
											<span className={`thaana truncate text-[11px] ${isSelected ? 'text-foreground font-medium' : ''}`}>
												{modelDisplayName(q.modelId)}
											</span>
											<span className="tabular-nums text-[11px] shrink-0 ms-2">{Math.round(pct)}%</span>
										</div>
										<div className="h-1 bg-border rounded-full overflow-hidden">
											<div
												className={`h-full rounded-full transition-all duration-300 ${quotaColor(pct)}`}
												style={{ width: `${pct}%` }}
											/>
										</div>
										{q.resetTime && (
											<span className="text-[9px] text-muted-foreground/60 mt-0.5 block">
												{formatResetTime(q.resetTime)}
											</span>
										)}
									</div>
								);
							})}
						</div>
					</div>
				)}

				{/* User profile */}
				{user ? (
					<div className="flex items-center gap-3">
						{user.picture ? (
							<img src={user.picture} alt="" className="w-7 h-7 rounded-full ring-1 ring-ring/50 shrink-0" />
						) : (
							<div className="w-7 h-7 rounded-full bg-muted shrink-0 flex items-center justify-center">
								<span className="text-xs text-muted-foreground">{user.name?.[0] || '?'}</span>
							</div>
						)}
						<div className="flex-1 min-w-0">
							<div className="text-[12px] text-foreground font-medium truncate">{user.name}</div>
							<div className="text-[10px] text-muted-foreground truncate">{user.email}</div>
						</div>
						<button
							onClick={onSettings}
							className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent
								transition-colors duration-150 shrink-0"
						>
							<Settings className="w-3.5 h-3.5" />
						</button>
						<button
							onClick={onLogout}
							className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent
								transition-colors duration-150 shrink-0"
						>
							<LogOut className="w-3.5 h-3.5" />
						</button>
					</div>
				) : (
					<div className="flex items-center gap-3 animate-pulse">
						<div className="w-7 h-7 rounded-full bg-muted shrink-0" />
						<div className="flex-1 min-w-0 flex flex-col gap-1.5">
							<div className="h-3 bg-muted rounded w-24" />
							<div className="h-2.5 bg-muted rounded w-32" />
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
