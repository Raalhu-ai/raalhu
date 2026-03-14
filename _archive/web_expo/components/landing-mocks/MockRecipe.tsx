import React, { useState, useEffect, useRef, useMemo } from 'react';

const steps = [
	{
		title: 'މަސް ފުނޑާލާ',
		content: 'ކައްކާފައި ހުރި މަސް\nރީއްޗަށް އަތުން ފުނޑާލާ.\nކަށި ހުރިތޯ ރަނގަޅަށް\nބަލާ ނަގާތި.\nމާ ބޮޑެތި ކޮށް\nނުބަހައްޓާތި',
	},
	{
		title: 'ހުނި ގާނާލާ',
		content: 'ކާށި ހުނި ތުނިކޮށް\nގާނާލާ.\nހުނީގެ ރަހަ ގަދަވާ\nވަރަށް ގާނާތި.\nބޯ ކިރު ފެލާ\nވަކިން ބަހައްޓާ',
	},
	{
		title: 'ފިޔާ ކޮށާލާ',
		content: 'ފިޔާ، ލޮނުމެދު،\nގިތެޔޮ މިރުސް ތުނިކޮށް\nކޮށާލާ.\nކަރަންފޫ ފަތްކޮޅެއް\nވެސް ކުދިކޮށް ކޮށާލާ.\nހިކި މިރުހެއް ވެސް އެޅިދާނެ',
	},
	{
		title: 'އެއްކޮށް މޮޑެލާ',
		content: 'ފުނޑާފައި ހުރި މަހާ،\nހުންޏާ، ފިޔާ އެއްކޮށް\nރީއްޗަށް މޮޑެލާ.\nލުނބޯ ހުތް ޖަހާ،\nލޮނު ހެޔޮވަރު ކޮށްލާ.\nރޮށްޓާ އެކު ކާން ތައްޔާރު',
	},
];

export function MockRecipe() {
	const [currentStep, setCurrentStep] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const completedSteps = useMemo(
		() => new Set(Array.from({ length: currentStep }, (_, i) => i)),
		[currentStep]
	);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !intervalRef.current) {
					intervalRef.current = setInterval(() => {
						setCurrentStep((s) => (s + 1) % steps.length);
					}, 3000);
				}
			},
			{ threshold: 0.3 }
		);
		observer.observe(el);
		return () => {
			observer.disconnect();
			if (intervalRef.current) clearInterval(intervalRef.current);
		};
	}, []);

	return (
		<div ref={containerRef} className="rounded-lg bg-[rgba(30,30,30,0.85)] border border-[#333] overflow-hidden shadow-lg w-full backdrop-blur-sm" dir="rtl">
			<div className="px-4 py-5 flex flex-col gap-3" style={{ height: 195, overflow: 'hidden' }}>
				<div className="thaana text-[7px] text-muted-foreground/50">
					ސްޓެޕް {currentStep + 1} / {steps.length}
				</div>
				<div className="flex items-center gap-2">
					<div className="w-5 h-5 rounded-full flex items-center justify-center text-[7px] shrink-0 transition-colors duration-300 bg-primary/15 text-primary">
						{currentStep + 1}
					</div>
					<span className="thaana-heading text-[11px] text-foreground transition-opacity duration-300">
						{steps[currentStep].title}
					</span>
				</div>
				<p className="thaana text-[9px] leading-[16px] text-foreground/80 transition-opacity duration-300 whitespace-pre-line">
					{steps[currentStep].content}
				</p>
				<div className="flex items-center gap-1 mt-auto pt-2">
					{steps.map((_, idx) => (
						<div
							key={idx}
							className={`w-1.5 h-1.5 rounded-full transition-colors duration-300 ${
								idx === currentStep
									? 'bg-primary'
									: completedSteps.has(idx)
										? 'bg-green-500'
										: 'bg-muted-foreground/30'
							}`}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
