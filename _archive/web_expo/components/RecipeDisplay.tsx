import React, { useState, useCallback } from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { Text } from '@raalhu/ui';
import { Check, Timer, Lightbulb, CookingPot } from 'lucide-react';
import type { RecipeData } from '../lib/agent/types';
import { RecipeCookingMode } from './RecipeCookingMode';

const UNIT_LABELS: Record<string, string> = {
	g: 'ގްރާމް',
	kg: 'ކިލޯ',
	oz: 'އައުންސް',
	lb: 'ޕައުންޑް',
	ml: 'މިލީ',
	l: 'ލީޓަރ',
	tsp: 'ސައިސަމުސާ',
	tbsp: 'މޭޒުމަތީ ސަމުސާ',
	cup: 'ޖޯޑު',
	fl_oz: 'ފްލޫއިޑް އައުންސް',
	pinch: 'ކުޑަ',
	piece: '',
	'': '',
};

interface RecipeDisplayProps {
	data: RecipeData;
}

export function RecipeDisplay({ data }: RecipeDisplayProps) {
	const baseServings = data.base_servings || 4;
	const [servings, setServings] = useState(baseServings);
	const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
	const [cookingMode, setCookingMode] = useState(false);
	const scale = servings / baseServings;

	const toggleStep = useCallback((id: string) => {
		setCompletedSteps(prev => {
			const next = new Set(prev);
			if (next.has(id)) next.delete(id);
			else next.add(id);
			return next;
		});
	}, []);

	const formatAmount = (amount: number) => {
		const scaled = amount * scale;
		if (scaled === Math.floor(scaled)) return scaled.toString();
		return scaled.toFixed(1);
	};

	return (
		<View className="rounded-xl border border-border bg-card/50 overflow-hidden mt-3" style={{ direction: 'rtl' }}>
			{/* Header */}
			<View className="px-4 py-3 border-b border-border/30">
				<Text variant="thaana-heading" className="text-base font-bold text-foreground">
					{data.title}
				</Text>
				{data.description && (
					<Text variant="thaana" className="text-xs text-muted-foreground mt-1">
						{data.description}
					</Text>
				)}
			</View>

			{/* Servings adjuster */}
			<View className="flex-row items-center gap-3 px-4 py-2.5 border-b border-border/20">
				<Text variant="thaana" className="text-xs text-muted-foreground">ޢަދަދު:</Text>
				<View className="flex-row items-center gap-1.5">
					<Pressable
						onPress={() => servings > 1 && setServings(s => s - 1)}
						className="w-7 h-7 rounded-lg border border-border items-center justify-center"
					>
						<Text className="text-foreground">−</Text>
					</Pressable>
					<Text className="text-sm text-foreground font-medium w-8 text-center">{servings}</Text>
					<Pressable
						onPress={() => setServings(s => s + 1)}
						className="w-7 h-7 rounded-lg border border-border items-center justify-center"
					>
						<Text className="text-foreground">+</Text>
					</Pressable>
				</View>
			</View>

			{/* Ingredients */}
			<View className="px-4 py-3">
				<Text variant="thaana" className="text-sm font-medium text-foreground mb-2">ބާވަތްތައް</Text>
				{data.ingredients.map(ing => (
					<View key={ing.id} className="flex-row items-center gap-2 py-1.5">
						<Text className="text-sm text-foreground min-w-[48px]">
							{formatAmount(ing.amount)}
						</Text>
						{ing.unit && (
							<Text className="text-xs text-muted-foreground min-w-[60px]">
								{UNIT_LABELS[ing.unit] || ing.unit}
							</Text>
						)}
						<Text variant="thaana" className="text-sm text-foreground flex-1">
							{ing.name}
						</Text>
					</View>
				))}
			</View>

			{/* Steps */}
			<View className="px-4 py-3 border-t border-border/20">
				<Text variant="thaana" className="text-sm font-medium text-foreground mb-2">ތައްޔާރުކުރާނެ ގޮތް</Text>
				{data.steps.map((step, idx) => {
					const done = completedSteps.has(step.id);
					return (
						<Pressable
							key={step.id}
							onPress={() => toggleStep(step.id)}
							className={`flex-row gap-3 py-3 ${idx > 0 ? 'border-t border-border/10' : ''}`}
						>
							<View className={`w-6 h-6 rounded-full items-center justify-center shrink-0 mt-0.5
								${done ? 'bg-green-500' : 'border border-border'}`}
							>
								{done ? (
									<Check size={12} className="text-white" />
								) : (
									<Text className="text-xs text-muted-foreground">{idx + 1}</Text>
								)}
							</View>
							<View className="flex-1">
								<Text variant="thaana" className={`text-sm font-medium mb-1 ${done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
									{step.title}
								</Text>
								<Text variant="thaana" className={`text-xs leading-relaxed ${done ? 'text-muted-foreground/60' : 'text-muted-foreground'}`}>
									{step.content}
								</Text>
								{step.timer_seconds && (
									<View className="flex-row items-center gap-1 mt-1.5">
										<Timer size={12} className="text-primary" />
										<Text className="text-xs text-primary">
											{step.timer_seconds >= 60
												? `${Math.floor(step.timer_seconds / 60)} މިނެޓް`
												: `${step.timer_seconds} ސިކުންތު`}
										</Text>
									</View>
								)}
							</View>
						</Pressable>
					);
				})}
			</View>

			{/* Notes */}
			{data.notes && (
				<View className="px-4 py-3 border-t border-border/20 bg-accent/10">
					<Text variant="thaana" className="text-xs text-muted-foreground leading-relaxed">
						<Lightbulb size={12} className="inline text-muted-foreground" /> {data.notes}
					</Text>
				</View>
			)}

			{/* Cook button */}
			<View className="px-4 py-3 border-t border-border/20">
				<Pressable
					onPress={() => setCookingMode(true)}
					className="flex-row items-center justify-center gap-2 py-2.5 rounded-lg bg-primary/10 border border-primary/20"
				>
					<CookingPot size={16} className="text-primary" />
					<Text variant="thaana" className="text-sm font-medium text-primary">ކެއްކަން ފަށާ</Text>
				</Pressable>
			</View>

			{/* Cooking mode overlay */}
			{cookingMode && (
				<RecipeCookingMode
					data={data}
					servings={servings}
					scaleFactor={scale}
					onClose={() => setCookingMode(false)}
				/>
			)}
		</View>
	);
}
