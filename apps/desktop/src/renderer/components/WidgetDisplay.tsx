import React, { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2, Download } from 'lucide-react';
import type { WidgetData } from '../agent/types';

interface WidgetDisplayProps {
	data: WidgetData;
	onSendPrompt?: (text: string) => void;
}

/* ── Utility CSS injected into every widget ── */
const WIDGET_CSS = `
:root {
  --p: #e4e6eb; --s: #8a8d91; --t: #6b6d71;
  --bg: #242526; --bg2: #2d2e2f; --bg3: #363738;
  --acc: #7d9fe3; --acc-d: #1a3a8a; --b: #3a3b3c;
  --ok: #4ade80; --warn: #fbbf24; --err: #f87171;
  --font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-h: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --radius: 8px;
}
* { box-sizing: border-box; }
.t { font-size: 14px; fill: var(--p); font-family: var(--font); }
.ts { font-size: 12px; fill: var(--s); font-family: var(--font); }
.th { font-size: 14px; fill: var(--p); font-weight: 600; font-family: var(--font); }
.box { fill: var(--bg2); stroke: var(--b); stroke-width: 1; }
.arr { stroke: var(--acc); fill: none; stroke-width: 1.5; }
.leader { stroke: var(--s); stroke-width: 0.5; stroke-dasharray: 4 3; fill: none; }
g.c-blue>rect,g.c-blue>ellipse,g.c-blue>circle,rect.c-blue,ellipse.c-blue,circle.c-blue{fill:#0c447c;stroke:#85b7eb}
.c-blue>.th,.c-blue>.t{fill:#b5d4f4}.c-blue>.ts{fill:#85b7eb}
g.c-teal>rect,g.c-teal>ellipse,g.c-teal>circle,rect.c-teal,ellipse.c-teal,circle.c-teal{fill:#085041;stroke:#5dcaa5}
.c-teal>.th,.c-teal>.t{fill:#9fe1cb}.c-teal>.ts{fill:#5dcaa5}
g.c-coral>rect,g.c-coral>ellipse,g.c-coral>circle,rect.c-coral,ellipse.c-coral,circle.c-coral{fill:#712b13;stroke:#f0997b}
.c-coral>.th,.c-coral>.t{fill:#f5c4b3}.c-coral>.ts{fill:#f0997b}
g.c-purple>rect,g.c-purple>ellipse,g.c-purple>circle,rect.c-purple,ellipse.c-purple,circle.c-purple{fill:#3c3489;stroke:#afa9ec}
.c-purple>.th,.c-purple>.t{fill:#cecbf6}.c-purple>.ts{fill:#afa9ec}
g.c-pink>rect,g.c-pink>ellipse,g.c-pink>circle,rect.c-pink,ellipse.c-pink,circle.c-pink{fill:#72243e;stroke:#ed93b1}
.c-pink>.th,.c-pink>.t{fill:#f4c0d1}.c-pink>.ts{fill:#ed93b1}
g.c-gray>rect,g.c-gray>ellipse,g.c-gray>circle,rect.c-gray,ellipse.c-gray,circle.c-gray{fill:#444441;stroke:#b4b2a9}
.c-gray>.th,.c-gray>.t{fill:#d3d1c7}.c-gray>.ts{fill:#b4b2a9}
g.c-green>rect,g.c-green>ellipse,g.c-green>circle,rect.c-green,ellipse.c-green,circle.c-green{fill:#27500a;stroke:#97c459}
.c-green>.th,.c-green>.t{fill:#c0dd97}.c-green>.ts{fill:#97c459}
g.c-amber>rect,g.c-amber>ellipse,g.c-amber>circle,rect.c-amber,ellipse.c-amber,circle.c-amber{fill:#633806;stroke:#ef9f27}
.c-amber>.th,.c-amber>.t{fill:#fac775}.c-amber>.ts{fill:#ef9f27}
g.c-red>rect,g.c-red>ellipse,g.c-red>circle,rect.c-red,ellipse.c-red,circle.c-red{fill:#791f1f;stroke:#f09595}
.c-red>.th,.c-red>.t{fill:#f7c1c1}.c-red>.ts{fill:#f09595}
.node { cursor: pointer; }
.node:hover > rect, .node:hover > ellipse, .node:hover > circle, .node:hover > .box { filter: brightness(1.3); }
.node:hover text { opacity: 0.8; }
h1,h2,h3,h4,h5,h6 { color: var(--p); font-family: var(--font-h); }
input:not([type="range"]):not([type="checkbox"]):not([type="radio"]),select,textarea{width:100%;height:36px;padding:8px 12px;font-size:14px;font-family:var(--font);background:var(--bg);color:var(--p);border:1px solid var(--b);border-radius:6px;outline:none;transition:border-color .15s}
textarea{height:auto;min-height:80px;resize:vertical}
input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):hover,select:hover,textarea:hover{border-color:var(--s)}
input:not([type="range"]):not([type="checkbox"]):not([type="radio"]):focus,select:focus,textarea:focus{border-color:var(--acc);box-shadow:0 0 0 3px rgba(125,159,227,.2)}
select{cursor:pointer}
input[type="range"]{-webkit-appearance:none;appearance:none;width:100%;height:4px;background:rgba(255,255,255,.1);border-radius:2px;outline:none}
input[type="range"]::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;background:var(--bg2);border:1px solid var(--b);cursor:pointer;transition:border-color .15s,transform .15s}
input[type="range"]:hover::-webkit-slider-thumb{border-color:var(--acc);transform:scale(1.1)}
input[type="range"]::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--bg2);border:1px solid var(--b);cursor:pointer}
button{padding:8px 16px;font-size:14px;background:transparent;color:var(--p);border:1px solid var(--b);border-radius:var(--radius);cursor:pointer;transition:background .15s,transform .1s;font-family:var(--font)}
button:hover{background:var(--bg2)}button:active{background:var(--b);transform:scale(.98)}`;

const MARKER_SVG = `<svg style="position:absolute;width:0;height:0" aria-hidden="true"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10z" fill="#7d9fe3"/></marker></defs></svg>`;

const RESIZE_SCRIPT = `new ResizeObserver(function(){var h=document.documentElement.scrollHeight;window.parent.postMessage({type:'widget-resize',height:h},'*')}).observe(document.body);`;
const SEND_PROMPT_SCRIPT = `function sendPrompt(t){window.parent.postMessage({type:'widget-send-prompt',text:t},'*')}`;

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
<style>${WIDGET_CSS}
html, body { margin: 0; padding: 16px; background: var(--bg); display: flex; align-items: center; justify-content: center; min-height: 100%; font-family: var(--font); }
svg { max-width: 100%; height: auto; }
</style></head>
<body>${MARKER_SVG}${data.widget_code}
<script>${RESIZE_SCRIPT}</script>
</body></html>`;
		} else {
			const trimmed = data.widget_code.trimStart().toLowerCase();
			if (trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
				html = data.widget_code
					.replace(/<head([^>]*)>/i, `<head$1><style>${WIDGET_CSS}</style>`)
					.replace(/<body([^>]*)>/i, `<body$1>${MARKER_SVG}`);
			} else {
				html = `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<style>${WIDGET_CSS}
html, body { margin: 0; padding: 16px; background: var(--bg); color: var(--p); font-family: var(--font); }
</style></head>
<body>${MARKER_SVG}${data.widget_code}
<script>${SEND_PROMPT_SCRIPT}${RESIZE_SCRIPT}</script>
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
