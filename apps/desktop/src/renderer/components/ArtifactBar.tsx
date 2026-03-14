import React from 'react';

interface ArtifactBarProps {
	artifact: { label: string; filename: string; mimeType: string; url: string };
	onOpen: () => void;
	onDownload: () => void;
}

function getArtifactTypeLabel(filename: string): string {
	const ext = filename.split('.').pop()?.toUpperCase() || 'FILE';
	if (['DOCX', 'DOC'].includes(ext)) return `Document · ${ext}`;
	if (ext === 'PDF') return `Document · ${ext}`;
	if (['XLSX', 'XLS'].includes(ext)) return `Spreadsheet · ${ext}`;
	if (ext === 'CSV') return `Data · ${ext}`;
	if (['PNG', 'JPG', 'JPEG', 'GIF', 'SVG', 'WEBP'].includes(ext)) return `Image · ${ext}`;
	return `File · ${ext}`;
}

export function ArtifactBar({ artifact, onOpen, onDownload }: ArtifactBarProps) {
	return (
		<button
			onClick={onOpen}
			className="flex items-center rounded-lg border border-border/40 px-4 py-3 active:bg-accent/20
				cursor-pointer bg-transparent w-full text-left"
		>
			{/* Doc thumbnail */}
			<div className="w-[52px] h-[52px] rounded-lg border border-border/60 bg-muted/30 flex items-center justify-center mr-3 shrink-0">
				<span className="text-muted-foreground text-lg">📄</span>
			</div>

			{/* Title & type */}
			<div className="flex-1 flex flex-col gap-1 min-w-0">
				<span className="thaana text-sm font-medium text-foreground truncate">
					{artifact.label}
				</span>
				<span className="text-xs text-muted-foreground">
					{getArtifactTypeLabel(artifact.filename)}
				</span>
			</div>

			{/* Download button */}
			<button
				onClick={(e) => {
					e.stopPropagation();
					onDownload();
				}}
				className="h-9 px-5 rounded-lg border border-border/50 flex items-center justify-center
					active:scale-[0.985] cursor-pointer bg-transparent"
			>
				<span className="thaana text-sm font-medium text-foreground">
					ޑައުންލޯޑް
				</span>
			</button>
		</button>
	);
}
