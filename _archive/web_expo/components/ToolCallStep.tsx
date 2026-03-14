import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { Text } from '@raalhu/ui';
import { Check, X, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { TOOL_LABELS } from '../lib/constants';

interface ToolCallStepProps {
	name: string;
	args: Record<string, unknown>;
	status: 'running' | 'done' | 'error';
	result?: Record<string, unknown> | string;
}

export function ToolCallStep({ name, args, status, result }: ToolCallStepProps) {
	const [expanded, setExpanded] = useState(false);
	const label = TOOL_LABELS[name] || name;

	const StatusIcon = status === 'running' ? Loader2 : status === 'done' ? Check : X;
	const statusColor = status === 'running'
		? 'text-primary'
		: status === 'done'
			? 'text-green-400'
			: 'text-red-400';

	// Description from args
	const description = (args.description as string)
		|| (args.query as string)
		|| (args.path as string)
		|| (args.prompt as string)?.slice(0, 80)
		|| (args.name as string)
		|| '';

	return (
		<View className="my-1">
			<Pressable
				onPress={() => setExpanded(!expanded)}
				className="flex-row items-center gap-2 py-1.5 px-2 rounded-lg bg-card/50 border border-border/30"
			>
				<StatusIcon size={14} className={`${statusColor} ${status === 'running' ? 'animate-spin' : ''}`} />
				<Text variant="thaana" className="text-xs text-foreground font-medium">
					{label}
				</Text>
				{description ? (
					<Text className="text-xs text-muted-foreground flex-1 ms-1" numberOfLines={1}>
						{description}
					</Text>
				) : null}
				<Text variant="muted" className="text-xs ms-auto">
					{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
				</Text>
			</Pressable>

			{expanded && (
				<View className="mt-1 ps-4 border-s-2 border-border/30 ms-3">
					{/* Args */}
					<Text className="text-xs text-muted-foreground font-mono mb-1">
						{JSON.stringify(args, null, 2).slice(0, 500)}
					</Text>
					{/* Result */}
					{result && (
						<View className="mt-1 pt-1 border-t border-border/20">
							<Text className="text-xs text-muted-foreground font-mono">
								{typeof result === 'string'
									? result.slice(0, 500)
									: JSON.stringify(result, null, 2).slice(0, 500)}
							</Text>
						</View>
					)}
				</View>
			)}
		</View>
	);
}
