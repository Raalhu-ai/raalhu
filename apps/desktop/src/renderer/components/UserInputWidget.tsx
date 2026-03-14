import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { UserInputQuestion } from '../agent/types';

interface UserInputWidgetProps {
	questions: UserInputQuestion[];
	onSubmit: (message: string) => void;
	onDismiss: () => void;
}

export function UserInputWidget({ questions, onSubmit, onDismiss }: UserInputWidgetProps) {
	const [currentIdx, setCurrentIdx] = useState(0);
	const [selections, setSelections] = useState<Record<number, Set<string>>>({});
	const [customInputs, setCustomInputs] = useState<Record<number, string>>({});
	const [focusedIdx, setFocusedIdx] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);

	const q = questions[currentIdx];
	if (!q) return null;

	const isSelected = (qIdx: number, option: string) => selections[qIdx]?.has(option) ?? false;

	const toggleOption = (qIdx: number, option: string) => {
		setSelections(prev => {
			const current = prev[qIdx] || new Set<string>();
			const q = questions[qIdx];
			if (q?.type === 'multi_select') {
				const next = new Set(current);
				if (next.has(option)) next.delete(option);
				else next.add(option);
				return { ...prev, [qIdx]: next };
			} else {
				return { ...prev, [qIdx]: new Set([option]) };
			}
		});
	};

	const selectedCount = (qIdx: number) =>
		(selections[qIdx]?.size ?? 0) + (customInputs[qIdx]?.trim() ? 1 : 0);

	const totalSelectedCount = () => {
		let count = 0;
		for (let i = 0; i < questions.length; i++) count += selectedCount(i);
		return count;
	};

	const canAdvance = () => selectedCount(currentIdx) > 0;
	const isLast = currentIdx >= questions.length - 1;

	const submit = () => {
		const lines: string[] = [];
		for (let i = 0; i < questions.length; i++) {
			const q = questions[i];
			const selected = Array.from(selections[i] || []);
			const custom = customInputs[i]?.trim();
			if (custom) selected.push(custom);
			if (selected.length === 0) continue;
			lines.push(q.question);
			lines.push(selected.join('، '));
		}
		const message = lines.join('\n');
		if (message.trim()) onSubmit(message);
	};

	const advanceOrSubmit = () => {
		if (!canAdvance()) return;
		if (isLast) submit();
		else setCurrentIdx(prev => prev + 1);
	};

	const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
		const total = q.options.length + 1;
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			setFocusedIdx(prev => (prev + 1) % total);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			setFocusedIdx(prev => (prev - 1 + total) % total);
		} else if (e.key === 'Enter') {
			e.preventDefault();
			if (focusedIdx < q.options.length) {
				toggleOption(currentIdx, q.options[focusedIdx]);
			} else if (canAdvance()) {
				advanceOrSubmit();
			}
		} else if (e.key === 'Escape') {
			onDismiss();
		}
	}, [focusedIdx, currentIdx, q, canAdvance]);

	useEffect(() => {
		setFocusedIdx(0);
	}, [currentIdx]);

	useEffect(() => {
		containerRef.current?.focus();
	}, [questions.length]);

	return (
		<div
			ref={containerRef}
			tabIndex={0}
			dir="rtl"
			onKeyDown={handleKeyDown}
			className="flex flex-col rounded-[20px] border border-border bg-card/90 backdrop-blur-md
				shadow-[0_0.25rem_1.25rem_hsl(0_0%_0%/7.5%),0_0_0_0.5px_hsla(0_0%_50%/0.15)]
				overflow-hidden pt-4 transition-all duration-200 outline-none"
		>
			{/* Question header */}
			<div className="flex items-center gap-2 px-5 pb-2" dir="rtl">
				<span className="flex-1 thaana text-sm text-foreground font-medium leading-relaxed">
					{q.question}
				</span>

				{questions.length > 1 && (
					<div className="flex items-center gap-0.5 shrink-0">
						<button
							onClick={() => currentIdx > 0 && setCurrentIdx(prev => prev - 1)}
							disabled={currentIdx === 0}
							className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground
								hover:text-foreground disabled:opacity-30 transition-colors"
						>
							▶
						</button>
						<span className="text-xs text-muted-foreground/50 tabular-nums">
							{currentIdx + 1} / {questions.length}
						</span>
						<button
							onClick={() => currentIdx < questions.length - 1 && setCurrentIdx(prev => prev + 1)}
							disabled={currentIdx >= questions.length - 1}
							className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground
								hover:text-foreground disabled:opacity-30 transition-colors"
						>
							◀
						</button>
					</div>
				)}

				<button
					onClick={onDismiss}
					className="h-5 w-5 rounded-md flex items-center justify-center text-muted-foreground
						hover:text-foreground transition-colors shrink-0"
				>
					✕
				</button>
			</div>

			{/* Options */}
			<div className="flex-1 p-1.5">
				<div className="flex flex-col">
					{q.options.map((option, optIdx) => {
						const selected = isSelected(currentIdx, option);
						const focused = focusedIdx === optIdx;
						return (
							<div key={optIdx}>
								<button
									onClick={() => { setFocusedIdx(optIdx); toggleOption(currentIdx, option); }}
									className={`flex w-full items-center gap-3 h-14 px-3 cursor-pointer
										rounded-2xl transition-all duration-100 active:scale-[0.99]
										${selected ? 'bg-accent' : focused ? 'bg-accent/30' : 'hover:bg-accent/50'}`}
								>
									<div className="flex w-[30px] shrink-0 items-center justify-center">
										<div className={`w-5 h-5 flex items-center justify-center border transition-colors duration-100
											${selected ? 'bg-primary border-primary' : 'bg-card border-border'}
											${q.type === 'multi_select' ? 'rounded' : 'rounded-full'}`}
										>
											{selected && <span className="text-xs text-primary-foreground">✓</span>}
										</div>
									</div>
									<span className={`flex-1 min-w-0 thaana text-sm truncate text-start
										${selected ? 'text-foreground' : 'text-muted-foreground'}`}>
										{option}
									</span>
								</button>
								<div className="h-px bg-border/30 mx-3" />
							</div>
						);
					})}

					{/* Custom input */}
					<div className={`flex w-full items-center gap-3 h-14 px-3
						${focusedIdx === q.options.length ? 'bg-accent/30 rounded-2xl' : ''}`}>
						<div className="flex w-[30px] shrink-0 items-center justify-center">
							<div className={`w-5 h-5 flex items-center justify-center border transition-colors duration-100
								${customInputs[currentIdx]?.trim() ? 'bg-primary border-primary' : 'bg-card border-border'}
								${q.type === 'multi_select' ? 'rounded' : 'rounded-full'}`}
							>
								{customInputs[currentIdx]?.trim() && <span className="text-xs text-primary-foreground">✓</span>}
							</div>
						</div>
						<input
							placeholder="އެހެން ޖަވާބެއް..."
							type="text"
							dir="rtl"
							value={customInputs[currentIdx] || ''}
							onChange={(e) => setCustomInputs(prev => ({ ...prev, [currentIdx]: e.target.value }))}
							onFocus={() => setFocusedIdx(q.options.length)}
							className="thaana flex-1 min-w-0 bg-transparent text-sm text-foreground
								placeholder:text-muted-foreground/50 outline-none ring-0 border-0"
						/>
					</div>
				</div>
			</div>

			{/* Bottom bar */}
			<div className="h-px bg-border/30 mx-0" />
			<div className="flex items-center justify-between gap-1 px-5 py-2.5 min-h-[54px]" dir="ltr">
				<span className="thaana text-xs text-muted-foreground">
					{totalSelectedCount()} ހޮވާފައި
				</span>
				<div className="flex items-center gap-2">
					<button
						onClick={onDismiss}
						className="thaana h-7 px-3 min-w-[3.5rem] rounded-md text-xs font-medium
							border border-border text-muted-foreground hover:text-foreground
							hover:bg-accent transition-colors active:scale-[0.985]"
					>
						ދޫކޮށްލާ
					</button>
					<button
						onClick={advanceOrSubmit}
						disabled={!canAdvance()}
						className={`h-8 w-8 rounded-lg flex items-center justify-center
							transition-colors duration-100 active:scale-95
							${canAdvance()
								? 'bg-foreground text-background hover:bg-foreground/90'
								: 'bg-foreground/30 text-background/60 cursor-default'}`}
					>
						←
					</button>
				</div>
			</div>
		</div>
	);
}
