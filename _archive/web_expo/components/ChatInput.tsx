import React, { useRef, useCallback, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { View, Pressable, TextInput as RNTextInput } from 'react-native';
import { Text } from '@raalhu/ui';
import { modelDisplayName } from '@raalhu/shared';
import { createVoiceRecorder, type VoiceRecorder, type VoiceState } from '@raalhu/shared';
import {
	Plus, ArrowUp, X, Loader2, Sparkles, Paperclip, Camera, Feather, Check, Mic, Square, Globe, Archive
} from 'lucide-react';

export type StyleId = 'normal' | 'learning' | 'concise' | 'explanatory' | 'formal';

export interface ChatInputSendData {
	message: string;
	files: File[];
	pastedContent: string[];
	webSearchEnabled: boolean;
	style: StyleId;
}

interface ChatInputProps {
	value: string;
	onChangeValue: (v: string) => void;
	selectedModel: string;
	onChangeModel?: (m: string) => void;
	models?: string[];
	onSend: (data: ChatInputSendData) => void;
	disabled?: boolean;
	placeholder?: string;
}

export interface ChatInputHandle {
	focus: () => void;
}

const STYLES: { id: StyleId; label: string }[] = [
	{ id: 'normal', label: 'ނޯމަލް' },
	{ id: 'learning', label: 'ދަސްކުރުން' },
	{ id: 'concise', label: 'ކުރުކޮށް' },
	{ id: 'explanatory', label: 'ތަފްސީލީ' },
	{ id: 'formal', label: 'ރަސްމީ' },
];

export const ChatInput = forwardRef<ChatInputHandle, ChatInputProps>(function ChatInput(
	{
		value,
		onChangeValue,
		selectedModel,
		onChangeModel,
		models = [],
		onSend,
		disabled = false,
		placeholder = 'މެސެޖެއް ލިޔުއްވާ...',
	},
	ref
) {
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [files, setFiles] = useState<File[]>([]);
	const [pastedContent, setPastedContent] = useState<string[]>([]);
	const [isDragging, setIsDragging] = useState(false);
	const [webSearchEnabled, setWebSearchEnabled] = useState(false);
	const [activeStyle, setActiveStyle] = useState<StyleId>('normal');
	const [showPlusMenu, setShowPlusMenu] = useState(false);
	const [showModelMenu, setShowModelMenu] = useState(false);
	const [showStyleMenu, setShowStyleMenu] = useState(false);
	const [voiceState, setVoiceState] = useState<VoiceState>('idle');
	const recorderRef = useRef<VoiceRecorder | null>(null);

	useImperativeHandle(ref, () => ({
		focus: () => textareaRef.current?.focus(),
	}));

	// Close menus on click outside
	const plusMenuRef = useRef<HTMLDivElement>(null);
	const modelMenuRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (showPlusMenu && plusMenuRef.current && !plusMenuRef.current.contains(e.target as Node)) {
				setShowPlusMenu(false);
				setShowStyleMenu(false);
			}
			if (showModelMenu && modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
				setShowModelMenu(false);
			}
		}
		document.addEventListener('click', handleClick);
		return () => document.removeEventListener('click', handleClick);
	}, [showPlusMenu, showModelMenu]);

	useEffect(() => {
		return () => {
			recorderRef.current?.destroy();
		};
	}, []);

	// Auto-resize
	useEffect(() => {
		const el = textareaRef.current;
		if (el) {
			el.style.height = 'auto';
			el.style.height = Math.min(el.scrollHeight, 384) + 'px';
		}
	}, [value]);

	const hasContent = value.trim() || files.length > 0 || pastedContent.length > 0;

	const handleSend = useCallback(() => {
		if (!hasContent || disabled) return;
		onSend({
			message: value,
			files: [...files],
			pastedContent: [...pastedContent],
			webSearchEnabled,
			style: activeStyle,
		});
		onChangeValue('');
		setFiles([]);
		setPastedContent([]);
	}, [value, files, hasContent, disabled, webSearchEnabled, activeStyle, onSend, onChangeValue]);

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	}, [handleSend]);

	const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
		if (e.target.files) {
			setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
		}
		e.target.value = '';
	}, []);

	const handleDrop = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
		if (e.dataTransfer?.files) {
			setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
		}
	}, []);

	const handlePaste = useCallback((e: React.ClipboardEvent) => {
		const items = e.clipboardData?.items;
		if (!items) return;
		const pastedFiles: File[] = [];
		let pastedText = '';
		for (let i = 0; i < items.length; i++) {
			if (items[i].kind === 'file') {
				const file = items[i].getAsFile();
				if (file) pastedFiles.push(file);
			} else if (items[i].kind === 'string' && items[i].type === 'text/plain') {
				pastedText = e.clipboardData?.getData('text/plain') || '';
			}
		}
		if (pastedFiles.length > 0) {
			e.preventDefault();
			setFiles(prev => [...prev, ...pastedFiles]);
		} else if (pastedText && (pastedText.length > 100 || pastedText.includes('\n'))) {
			e.preventDefault();
			setPastedContent(prev => [...prev, pastedText]);
		}
	}, []);

	const takeScreenshot = useCallback(async () => {
		setShowPlusMenu(false);
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
			setFiles(prev => [...prev, file]);
		} catch { /* user cancelled */ }
	}, []);

	const startRecording = useCallback(async () => {
		try {
			const rec = createVoiceRecorder();
			recorderRef.current = rec;
			await rec.start();
			setVoiceState('recording');
		} catch (e: any) {
			console.error('[Voice] start failed:', e);
		}
	}, []);

	const stopRecording = useCallback(async () => {
		setVoiceState('transcribing');
		try {
			const blob = await recorderRef.current!.stop();
		} catch (e) {
			console.error('[Voice] stop failed:', e);
		}
		setVoiceState('idle');
	}, [value, onChangeValue]);

	const cancelRecording = useCallback(() => {
		recorderRef.current?.cancel();
		setVoiceState('idle');
	}, []);

	return (
		<div
			className="relative w-full"
			onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
			onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
			onDrop={handleDrop}
		>
			<div className="flex flex-col rounded-2xl border border-border bg-card
				shadow-sm hover:shadow-md focus-within:shadow-md
				focus-within:border-ring/50
				transition-all duration-200">

				<div className="flex flex-col px-3 pt-3 pb-3 gap-2">
					{/* Pasted content cards */}
					{pastedContent.length > 0 && (
						<div className="flex flex-col gap-1.5 px-1">
							{pastedContent.map((text, i) => (
								<div key={i} className="flex items-start gap-2 px-3 py-2 bg-muted/50 border border-border/50 rounded-lg" dir="rtl">
									<div className="flex-1 min-w-0">
										<span className="thaana text-[10px] text-muted-foreground/60 block mb-0.5">ޕޭސްޓް ކޮންޓެންޓް</span>
										<p className="text-xs text-muted-foreground font-mono truncate" dir="ltr">
											{text.slice(0, 80)}{text.length > 80 ? '...' : ''}
										</p>
									</div>
									<button
										onClick={() => setPastedContent(prev => prev.filter((_, j) => j !== i))}
										className="p-0.5 text-muted-foreground hover:text-foreground transition-colors shrink-0"
									>
										<X className="w-3 h-3" />
									</button>
								</div>
							))}
						</div>
					)}

					{/* File previews */}
					{files.length > 0 && (
						<div className="flex gap-2 overflow-x-auto pb-2 px-1">
							{files.map((f, i) => (
								<div key={i} className="relative group shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-border bg-muted">
									{f.type.startsWith('image/') ? (
										<img src={URL.createObjectURL(f)} alt={f.name} className="w-full h-full object-cover" />
									) : (
										<div className="w-full h-full p-2.5 flex flex-col justify-between">
											<span className="text-[9px] font-medium text-muted-foreground uppercase">
												{f.name.split('.').pop()}
											</span>
											<div>
												<p className="text-[11px] text-foreground truncate">{f.name}</p>
												<p className="text-[9px] text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</p>
											</div>
										</div>
									)}
									<button
										onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
										className="absolute top-1 end-1 p-1 bg-black/50 hover:bg-black/70 rounded-full text-white
											opacity-0 group-hover:opacity-100 transition-opacity"
									>
										<X className="w-3 h-3" />
									</button>
								</div>
							))}
						</div>
					)}

					{/* Textarea */}
					<div className="relative min-h-[2.5rem]">
						<textarea
							ref={textareaRef}
							value={value}
							onChange={(e) => onChangeValue(e.target.value)}
							onKeyDown={handleKeyDown}
							onPaste={handlePaste}
							placeholder={placeholder}
							dir="rtl"
							rows={1}
							style={{ minHeight: '2.5rem', maxHeight: 384 }}
							className="thaana w-full bg-transparent text-foreground text-[18px]
								placeholder:text-muted-foreground resize-none overflow-hidden
								focus:outline-none leading-relaxed px-1 py-1"
							disabled={disabled}
						/>
					</div>

					{/* Action bar */}
					<div className="flex items-center gap-1">
						{/* Plus menu */}
						<div ref={plusMenuRef} className="relative">
							<button
								onClick={() => setShowPlusMenu(!showPlusMenu)}
								className="inline-flex items-center justify-center h-8 w-8 rounded-lg
									text-muted-foreground hover:text-foreground hover:bg-accent
									transition-colors duration-200 active:scale-95"
							>
								<Plus className="w-5 h-5" />
							</button>
							{showPlusMenu && (
								<div className="absolute bottom-full start-0 mb-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
									<button
										onClick={() => { fileInputRef.current?.click(); setShowPlusMenu(false); }}
										className="thaana flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors text-right"
										dir="rtl"
									>
										<Paperclip className="w-5 h-5 shrink-0" />
										ފައިލް ނުވަތަ ފޮޓޯ
									</button>
									<button
										onClick={takeScreenshot}
										className="thaana flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors text-right"
										dir="rtl"
									>
										<Camera className="w-5 h-5 shrink-0" />
										ސްކްރީންޝޮޓް ނަގާ
									</button>
									<div className="h-px bg-border mx-2 my-1" />
									{/* Style submenu */}
									<div className="relative">
										<button
											onClick={() => setShowStyleMenu(!showStyleMenu)}
											className="thaana flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors text-right"
											dir="rtl"
										>
											<Feather className="w-5 h-5 shrink-0" />
											ސްޓައިލް
										</button>
										{showStyleMenu && (
											<div className="absolute end-full top-0 me-1 w-48 bg-card border border-border rounded-lg shadow-lg py-1">
												{STYLES.map(s => (
													<button
														key={s.id}
														onClick={() => { setActiveStyle(s.id); setShowStyleMenu(false); setShowPlusMenu(false); }}
														className={`thaana flex items-center gap-3 w-full px-3 py-2.5 text-sm hover:bg-accent transition-colors text-right
															${activeStyle === s.id ? 'text-primary font-medium' : ''}`}
														dir="rtl"
													>
														<Feather className="w-5 h-5 shrink-0" />
														{s.label}
														{activeStyle === s.id && <Check className="w-5 h-5 ms-auto text-primary" />}
													</button>
												))}
											</div>
										)}
									</div>
								</div>
							)}
						</div>

						{/* Model switcher */}
						{models.length > 0 && (
							<div ref={modelMenuRef} className="relative">
								<button
									onClick={() => setShowModelMenu(!showModelMenu)}
									className="inline-flex items-center gap-1.5 h-8 px-2 rounded-lg
										text-muted-foreground hover:text-foreground hover:bg-accent
										transition-colors duration-200 active:scale-95"
								>
									<Sparkles className="w-4 h-4" />
									<span className="thaana text-[11px] font-medium max-w-[120px] truncate">
										{modelDisplayName(selectedModel)}
									</span>
								</button>
								{showModelMenu && (
									<div className="absolute bottom-full start-0 mb-1 w-56 bg-card border border-border rounded-lg shadow-lg z-50 py-1">
										{models.map(m => (
											<button
												key={m}
												onClick={() => { onChangeModel?.(m); setShowModelMenu(false); }}
												className={`thaana flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-accent transition-colors text-right
													${selectedModel === m ? 'text-foreground font-medium' : 'text-muted-foreground'}`}
												dir="rtl"
											>
												{selectedModel === m && <Check className="w-3.5 h-3.5 text-primary" />}
												{modelDisplayName(m)}
											</button>
										))}
									</div>
								)}
							</div>
						)}

						<div className="flex-1" />

						{/* Active modifier pills */}
						{(webSearchEnabled || activeStyle !== 'normal') && (
							<div className="flex items-center gap-1.5">
								{webSearchEnabled && (
									<span className="thaana inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-primary bg-primary/10 rounded-full border border-primary/20">
										<Globe className="w-3 h-3" />
										ވެބް
									</span>
								)}
								{activeStyle !== 'normal' && (
									<span className="thaana inline-flex items-center gap-1 px-2 py-0.5 text-[10px] text-primary bg-primary/10 rounded-full border border-primary/20">
										<Feather className="w-3 h-3" />
										{STYLES.find(s => s.id === activeStyle)?.label}
									</span>
								)}
							</div>
						)}

						{/* Mic button */}
						{voiceState === 'idle' && (
							<button
								onClick={startRecording}
								disabled={disabled}
								className="inline-flex items-center justify-center h-8 w-8 rounded-xl
									text-muted-foreground hover:text-foreground hover:bg-accent
									transition-colors duration-200 active:scale-95"
							>
								<Mic className="w-4 h-4" />
							</button>
						)}
						{voiceState === 'recording' && (
							<div className="flex items-center gap-1">
								<div className="flex items-center gap-0.5 px-1">
									{[...Array(8)].map((_, i) => (
										<div
											key={i}
											className="w-0.5 bg-red-400 rounded-full animate-pulse"
											style={{ height: 8 + Math.random() * 12, animationDelay: `${i * 0.1}s` }}
										/>
									))}
								</div>
								<button
									onClick={cancelRecording}
									className="inline-flex items-center justify-center h-8 w-8 rounded-xl
										text-muted-foreground hover:text-foreground hover:bg-accent
										transition-colors duration-200"
								>
									<X className="w-4 h-4" />
								</button>
								<button
									onClick={stopRecording}
									className="inline-flex items-center justify-center h-8 w-8 rounded-xl
										bg-red-500 text-white hover:bg-red-600 transition-colors"
								>
									<Square className="w-3.5 h-3.5" />
								</button>
							</div>
						)}
						{voiceState === 'transcribing' && (
							<div className="inline-flex items-center justify-center h-8 w-8">
								<Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
							</div>
						)}

						{/* Send button */}
						<button
							onClick={handleSend}
							disabled={!hasContent || disabled}
							className={`inline-flex items-center justify-center h-8 w-8 rounded-xl
								transition-colors duration-200 active:scale-95
								${hasContent && !disabled
									? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
									: 'text-muted-foreground opacity-50 cursor-default'}`}
						>
							<ArrowUp className="w-4 h-4" />
						</button>
					</div>
				</div>
			</div>

			{/* Drag overlay */}
			{isDragging && (
				<div className="absolute inset-0 bg-primary/5 border-2 border-dashed border-primary rounded-2xl z-50
					flex flex-col items-center justify-center backdrop-blur-sm pointer-events-none">
					<Archive className="w-10 h-10 text-primary mb-2 animate-bounce" />
					<p className="thaana text-primary font-medium">ފައިލް ދޫކޮށްލާ</p>
				</div>
			)}

			{/* Hidden file input */}
			<input
				ref={fileInputRef}
				type="file"
				multiple
				className="hidden"
				onChange={handleFileInput}
			/>
		</div>
	);
});
