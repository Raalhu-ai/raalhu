import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@raalhu/ui';
import { ChatInput, type ChatInputSendData } from './ChatInput';
import { getGreeting, getFirstName, STARTERS } from '@raalhu/shared';
import {
	FileText, RefreshCw, FileDown, Languages, Search, Globe, Bot
} from 'lucide-react';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
	FileText,
	RefreshCw,
	FileDown,
	Languages,
	Search,
	Globe,
	Bot,
};

interface DashboardProps {
	userName: string;
	model: string;
	onModelChange: (m: string) => void;
	models: string[];
	quotaExhausted: boolean;
	onSend: (data: ChatInputSendData) => void;
}

export function Dashboard({
	userName,
	model,
	onModelChange,
	models,
	quotaExhausted,
	onSend,
}: DashboardProps) {
	const [inputValue, setInputValue] = useState('');
	const greeting = useMemo(() => getGreeting(), []);
	const firstName = useMemo(() => getFirstName(userName), [userName]);

	const starters = STARTERS.filter(s => s.starterText);

	return (
		<div className="flex-1 flex flex-col items-center justify-center min-h-full px-6 py-16">
			{/* Greeting */}
			<div className="animate-greeting-in text-center mb-10 max-w-2xl">
				<h1 className="thaana-heading text-7xl sm:text-8xl font-normal mb-3 leading-none">
					<span className="bg-gradient-to-l from-primary via-primary/80 to-foreground bg-clip-text text-transparent">
						{greeting.heading}{firstName ? `، ${firstName}` : ''}
					</span>
				</h1>
				<p className="thaana text-muted-foreground text-base animate-fade-in" style={{ animationDelay: '200ms' }}>
					{greeting.subtitle}
				</p>
			</div>

			{/* Input */}
			<div className="w-full max-w-2xl mb-6 animate-fade-in-up" style={{ animationDelay: '150ms' }}>
				{quotaExhausted && (
					<div className="mb-2">
						<span className="thaana text-[10px] text-destructive">
							ކޯޓާ ހުސްވެއްޖެ
						</span>
					</div>
				)}
				<ChatInput
					value={inputValue}
					onChangeValue={setInputValue}
					selectedModel={model}
					onChangeModel={onModelChange}
					models={models}
					onSend={onSend}
					disabled={quotaExhausted}
				/>
			</div>

			{/* Starter chips */}
			<div className="flex flex-wrap justify-center gap-2 max-w-2xl animate-fade-in-up" style={{ animationDelay: '300ms' }}>
				{starters.map(starter => {
					const Icon = iconMap[starter.icon];
					return (
						<button
							key={starter.id}
							onClick={() => setInputValue(starter.starterText)}
							className="thaana inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] leading-none
								bg-muted border border-border rounded-full
								hover:border-primary/40 hover:bg-accent
								transition-all duration-150 cursor-pointer
								focus:outline-none focus:ring-2 focus:ring-ring/50"
						>
							{Icon && <Icon className="w-3.5 h-3.5 text-primary/80 shrink-0" />}
							<span className="translate-y-px">{starter.labelDv}</span>
						</button>
					);
				})}
			</div>
		</div>
	);
}
