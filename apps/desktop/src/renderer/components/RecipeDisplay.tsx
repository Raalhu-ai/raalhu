import React, { useState, useCallback } from 'react';
import type { RecipeData } from '../agent/types';

const UNIT_LABELS: Record<string, string> = {
	g: 'ގްރާމް',
	kg: 'ކިލޯ',
	oz: 'އައުންސް',
	lb: 'ޕައުންޑް',
	ml: 'މިލީ',
	l: 'ލީޓަރ',
	tsp: 'ސައިސަމުސާ',
	tbsp: 'މޭޒުމަތީ ސަމުސާ',
	cup: 'ޖޯޑު',
	fl_oz: 'ފްލޫއިޑް އައުންސް',
	pinch: 'ކުޑަ',
	piece: '',
	'': '',
};

interface RecipeDisplayProps {
	data: RecipeData;
}

export function RecipeDisplay({ data }: RecipeDisplayProps) {
	const baseServings = data.base_servings || 4;
	const [servings, setServings] = useState(baseServings);
	const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
	const scale = servings / baseServings;

	const toggleStep = useCallback((id: string) => {
		setCompletedSteps(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const formatAmount = (amount: number) => {
		const scaled = amount * scale;
		if (scaled === Math.floor(scaled)) return scaled.toString();
		return scaled.toFixed(1);
	};

	return (
		<div className="rounded-xl border border-border bg-card/50 overflow-hidden mt-3" dir="rtl">
			{/* Header */}
			<div className="px-4 py-3 border-b border-border/30">
				<span className="thaana-heading text-base font-bold text-foreground block">
					{data.title}
				</span>
				{data.description && (
					<span className="thaana text-xs text-muted-foreground mt-1 block">
						{data.description}
					</span>
				)}
			</div>

			{/* Servings adjuster */}
			<div className="flex items-center gap-3 px-4 py-2.5 border-b border-border/20">
				<span className="thaana text-xs text-muted-foreground">ޢަދަދު:</span>
				<div className="flex items-center gap-1.5">
					<button
						onClick={() => servings > 1 && setServings(s => s - 1)}
						className="w-7 h-7 rounded-lg border border-border flex items-center justify-center
							cursor-pointer bg-transparent"
					>
						<span className="text-foreground">−</span>
					</button>
					<span className="text-sm text-foreground font-medium w-8 text-center">{servings}</span>
					<button
						onClick={() => setServings(s => s + 1)}
						className="w-7 h-7 rounded-lg border border-border flex items-center justify-center
							cursor-pointer bg-transparent"
					>
						<span className="text-foreground">+</span>
					</button>
				</div>
			</div>

			{/* Ingredients */}
			<div className="px-4 py-3">
				<span className="thaana text-sm font-medium text-foreground mb-2 block">ބާވަތްތައް</span>
				{data.ingredients.map(ing => (
					<div key={ing.id} className="flex items-center gap-2 py-1.5">
						<span className="text-sm text-foreground min-w-[48px]">
							{formatAmount(ing.amount)}
						</span>
						{ing.unit && (
							<span className="text-xs text-muted-foreground min-w-[60px]">
								{UNIT_LABELS[ing.unit] || ing.unit}
							</span>
						)}
						<span className="thaana text-sm text-foreground flex-1">
							{ing.name}
						</span>
					</div>
				))}
			</div>

			{/* Steps */}
			<div className="px-4 py-3 border-t border-border/20">
				<span className="thaana text-sm font-medium text-foreground mb-2 block">ތައްޔާރުކުރާނެ ގޮތް</span>
				{data.steps.map((step, idx) => {
					const done = completedSteps.has(step.id);
					return (
						<button
							key={step.id}
							onClick={() => toggleStep(step.id)}
							className={`flex gap-3 py-3 w-full text-right bg-transparent border-none cursor-pointer
								${idx > 0 ? 'border-t border-border/10' : ''}`}
						>
							<div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5
								${done ? 'bg-green-500' : 'border border-border'}`}
							>
								{done ? (
									<span className="text-xs text-white">✓</span>
								) : (
									<span className="text-xs text-muted-foreground">{idx + 1}</span>
								)}
							</div>
							<div className="flex-1 flex flex-col">
								<span className={`thaana text-sm font-medium mb-1 ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
									{step.title}
								</span>
								<span className={`thaana text-xs leading-relaxed ${done ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
									{step.content}
								</span>
								{step.timer_seconds && (
									<div className="flex items-center gap-1 mt-1.5">
										<span className="text-xs text-primary">⏱</span>
										<span className="text-xs text-primary">
											{step.timer_seconds >= 60
												? `${Math.floor(step.timer_seconds / 60)} މިނެޓް`
												: `${step.timer_seconds} ސިކުންތު`}
										</span>
									</div>
								)}
							</div>
						</button>
					);
				})}
			</div>

			{/* Notes */}
			{data.notes && (
				<div className="px-4 py-3 border-t border-border/20 bg-accent/10">
					<span className="thaana text-xs text-muted-foreground leading-relaxed">
						💡 {data.notes}
					</span>
				</div>
			)}
		</div>
	);
}
