import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Artifact } from '../agent/types';

type PreviewType = 'docx' | 'xlsx' | 'pdf' | 'image' | 'text' | 'none';

interface ArtifactPreviewProps {
	artifact: Artifact;
	onClose: () => void;
	onDownload: () => void;
}

function getExt(filename: string): string {
	return filename.split('.').pop()?.toLowerCase() || '';
}

export function ArtifactPreview({ artifact, onClose, onDownload }: ArtifactPreviewProps) {
	const [previewType, setPreviewType] = useState<PreviewType>('none');
	const [loading, setLoading] = useState(true);
	const [rendering, setRendering] = useState(false);
	const [error, setError] = useState('');
	const [textContent, setTextContent] = useState('');
	const [xlsxSheets, setXlsxSheets] = useState<{ name: string; html: string }[]>([]);
	const [xlsxActiveSheet, setXlsxActiveSheet] = useState(0);
	const docxContainerRef = useRef<HTMLDivElement>(null);
	const docxBufferRef = useRef<ArrayBuffer | null>(null);

	const loadPreview = useCallback(async (art: typeof artifact) => {
		setLoading(true);
		setError('');
		setTextContent('');
		setXlsxSheets([]);
		setXlsxActiveSheet(0);
		setPreviewType('none');
		docxBufferRef.current = null;

		const ext = getExt(art.filename);
		const mime = art.mimeType;

		try {
			if (['docx', 'doc'].includes(ext)) {
				const res = await fetch(art.url);
				docxBufferRef.current = await res.arrayBuffer();
				setPreviewType('docx');
			} else if (['xlsx', 'xls'].includes(ext)) {
				const XLSX = await import('xlsx');
				const res = await fetch(art.url);
				const buf = await res.arrayBuffer();
				const wb = XLSX.read(buf, { type: 'array' });
				setXlsxSheets(wb.SheetNames.map(name => ({
					name,
					html: XLSX.utils.sheet_to_html(wb.Sheets[name])
				})));
				setPreviewType('xlsx');
			} else if (ext === 'csv') {
				const XLSX = await import('xlsx');
				const res = await fetch(art.url);
				const text = await res.text();
				const wb = XLSX.read(text, { type: 'string' });
				setXlsxSheets(wb.SheetNames.map(name => ({
					name,
					html: XLSX.utils.sheet_to_html(wb.Sheets[name])
				})));
				setPreviewType('xlsx');
			} else if (ext === 'pdf') {
				setPreviewType('pdf');
			} else if (mime.startsWith('image/')) {
				setPreviewType('image');
			} else if (
				mime.startsWith('text/') ||
				['txt', 'json', 'md', 'py', 'js', 'html', 'xml'].includes(ext)
			) {
				const res = await fetch(art.url);
				setTextContent(await res.text());
				setPreviewType('text');
			} else {
				setPreviewType('none');
			}
		} catch (err: any) {
			setError(err.message || 'Preview failed');
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		loadPreview(artifact);
	}, [artifact, loadPreview]);

	// Render DOCX when container and buffer are ready
	useEffect(() => {
		if (previewType !== 'docx' || !docxContainerRef.current || !docxBufferRef.current) return;
		setRendering(true);
		(async () => {
			try {
				const { renderAsync } = await import('docx-preview');
				docxContainerRef.current!.innerHTML = '';
				await renderAsync(docxBufferRef.current!, docxContainerRef.current!, undefined, {
					className: 'docx',
					inWrapper: true,
					ignoreWidth: true,
					ignoreHeight: true,
					ignoreFonts: false,
					breakPages: false,
					renderHeaders: true,
					renderFooters: true,
					renderFootnotes: true,
					renderEndnotes: true
				});
			} catch (err: any) {
				setError(err.message || 'DOCX render failed');
			} finally {
				setRendering(false);
			}
		})();
	}, [previewType]);

	const handleDownload = useCallback(async () => {
		if (window.platform?.saveFile) {
			try {
				const res = await fetch(artifact.url);
				const buf = await res.arrayBuffer();
				const base64 = btoa(
					new Uint8Array(buf).reduce((data, byte) => data + String.fromCharCode(byte), '')
				);
				await window.platform.saveFile(base64, artifact.filename);
			} catch {
				onDownload();
			}
		} else {
			onDownload();
		}
	}, [artifact, onDownload]);

	const typeLabel = getExt(artifact.filename).toUpperCase();

	return (
		<div className="flex flex-col h-full bg-background animate-sheet-in border-l border-border">
			{/* Header */}
			<div className="flex items-center gap-2.5 px-4 py-3 border-b border-border shrink-0">
				<div className="flex-1 min-w-0 pr-4 truncate">
					<span className="thaana text-sm font-medium text-foreground">{artifact.label}</span>
					<span className="text-sm text-muted-foreground"> · {typeLabel}</span>
				</div>
				<button
					onClick={handleDownload}
					className="p-1.5 rounded-sm border border-border bg-muted/60 hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
					title="Download"
				>
					⬇
				</button>
				<button
					onClick={() => loadPreview(artifact)}
					className="p-1.5 rounded-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
					title="Refresh"
				>
					↻
				</button>
				<button
					onClick={onClose}
					className="p-1.5 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
					title="Close"
				>
					✕
				</button>
			</div>

			{/* Preview body */}
			<div className="flex-1 overflow-auto relative min-h-0">
				{(loading || rendering) && (
					<div className="flex items-center justify-center h-full">
						<span className="animate-spin text-muted-foreground text-xl">⟳</span>
					</div>
				)}

				{!loading && !rendering && error && (
					<div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground">
						<span className="thaana text-sm">ފައިލް ލޯޑެއް ނުކުރެވުނު</span>
						<button
							onClick={onDownload}
							className="thaana px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
						>
							ޑައުންލޯޑް
						</button>
					</div>
				)}

				{previewType === 'docx' && (
					<div
						ref={docxContainerRef}
						className="docx-host"
						style={{ display: loading || rendering || error ? 'none' : 'flex' }}
					/>
				)}

				{previewType === 'xlsx' && !loading && !error && (
					<>
						{xlsxSheets.length > 1 && (
							<div className="sticky top-0 z-10 flex gap-0.5 px-3 pt-2 pb-1 bg-background border-b border-border">
								{xlsxSheets.map((sheet, idx) => (
									<button
										key={idx}
										onClick={() => setXlsxActiveSheet(idx)}
										className={`px-3 py-1.5 text-xs rounded-t-md transition-colors
											${idx === xlsxActiveSheet ? 'bg-muted text-foreground font-medium' : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'}`}
									>
										{sheet.name}
									</button>
								))}
							</div>
						)}
						<div
							className="xlsx-host p-4 overflow-auto"
							dangerouslySetInnerHTML={{ __html: xlsxSheets[xlsxActiveSheet]?.html || '' }}
						/>
					</>
				)}

				{previewType === 'pdf' && !loading && !error && (
					<iframe
						src={artifact.url}
						className="w-full h-full border-0"
						title={artifact.label}
					/>
				)}

				{previewType === 'image' && !loading && !error && (
					<div className="flex items-center justify-center p-6 h-full">
						<img
							src={artifact.url}
							alt={artifact.label}
							className="max-w-full max-h-full object-contain rounded"
						/>
					</div>
				)}

				{previewType === 'text' && !loading && !error && (
					<div className="p-5">
						<pre className="text-sm text-foreground font-mono whitespace-pre-wrap leading-relaxed">{textContent}</pre>
					</div>
				)}

				{previewType === 'none' && !loading && !error && (
					<div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
						<span className="text-4xl opacity-40">📄</span>
						<span className="text-sm">Preview not available</span>
						<button
							onClick={onDownload}
							className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm hover:bg-primary/90 transition-colors"
						>
							Download
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
