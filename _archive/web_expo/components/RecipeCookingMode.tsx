import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Check, X, Play, Pause, RotateCcw, CookingPot, ChevronLeft, ChevronRight, ArrowLeft, ArrowRight } from 'lucide-react';
import type { RecipeData } from '../lib/agent/types';

const UNIT_LABELS: Record<string, string> = {
	g: 'ގްރާމް', kg: 'ކިލޯ', oz: 'އައުންސް', lb: 'ޕައުންޑް',
	ml: 'މިލިލީޓަރ', l: 'ލީޓަރ', tsp: 'ސައިސަމުސާ', tbsp: 'މޭޒުމަތީ ސަމުސާ',
	cup: 'ޖޯޑު', fl_oz: 'ފުލުއިޑް އައުންސް', pinch: 'ޕިންޗް', piece: ''
};

interface RecipeCookingModeProps {
	data: RecipeData;
	servings: number;
	scaleFactor: number;
	onClose: () => void;
}

function formatUnit(unit: string): string {
	return UNIT_LABELS[unit] ?? unit;
}

function scaleAmount(amount: number, scaleFactor: number): string {
	const scaled = amount * scaleFactor;
	const frac = scaled % 1;
	if (Math.abs(frac - 0.25) < 0.01) return `${Math.floor(scaled) || ''}¼`.trim();
	if (Math.abs(frac - 0.33) < 0.02) return `${Math.floor(scaled) || ''}⅓`.trim();
	if (Math.abs(frac - 0.5) < 0.01) return `${Math.floor(scaled) || ''}½`.trim();
	if (Math.abs(frac - 0.67) < 0.02) return `${Math.floor(scaled) || ''}⅔`.trim();
	if (Math.abs(frac - 0.75) < 0.01) return `${Math.floor(scaled) || ''}¾`.trim();
	if (Number.isInteger(scaled)) return scaled.toString();
	return parseFloat(scaled.toFixed(2)).toString();
}

function formatTimerDisplay(seconds: number): string {
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export function RecipeCookingMode({ data, servings, scaleFactor, onClose }: RecipeCookingModeProps) {
	const [screen, setScreen] = useState<'intro' | 'step'>('intro');
	const [currentStep, setCurrentStep] = useState(0);
	const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
	const [timerRunning, setTimerRunning] = useState(false);
	const [timerRemaining, setTimerRemaining] = useState(0);
	const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

	function resolveContent(content: string): string {
		return content.replace(/\{([^}]+)\}/g, (_, id) => {
			const ing = data.ingredients.find((i) => i.id === id);
			if (!ing) return `{${id}}`;
			const amt = scaleAmount(ing.amount, scaleFactor);
			const unit = ing.unit ? ' ' + formatUnit(ing.unit) : '';
			return `${amt}${unit} ${ing.name}`;
		});
	}

	const stopTimer = useCallback(() => {
		setTimerRunning(false);
		if (timerRef.current) {
			clearInterval(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const startTimer = useCallback((seconds: number) => {
		stopTimer();
		setTimerRemaining(seconds);
		setTimerRunning(true);
		timerRef.current = setInterval(() => {
			setTimerRemaining(prev => {
				if (prev <= 1) {
					stopTimer();
					return 0;
				}
				return prev - 1;
			});
		}, 1000);
	}, [stopTimer]);

	const resetTimer = useCallback((seconds: number) => {
		stopTimer();
		setTimerRemaining(seconds);
	}, [stopTimer]);

	const initStepTimer = useCallback(() => {
		stopTimer();
		setTimerRemaining(0);
	}, [stopTimer]);

	const startCooking = useCallback(() => {
		setScreen('step');
		setCurrentStep(0);
		initStepTimer();
	}, [initStepTimer]);

	const nextStep = useCallback(() => {
		if (currentStep < data.steps.length - 1) {
			setCurrentStep(prev => prev + 1);
			initStepTimer();
		}
	}, [currentStep, data.steps.length, initStepTimer]);

	const prevStep = useCallback(() => {
		if (currentStep > 0) {
			setCurrentStep(prev => prev - 1);
			initStepTimer();
		}
	}, [currentStep, initStepTimer]);

	const toggleComplete = useCallback((idx: number) => {
		setCompletedSteps(prev => {
			const next = new Set(prev);
			if (next.has(idx)) next.delete(idx);
			else next.add(idx);
			return next;
		});
	}, []);

	const close = useCallback(() => {
		stopTimer();
		onClose();
	}, [stopTimer, onClose]);

	// Keyboard shortcuts
	useEffect(() => {
		const handler = (e: KeyboardEvent) => {
			if (screen !== 'step') return;
			if (e.key === 'ArrowRight') prevStep();
			if (e.key === 'ArrowLeft') nextStep();
			if (e.key === 'Escape') close();
		};
		window.addEventListener('keydown', handler);
		return () => window.removeEventListener('keydown', handler);
	}, [screen, prevStep, nextStep, close]);

	// Cleanup timer on unmount
	useEffect(() => {
		return () => stopTimer();
	}, [stopTimer]);

	const step = data.steps[currentStep];

	return (
		<div className="fixed inset-0 z-50 bg-background flex flex-col" style={{ fontFamily: "'MV Typewriter', sans-serif" }}>
			{/* Top bar */}
			<div className="flex items-center justify-between px-5 py-4 shrink-0">
				{screen === 'step' ? (
					<span className="thaana text-sm text-muted-foreground">
						ސްޓެޕް {currentStep + 1} / {data.steps.length}
					</span>
				) : <div />}
				<button
					onClick={close}
					className="h-8 w-8 rounded-lg flex items-center justify-center hover:bg-accent/60 transition-colors"
				>
					<X size={16} className="text-muted-foreground" />
				</button>
			</div>

			{/* Content */}
			<div className="flex-1 flex items-center justify-center overflow-y-auto px-6">
				<div className="max-w-[560px] w-full">
					{screen === 'intro' ? (
						<div className="flex flex-col items-center text-center gap-5">
							<CookingPot size={48} className="text-muted-foreground" />
							<h2 className="thaana-heading text-2xl text-foreground">{data.title}</h2>
							{data.description && (
								<p className="thaana text-sm text-muted-foreground max-w-md leading-relaxed">{data.description}</p>
							)}
							<div className="flex items-center gap-3 text-xs text-muted-foreground">
								<span>{data.steps.length} ސްޓެޕް</span>
								<span className="text-muted-foreground/40">·</span>
								<span>{servings} ސާވިންގ</span>
							</div>
							<button
								onClick={startCooking}
								className="mt-4 h-11 px-8 rounded-xl bg-primary text-primary-foreground font-medium
									hover:bg-primary/90 transition-colors active:scale-[0.985] thaana text-sm"
							>
								ކެއްކަން ފަށާ
							</button>
						</div>
					) : (
						<div className="flex flex-col gap-5" dir="rtl">
							{/* Step header */}
							<div className="flex items-center gap-3">
								<button
									onClick={() => toggleComplete(currentStep)}
									className={`flex shrink-0 w-9 h-9 rounded-full items-center justify-center transition-colors
										${completedSteps.has(currentStep) ? 'bg-green-500/20 text-green-400' : 'bg-primary/15 text-primary'}`}
								>
									{completedSteps.has(currentStep) ? (
										<Check size={14} />
									) : (
										<span className="text-sm font-bold tabular-nums" style={{ fontFamily: 'system-ui, sans-serif' }}>
											{currentStep + 1}
										</span>
									)}
								</button>
								<h3 className="thaana-heading text-xl text-foreground">{step.title}</h3>
							</div>

							{/* Step content */}
							<p className="thaana text-[20px] leading-[48px] text-foreground/90">
								{resolveContent(step.content)}
							</p>

							{/* Timer */}
							{step.timer_seconds && (
								<div className="flex items-center gap-4 mt-2">
									<span className="text-2xl font-mono text-foreground tabular-nums" dir="ltr">
										{formatTimerDisplay(timerRemaining || step.timer_seconds)}
									</span>
									<div className="flex gap-2">
										{!timerRunning && timerRemaining === 0 ? (
											<button
												onClick={() => startTimer(step.timer_seconds!)}
												className="thaana h-8 px-3.5 rounded-lg bg-primary/15 text-primary text-xs
													hover:bg-primary/25 transition-colors flex items-center gap-1.5"
											>
												<Play size={12} /> ޓައިމަރ ފަށާ
											</button>
										) : timerRunning ? (
											<button
												onClick={stopTimer}
												className="thaana h-8 px-3.5 rounded-lg bg-destructive/15 text-destructive text-xs
													hover:bg-destructive/25 transition-colors flex items-center gap-1.5"
											>
												<Pause size={12} /> ހުއްޓާ
											</button>
										) : (
											<>
												<button
													onClick={() => startTimer(timerRemaining)}
													className="thaana h-8 px-3.5 rounded-lg bg-primary/15 text-primary text-xs
														hover:bg-primary/25 transition-colors flex items-center gap-1.5"
												>
													<Play size={12} /> ކުރިއަށް
												</button>
												<button
													onClick={() => resetTimer(step.timer_seconds!)}
													className="h-8 w-8 rounded-lg border border-muted-foreground/20 text-muted-foreground
														hover:bg-accent/60 transition-colors flex items-center justify-center"
												>
													<RotateCcw size={14} />
												</button>
											</>
										)}
									</div>
								</div>
							)}
						</div>
					)}
				</div>
			</div>

			{/* Bottom nav (step view only) */}
			{screen === 'step' && (
				<div className="flex items-center justify-between px-6 py-5 shrink-0" dir="rtl">
					<button
						onClick={prevStep}
						disabled={currentStep === 0}
						className="thaana h-9 px-4 rounded-lg border border-muted-foreground/20 text-sm text-muted-foreground
							transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-accent/60 flex items-center gap-1.5"
					>
						<ArrowRight size={14} /> ކުރީގެ
					</button>

					{/* Step dots */}
					<div className="flex items-center gap-1.5">
						{data.steps.map((_, idx) => (
							<div
								key={idx}
								className={`w-1.5 h-1.5 rounded-full transition-colors
									${idx === currentStep ? 'bg-primary' : completedSteps.has(idx) ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
							/>
						))}
					</div>

					{currentStep < data.steps.length - 1 ? (
						<button
							onClick={nextStep}
							className="thaana h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-medium
								hover:bg-primary/90 transition-colors active:scale-[0.985] flex items-center gap-1.5"
						>
							ދެން <ArrowLeft size={14} />
						</button>
					) : (
						<button
							onClick={close}
							className="thaana h-9 px-4 rounded-lg bg-green-600 text-white text-sm font-medium
								hover:bg-green-500 transition-colors active:scale-[0.985]"
						>
							ނިމިއްޖެ
						</button>
					)}
				</div>
			)}
		</div>
	);
}
