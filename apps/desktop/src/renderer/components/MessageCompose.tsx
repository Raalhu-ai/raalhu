import React, { useState } from 'react';
import type { MessageComposeData } from '../agent/types';

interface MessageComposeProps {
	data: MessageComposeData;
}

export function MessageCompose({ data }: MessageComposeProps) {
	const [activeIdx, setActiveIdx] = useState(0);
	const [copied, setCopied] = useState(false);
	const variant = data.variants[activeIdx];
	if (!variant) return null;

	const copyBody = () => {
		const text = variant.subject ? `Subject: ${variant.subject}\n\n${variant.body}` : variant.body;
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 1500);
	};

	return (
		<div className="rounded-xl border border-border bg-card/50 overflow-hidden mt-3">
			{/* Header */}
			<div className="px-4 py-3 border-b border-border/30" dir="rtl">
				<span className="thaana text-sm font-medium text-foreground block">
					{data.summaryTitle}
				</span>
				<span className="text-xs text-muted-foreground mt-0.5 block">
					{data.kind === 'email' ? 'އީމެއިލް' : data.kind === 'textMessage' ? 'ޓެކްސްޓް މެސެޖް' : 'މެސެޖް'}
				</span>
			</div>

			{/* Variant tabs */}
			{data.variants.length > 1 && (
				<div className="flex px-4 pt-2 gap-1.5" dir="rtl">
					{data.variants.map((v, i) => (
						<button
							key={i}
							onClick={() => setActiveIdx(i)}
							className={`px-3 py-1.5 rounded-lg cursor-pointer border-none
								${activeIdx === i ? 'bg-accent' : 'bg-transparent'}`}
						>
							<span className={`thaana text-xs ${activeIdx === i ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
								{v.label}
							</span>
						</button>
					))}
				</div>
			)}

			{/* Content */}
			<div className="px-4 py-3" dir="rtl">
				{variant.subject && (
					<div className="mb-2 pb-2 border-b border-border/20">
						<span className="text-xs text-muted-foreground mb-0.5 block">Subject:</span>
						<span className="text-sm text-foreground select-text">{variant.subject}</span>
					</div>
				)}
				<span className="text-sm text-foreground leading-relaxed select-text whitespace-pre-wrap">
					{variant.body}
				</span>
			</div>

			{/* Actions */}
			<div className="flex items-center gap-2 px-4 py-2.5 border-t border-border/30">
				<button
					onClick={copyBody}
					className="h-8 px-4 rounded-lg border border-border/50 flex items-center justify-center
						cursor-pointer bg-transparent"
				>
					<span className="text-xs text-foreground">
						{copied ? '✓ ކޮޕީ ވެއްޖެ' : '📋 ކޮޕީ'}
					</span>
				</button>
			</div>
		</div>
	);
}
