import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Download } from 'lucide-react';
import type { WidgetData } from '../lib/agent/types';

interface WidgetDisplayProps {
	data: WidgetData;
	onSendPrompt?: (text: string) => void;
}

export function WidgetDisplay({ data, onSendPrompt }: WidgetDisplayProps) {
	const iframeRef = useRef<HTMLIFrameElement>(null);
	const [expanded, setExpanded] = useState(false);
	const [height, setHeight] = useState(300);

	useEffect(() => {
		const iframe = iframeRef.current;
		if (!iframe) return;

		let html: string;
		if (data.mode === 'svg') {
			html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
html, body { margin: 0; padding: 16px; background: #242526; display: flex; align-items: center; justify-content: center; min-height: 100%; }
svg { max-width: 100%; height: auto; }
</style></head>
<body>${data.widget_code}
<script>
new ResizeObserver(function() {
	var h = document.documentElement.scrollHeight;
	window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
}).observe(document.body);
</script>
</body></html>`;
		} else {
			const trimmed = data.widget_code.trimStart().toLowerCase();
			if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
				html = data.widget_code;
			} else {
				html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>
html, body { margin: 0; padding: 16px; background: #242526; color: #e4e6eb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
* { box-sizing: border-box; }
</style></head>
<body>${data.widget_code}
<script>
function sendPrompt(text) {
	window.parent.postMessage({ type: 'widget-send-prompt', text: text }, '*');
}
new ResizeObserver(function() {
	var h = document.documentElement.scrollHeight;
	window.parent.postMessage({ type: 'widget-resize', height: h }, '*');
}).observe(document.body);
</script>
</body></html>`;
			}
		}

		const blob = new Blob([html], { type: 'text/html' });
		iframe.src = URL.createObjectURL(blob);

		return () => {
			if (iframe.src.startsWith('blob:')) URL.revokeObjectURL(iframe.src);
		};
	}, [data.widget_code, data.mode]);

	useEffect(() => {
		const handler = (e: MessageEvent) => {
			if (e.data?.type === 'widget-resize') {
				setHeight(Math.min(Math.max(e.data.height + 32, 200), 800));
			}
			if (e.data?.type === 'widget-send-prompt' && onSendPrompt) {
				onSendPrompt(e.data.text);
			}
		};
		window.addEventListener('message', handler);
		return () => window.removeEventListener('message', handler);
	}, [onSendPrompt]);

	const handleDownload = () => {
		const ext = data.mode === 'svg' ? 'svg' : 'html';
		const mime = data.mode === 'svg' ? 'image/svg+xml' : 'text/html';
		const blob = new Blob([data.widget_code], { type: mime });
		const a = document.createElement('a');
		a.href = URL.createObjectURL(blob);
		a.download = `${data.title}.${ext}`;
		a.click();
		URL.revokeObjectURL(a.href);
	};

	return (
		<div className={`mt-3 rounded-xl border border-border overflow-hidden bg-[#242526] ${expanded ? 'fixed inset-4 z-50' : ''}`}>
			<div className="flex items-center justify-between px-3 py-1.5 bg-accent/30 border-b border-border">
				<span className="text-xs text-muted-foreground font-mono">{data.title}</span>
				<div className="flex items-center gap-1">
					<button
						onClick={handleDownload}
						className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
					>
						<Download size={14} />
					</button>
					<button
						onClick={() => setExpanded(!expanded)}
						className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
					>
						{expanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
					</button>
				</div>
			</div>
			<iframe
				ref={iframeRef}
				sandbox="allow-scripts"
				className="w-full border-0"
				style={{ height: expanded ? 'calc(100% - 36px)' : height }}
			/>
		</div>
	);
}
