import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@raalhu/ui';
import { Check, Clipboard } from 'lucide-react';
import type { MessageComposeData } from '../lib/agent/types';

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
		<View className="rounded-xl border border-border bg-card/50 overflow-hidden mt-3">
			{/* Header */}
			<View className="px-4 py-3 border-b border-border/30" style={{ direction: 'rtl' }}>
				<Text variant="thaana" className="text-sm font-medium text-foreground">
					{data.summaryTitle}
				</Text>
				<Text className="text-xs text-muted-foreground mt-0.5">
					{data.kind === 'email' ? 'އީމެއިލް' : data.kind === 'textMessage' ? 'ޓެކްސްޓް މެސެޖް' : 'މެސެޖް'}
				</Text>
			</View>

			{/* Variant tabs */}
			{data.variants.length > 1 && (
				<View className="flex-row px-4 pt-2 gap-1.5" style={{ direction: 'rtl' }}>
					{data.variants.map((v, i) => (
						<Pressable
							key={i}
							onPress={() => setActiveIdx(i)}
							className={`px-3 py-1.5 rounded-lg ${activeIdx === i ? 'bg-accent' : 'bg-transparent'}`}
						>
							<Text variant="thaana" className={`text-xs ${activeIdx === i ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
								{v.label}
							</Text>
						</Pressable>
					))}
				</View>
			)}

			{/* Content */}
			<View className="px-4 py-3" style={{ direction: 'rtl' }}>
				{variant.subject && (
					<View className="mb-2 pb-2 border-b border-border/20">
						<Text className="text-xs text-muted-foreground mb-0.5">Subject:</Text>
						<Text className="text-sm text-foreground" selectable>{variant.subject}</Text>
					</View>
				)}
				<Text className="text-sm text-foreground leading-relaxed" selectable>
					{variant.body}
				</Text>
			</View>

			{/* Actions */}
			<View className="flex-row items-center gap-2 px-4 py-2.5 border-t border-border/30">
				<Pressable
					onPress={copyBody}
					className="h-8 px-4 rounded-lg border border-border/50 items-center justify-center"
				>
					<Text className="text-xs text-foreground">
						{copied ? <><Check size={12} className="inline" /> ކޮޕީ ވެއްޖެ</> : <><Clipboard size={12} className="inline" /> ކޮޕީ</>}
					</Text>
				</Pressable>
			</View>
		</View>
	);
}
