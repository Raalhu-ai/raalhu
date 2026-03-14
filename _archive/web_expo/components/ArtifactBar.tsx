import React from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@raalhu/ui';
import { FileText } from 'lucide-react';
import type { Artifact } from '../lib/agent/types';

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
		<Pressable
			onPress={onOpen}
			className="flex-row items-center rounded-lg border border-border/40 px-4 py-3 active:bg-accent/20"
		>
			{/* Doc thumbnail */}
			<View className="w-[52px] h-[52px] rounded-lg border border-border/60 bg-muted/30 items-center justify-center me-3">
				<FileText size={20} className="text-muted-foreground" />
			</View>

			{/* Title & type */}
			<View className="flex-1 gap-1 min-w-0">
				<Text variant="thaana" className="text-sm font-medium text-foreground" numberOfLines={1}>
					{artifact.label}
				</Text>
				<Text className="text-xs text-muted-foreground">
					{getArtifactTypeLabel(artifact.filename)}
				</Text>
			</View>

			{/* Download button */}
			<Pressable
				onPress={(e) => {
					e.stopPropagation();
					onDownload();
				}}
				className="h-9 px-5 rounded-lg border border-border/50 items-center justify-center active:scale-[0.985]"
			>
				<Text variant="thaana" className="text-sm font-medium text-foreground">
					ޑައުންލޯޑް
				</Text>
			</Pressable>
		</Pressable>
	);
}
