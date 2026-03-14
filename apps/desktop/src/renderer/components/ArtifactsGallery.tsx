import React, { useState, useEffect, useMemo } from 'react';
import { inspirationCards, type InspirationCard } from '@raalhu/shared';
import { db } from '@raalhu/shared';

type Tab = 'inspiration' | 'artifacts';
type Category = 'all' | 'learn' | 'tips' | 'game' | 'creative' | 'relax';

interface UserArtifact {
	filename: string;
	label: string;
	mimeType: string;
	sessionId: string;
	sessionTitle: string;
}

interface ArtifactsGalleryProps {
	onBack: () => void;
	onSelectCard: (prompt: string) => void;
	onOpenSession: (id: string) => void;
}

const CATEGORY_LABELS: { value: Category; label: string }[] = [
	{ value: 'all', label: 'ހުރިހާ' },
	{ value: 'learn', label: 'ދަސްކުރޭ' },
	{ value: 'tips', label: 'ޓިޕްސް' },
	{ value: 'game', label: 'ގޭމް' },
	{ value: 'creative', label: 'ކްރިއޭޓިވް' },
	{ value: 'relax', label: 'ރިލެކްސް' },
];

export function ArtifactsGallery({ onBack, onSelectCard, onOpenSession }: ArtifactsGalleryProps) {
	const [activeTab, setActiveTab] = useState<Tab>('inspiration');
	const [category, setCategory] = useState<Category>('all');
	const [userArtifacts, setUserArtifacts] = useState<UserArtifact[]>([]);

	// Load user artifacts from sessions
	useEffect(() => {
		(async () => {
			try {
				const sessions = await db.sessions
					.where('archived').notEqual(1)
					.toArray();

				const artifacts: UserArtifact[] = [];
				for (const session of sessions) {
					if (!session.agentMessages) continue;
					let messages: any[];
					try {
						messages = typeof session.agentMessages === 'string'
							? JSON.parse(session.agentMessages)
							: session.agentMessages;
					} catch { continue; }

					for (const msg of messages) {
						if (!msg.steps) continue;
						for (const step of msg.steps) {
							if (step.kind === 'artifact') {
								artifacts.push({
									filename: step.filename || 'file',
									label: step.label || step.filename || 'Artifact',
									mimeType: step.mimeType || '',
									sessionId: session.id,
									sessionTitle: session.title || 'ޗެޓް',
								});
							}
						}
					}
				}
				setUserArtifacts(artifacts);
			} catch (err) {
				console.error('[ArtifactsGallery] Failed to load artifacts:', err);
			}
		})();
	}, []);

	const filteredCards = useMemo(() => {
		if (category === 'all') return inspirationCards;
		return inspirationCards.filter(c => c.category === category);
	}, [category]);

	function getFileEmoji(filename: string, mimeType: string): string {
		const ext = filename.split('.').pop()?.toLowerCase() || '';
		if (['docx', 'doc'].includes(ext)) return '📝';
		if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
		if (ext === 'pdf') return '📕';
		if (mimeType.startsWith('image/')) return '🖼';
		if (['py', 'js', 'ts', 'html', 'css'].includes(ext)) return '💻';
		return '📄';
	}

	return (
		<div className="flex flex-col h-full" dir="rtl">
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-4xl mx-auto px-6 py-8">
					{/* Header */}
					<div className="flex items-center gap-3 mb-6">
						<button
							onClick={onBack}
							className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
						>
							<span className="text-lg">&rarr;</span>
						</button>
						<h1 className="thaana-heading text-2xl text-foreground" style={{ marginTop: 6 }}>އާޓިފެކްޓް</h1>
					</div>

					{/* Tabs */}
					<div className="flex gap-1 mb-6 p-1 bg-muted/50 rounded-lg w-fit">
						<button
							onClick={() => setActiveTab('inspiration')}
							className={`thaana px-4 py-2 text-sm rounded-md transition-colors
								${activeTab === 'inspiration' ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
						>
							އިންސްޕިރޭޝަން
						</button>
						<button
							onClick={() => setActiveTab('artifacts')}
							className={`thaana px-4 py-2 text-sm rounded-md transition-colors
								${activeTab === 'artifacts' ? 'bg-card text-foreground font-medium shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
						>
							ތިބާގެ އާޓިފެކްޓް
						</button>
					</div>

					{activeTab === 'inspiration' ? (
						<>
							{/* Category filter */}
							<div className="flex gap-2 mb-6 overflow-x-auto pb-1">
								{CATEGORY_LABELS.map(cat => (
									<button
										key={cat.value}
										onClick={() => setCategory(cat.value)}
										className={`thaana px-3 py-1.5 text-xs rounded-full border transition-colors whitespace-nowrap
											${category === cat.value
												? 'bg-primary text-primary-foreground border-primary'
												: 'border-border text-muted-foreground hover:text-foreground hover:bg-accent'}`}
									>
										{cat.label}
									</button>
								))}
							</div>

							{/* Inspiration cards grid */}
							<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
								{filteredCards.map(card => (
									<button
										key={card.id}
										onClick={() => onSelectCard(card.prompt)}
										className="flex flex-col items-start p-4 bg-card border border-border rounded-xl
											hover:bg-accent/50 hover:border-border/80 transition-all text-right w-full"
									>
										<span className="thaana text-sm font-medium text-foreground mb-1">{card.title}</span>
										<span className="thaana text-xs text-muted-foreground leading-relaxed line-clamp-2">{card.description}</span>
										<span className="thaana text-[10px] text-primary mt-2">ތައްޔާރުކުރޭ &rarr;</span>
									</button>
								))}
							</div>
						</>
					) : (
						<>
							{userArtifacts.length > 0 ? (
								<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
									{userArtifacts.map((art, i) => (
										<button
											key={i}
											onClick={() => onOpenSession(art.sessionId)}
											className="flex flex-col items-start p-4 bg-card border border-border rounded-xl
												hover:bg-accent/50 hover:border-border/80 transition-all text-right w-full"
										>
											<div className="flex items-center gap-2 mb-2">
												<span className="text-xl">{getFileEmoji(art.filename, art.mimeType)}</span>
												<span className="thaana text-sm font-medium text-foreground truncate">{art.label}</span>
											</div>
											<span className="text-[10px] text-muted-foreground font-mono" dir="ltr">{art.filename}</span>
											<span className="thaana text-[10px] text-muted-foreground/60 mt-1">
												{art.sessionTitle}
											</span>
										</button>
									))}
								</div>
							) : (
								<div className="flex flex-col items-center justify-center py-20 gap-3">
									<span className="thaana text-sm text-muted-foreground/50">އާޓިފެކްޓެއް ނެތް</span>
									<p className="thaana text-xs text-muted-foreground/40 text-center max-w-sm">
										ޗެޓް ކޮށްގެން ޑޮކިއުމެންޓް، ސްޕްރެޑްޝީޓް، ނުވަތަ ކޯޑް ހެދީމާ މިތާ ފެންނާނެ.
									</p>
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}
