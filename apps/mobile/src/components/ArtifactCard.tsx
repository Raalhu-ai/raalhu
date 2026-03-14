import React from 'react';
import { View, Text, Pressable } from 'react-native';
import * as Sharing from 'expo-sharing';
import Svg, { Path } from 'react-native-svg';

interface ArtifactCardProps {
	uri: string;
	label: string;
	filename: string;
	mimeType: string;
}

export default function ArtifactCard({ uri, label, filename }: ArtifactCardProps) {
	async function handleShare() {
		try {
			const available = await Sharing.isAvailableAsync();
			if (available) {
				await Sharing.shareAsync(uri);
			}
		} catch (err) {
			console.warn('[ArtifactCard] Share failed:', err);
		}
	}

	return (
		<View className="my-2 rounded-xl border border-border bg-card p-3">
			<View className="flex-row items-center justify-between">
				<View className="flex-1 mr-3">
					<Text
						className="text-sm font-medium text-foreground"
						style={{ fontFamily: 'MV Typewriter', writingDirection: 'rtl' }}
						numberOfLines={1}
					>
						{label}
					</Text>
					<Text className="text-xs text-muted-foreground mt-0.5" numberOfLines={1}>
						{filename}
					</Text>
				</View>
				<Pressable
					onPress={handleShare}
					className="flex-row items-center gap-1.5 rounded-lg bg-primary/10 px-3 py-2 active:bg-primary/20"
				>
					<Svg
						width={16}
						height={16}
						viewBox="0 0 24 24"
						fill="none"
						stroke="rgb(125,159,227)"
						strokeWidth={2}
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<Path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
						<Path d="M16 6l-4-4-4 4" />
						<Path d="M12 2v13" />
					</Svg>
					<Text className="text-xs font-medium text-primary">Share</Text>
				</Pressable>
			</View>
		</View>
	);
}
