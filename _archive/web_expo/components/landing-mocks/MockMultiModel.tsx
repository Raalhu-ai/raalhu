import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, ChevronDown, Paperclip, Image } from 'lucide-react';

const models = ['Gemini 2.5 Flash', 'Gemini 2.5 Pro', 'Gemini 3 Flash'];

export function MockMultiModel() {
	const [step, setStep] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const currentModel = models[step % models.length];
	const showFile = step % 6 >= 3;
	const fileVisible = step % 6 >= 4;

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !intervalRef.current) {
					intervalRef.current = setInterval(() => {
						setStep((s) => s + 1);
					}, 1500);
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
		<div ref={containerRef} className="rounded-lg bg-[#1a1a1a] border border-[#333] overflow-hidden shadow-lg w-full" dir="ltr">
			<div className="flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-[#333]">
				<Sparkles className="w-3 h-3 text-primary/60 shrink-0" />
				<span className="text-[9px] text-foreground font-mono transition-all duration-300">
					{currentModel}
				</span>
				<ChevronDown className="w-2.5 h-2.5 text-muted-foreground/40 ml-auto shrink-0" />
			</div>
			<div className="p-3" style={{ minHeight: 110 }}>
				{showFile ? (
					<div
						className="flex items-center gap-2 p-2 rounded-lg bg-[#252525] border border-[#333] transition-all duration-500"
						style={{ opacity: fileVisible ? 1 : 0, transform: `translateY(${fileVisible ? 0 : 8}px)` }}
					>
						<Paperclip className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
						<div className="flex-1 min-w-0">
							<div className="h-1.5 w-16 bg-foreground/20 rounded mb-1" />
							<div className="h-1 w-10 bg-muted-foreground/20 rounded" />
						</div>
						<div className="w-8 h-8 rounded bg-primary/10 shrink-0 flex items-center justify-center">
							<Image className="w-3.5 h-3.5 text-primary/40" />
						</div>
					</div>
				) : (
					<div className="space-y-2">
						<div className="flex justify-end">
							<div className="bg-primary/10 rounded-lg px-2.5 py-1.5 max-w-[80%]">
								<div className="h-1 w-20 bg-primary/20 rounded mb-1" />
								<div className="h-1 w-14 bg-primary/20 rounded" />
							</div>
						</div>
						<div className="flex justify-start">
							<div className="bg-[#252525] rounded-lg px-2.5 py-1.5 max-w-[85%]">
								<div className="h-1 w-24 bg-foreground/15 rounded mb-1" />
								<div className="h-1 w-20 bg-foreground/15 rounded mb-1" />
								<div className="h-1 w-16 bg-foreground/15 rounded" />
							</div>
						</div>
					</div>
				)}
			</div>
		</div>
	);
}
