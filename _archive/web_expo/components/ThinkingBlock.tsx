import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@raalhu/ui';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface ThinkingBlockProps {
	content?: string;
}

export function ThinkingBlock({ content }: ThinkingBlockProps) {
	const [expanded, setExpanded] = useState(false);

	if (!content) return null;

	return (
		<View className="my-1">
			<Pressable
				onPress={() => setExpanded(!expanded)}
				className="flex-row items-center gap-1.5 py-1"
			>
				<Text variant="muted" className="text-xs">
					{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
				</Text>
				<Text variant="thaana" className="text-xs text-muted-foreground">
					ވިސްނަނީ...
				</Text>
			</Pressable>
			{expanded && (
				<View className="ps-4 border-s-2 border-border/30 ms-1.5">
					<Text className="text-xs text-muted-foreground leading-relaxed font-mono">
						{content}
					</Text>
				</View>
			)}
		</View>
	);
}
