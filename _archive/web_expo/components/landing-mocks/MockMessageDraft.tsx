import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Copy } from 'lucide-react';

const messages = [
	'އައްސަލާމު ޢަލައިކުމް، މިސިޓީ ލިޔަނީ ވަޒީފާއަށް އެދި ހުށައެޅުމުގެ ގޮތުން.',
	'ޝުކުރިއްޔާ، ބައްދަލުވުން ކެންސަލް ވީ ވާހަކަ ދެންނެވީމެވެ.',
];

export function MockMessageDraft() {
	const [charIndex, setCharIndex] = useState(0);
	const [messageIndex, setMessageIndex] = useState(0);
	const containerRef = useRef<HTMLDivElement>(null);
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
	const startedRef = useRef(false);

	const currentMessage = messages[messageIndex];
	const typedText = useMemo(() => currentMessage.slice(0, charIndex), [currentMessage, charIndex]);

	useEffect(() => {
		const el = containerRef.current;
		if (!el) return;
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry.isIntersecting && !startedRef.current) {
					startedRef.current = true;
					startTyping();
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

	function startTyping() {
		let ci = 0;
		let mi = 0;
		function typeLoop() {
			intervalRef.current = setInterval(() => {
				ci++;
				setCharIndex(ci);
				if (ci >= messages[mi].length) {
					clearInterval(intervalRef.current!);
					setTimeout(() => {
						ci = 0;
						mi = (mi + 1) % messages.length;
						setCharIndex(0);
						setMessageIndex(mi);
						typeLoop();
					}, 2000);
				}
			}, 60);
		}
		typeLoop();
	}

	return (
		<div ref={containerRef} className="rounded-lg bg-[#1e1e1e] border border-[#333] overflow-hidden shadow-lg w-full" dir="rtl">
			<div className="flex gap-1 p-1.5 border-b border-[#333]">
				<div className="px-2 py-1 rounded-full bg-primary/10 border border-primary/25">
					<span className="text-[7px] text-primary thaana">ރަސްމީ</span>
				</div>
				<div className="px-2 py-1 rounded-full border border-transparent">
					<span className="text-[7px] text-muted-foreground thaana">އާދައިގެ</span>
				</div>
				<div className="px-2 py-1 rounded-full border border-transparent">
					<span className="text-[7px] text-muted-foreground thaana">އެކުވެރި</span>
				</div>
			</div>
			<div className="p-3" style={{ minHeight: 90 }}>
				<p className="thaana text-[9px] text-foreground leading-[1.9]">
					{typedText}<span className="inline-block w-0.5 h-2.5 bg-primary animate-pulse" />
				</p>
			</div>
			<div className="flex items-center justify-end gap-1.5 px-2 py-1.5 border-t border-[#333]">
				<div className="w-5 h-5 rounded border border-[#444] flex items-center justify-center">
					<Copy className="w-2.5 h-2.5 text-muted-foreground/40" />
				</div>
			</div>
		</div>
	);
}
