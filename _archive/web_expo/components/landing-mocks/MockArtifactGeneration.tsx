import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Download } from 'lucide-react';

const bodyLines = [
	'އައްސަލާމު ޢަލައިކުމް،',
	'މިސިޓީ ލިޔަނީ ވަޒީފާއަށް އެދި.',
	'އަޅުގަނޑަކީ ކޮމްޕިއުޓަރ ސައިންސް',
	'ދާއިރާއިން ޑިގްރީ ހާސިލުކޮށްފައިވާ',
	'ފަރާތެއް ކަމުގައި ދެންނެވީމެވެ.',
];

const totalSteps = bodyLines.length + 3;

export function MockArtifactGeneration() {
	const [step, setStep] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const visibleBody = useMemo(() => bodyLines.slice(0, Math.max(0, step - 1)), [step]);
	const showTitle = step >= 1;
	const showDownload = step > bodyLines.length + 1;
	const boldActive = step > 2;
	const italicActive = step > 4;

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !intervalRef.current) {
					intervalRef.current = setInterval(() => {
						setStep((s) => {
							const next = s + 1;
							return next > totalSteps + 2 ? 0 : next;
						});
					}, 700);
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
			<div className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(37,37,37,0.85)] border-b border-[#333]">
				<div className="flex gap-1">
					<div className={`w-4 h-3 rounded-sm transition-colors duration-300 ${boldActive ? 'bg-primary/40' : 'bg-[#444]'}`} />
					<div className={`w-4 h-3 rounded-sm transition-colors duration-300 ${italicActive ? 'bg-primary/40' : 'bg-[#444]'}`} />
					<div className="w-4 h-3 rounded-sm bg-[#444]" />
				</div>
				<div className="ms-auto flex items-center gap-1">
					<Download className="w-3 h-3 text-muted-foreground/50" />
					<span className="text-[8px] text-muted-foreground/50 font-mono" dir="ltr">DOCX</span>
				</div>
			</div>
			<div className="p-4" style={{ height: 170, overflow: 'hidden' }}>
				{showTitle && <div className="thaana-heading text-sm mb-2 text-foreground">ރަސްމީ ސިޓީ</div>}
				{visibleBody.map((line, i) => (
					<div key={i} className="thaana text-[10px] text-muted-foreground leading-[1.8]">{line}</div>
				))}
				{step > 0 && step <= bodyLines.length + 1 && (
					<span className="inline-block w-0.5 h-2.5 bg-primary animate-pulse" />
				)}
				{showDownload && (
					<div className="mt-3 pt-2 border-t border-[#333] flex justify-center">
						<div className="flex items-center gap-1 px-2 py-1 rounded bg-primary/10 text-primary text-[8px] thaana">
							ޑައުންލޯޑް
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
