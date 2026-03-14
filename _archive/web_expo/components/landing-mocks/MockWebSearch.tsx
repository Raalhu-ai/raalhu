import React, { useState, useEffect, useRef } from 'react';
import { Search } from 'lucide-react';

const results = [
	{ titleWidth: '75%', lineWidth: '100%', line2Width: '60%' },
	{ titleWidth: '65%', lineWidth: '90%', line2Width: '70%' },
	{ titleWidth: '80%', lineWidth: '85%', line2Width: '55%' },
	{ titleWidth: '55%', lineWidth: '95%', line2Width: '65%' },
];

export function MockWebSearch() {
	const [visibleCount, setVisibleCount] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !intervalRef.current) {
					intervalRef.current = setInterval(() => {
						setVisibleCount((s) => {
							const next = s + 1;
							return next > results.length + 3 ? 0 : next;
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
		<div ref={containerRef} className="rounded-lg bg-[#1a1a1a] border border-[#333] overflow-hidden shadow-lg w-full" dir="ltr">
			<div className="flex items-center gap-2 px-3 py-2 bg-[#252525] border-b border-[#333]">
				<Search className="w-3 h-3 text-muted-foreground/40 shrink-0" />
				<div className="flex-1 h-2 bg-[#333] rounded" />
			</div>
			<div className="p-2.5 space-y-2.5" style={{ minHeight: 120 }}>
				{results.map((result, i) => {
					const visible = i < visibleCount;
					return (
						<div
							key={i}
							style={{
								opacity: visible ? 1 : 0,
								transform: `translateY(${visible ? 0 : 8}px)`,
								transition: 'all 0.4s ease-out',
							}}
						>
							<div className="h-1.5 rounded mb-1 bg-primary/30" style={{ width: result.titleWidth }} />
							<div className="h-1 rounded mb-0.5 bg-[#333]" style={{ width: result.lineWidth }} />
							<div className="h-1 rounded bg-[#333]" style={{ width: result.line2Width }} />
						</div>
					);
				})}
			</div>
		</div>
	);
}
