import React, { useState, useEffect, useRef, useMemo } from 'react';

const codeLines = [
	{ text: '# fibonacci.py', color: '#676e95' },
	{ text: 'def fib(n):', color: '#c792ea' },
	{ text: '    a, b = 0, 1', color: '#eee' },
	{ text: '    for _ in range(n):', color: '#c792ea' },
	{ text: '        a, b = b, a + b', color: '#eee' },
	{ text: '    return a', color: '#eee' },
	{ text: '', color: '' },
	{ text: 'print(fib(10))', color: '#82aaff' },
];

const totalSteps = codeLines.length + 3;

export function MockCodeExecution() {
	const [step, setStep] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const visibleLines = useMemo(() => codeLines.slice(0, Math.min(step, codeLines.length)), [step]);
	const showOutput = step > codeLines.length + 1;

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
					}, 600);
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
		<div ref={containerRef} className="rounded-lg bg-[rgba(26,26,26,0.85)] border border-[#333] overflow-hidden shadow-lg w-full backdrop-blur-sm" dir="ltr">
			<div className="flex items-center gap-1.5 px-3 py-2 bg-[rgba(37,37,37,0.85)] border-b border-[#333]">
				<div className="w-2.5 h-2.5 rounded-full bg-[#ff5f57]" />
				<div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
				<div className="w-2.5 h-2.5 rounded-full bg-[#28c840]" />
				<span className="ml-2 text-[9px] text-[#888] font-mono">python</span>
			</div>
			<div className="p-3 font-mono text-[10px] leading-[1.7]" style={{ height: 175, overflow: 'hidden' }}>
				{visibleLines.map((line, i) => (
					<div key={i} style={{ color: line.color }}>{line.text || '\u00A0'}</div>
				))}
				{showOutput && (
					<div className="mt-2 pt-2 border-t border-[#333]">
						<span className="text-[#82aaff]">Output: </span>
						<span className="text-[#28c840]">55</span>
					</div>
				)}
				{step <= codeLines.length && (
					<span className="inline-block w-1.5 h-3 bg-[#888] animate-pulse" />
				)}
			</div>
		</div>
	);
}
