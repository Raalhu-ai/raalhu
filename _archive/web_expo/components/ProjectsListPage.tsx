import React, { useState, useMemo } from 'react';
import { View } from 'react-native';
import { Text } from '@raalhu/ui';
import { Search } from 'lucide-react';
import type { Project } from '@raalhu/shared';
import { formatRelativeTime } from '@raalhu/shared';

interface ProjectsListPageProps {
	projects: Project[];
	onSelectProject: (id: string) => void;
	onCreateProject: () => void;
}

export function ProjectsListPage({ projects, onSelectProject, onCreateProject }: ProjectsListPageProps) {
	const [searchQuery, setSearchQuery] = useState('');
	const [sortBy, setSortBy] = useState<'activity' | 'name'>('activity');

	const filtered = useMemo(() => {
		let list = projects;
		if (searchQuery.trim()) {
			const q = searchQuery.trim().toLowerCase();
			list = list.filter(p => p.name.toLowerCase().includes(q));
		}
		if (sortBy === 'name') {
			list = [...list].sort((a, b) => a.name.localeCompare(b.name));
		}
		return list;
	}, [projects, searchQuery, sortBy]);

	return (
		<div className="flex flex-col h-full" dir="rtl">
			<div className="flex-1 overflow-y-auto">
				<div className="max-w-3xl mx-auto px-6 py-10">
					{/* Header */}
					<div className="flex items-center gap-4 mb-6">
						<h1 className="thaana text-xl text-foreground flex-1">ޕްރޮޖެކްޓް</h1>
						<button
							onClick={onCreateProject}
							className="thaana inline-flex items-center justify-center gap-2 px-4 py-2 text-sm
								rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
						>
							+ އައު ޕްރޮޖެކްޓް
						</button>
					</div>

					{/* Search */}
					<div className="relative mb-4">
						<Search size={16} className="absolute start-3.5 top-1/2 -translate-y-1/2 text-muted-foreground/50 pointer-events-none" />
						<input
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
							type="text"
							dir="rtl"
							placeholder="ޕްރޮޖެކްޓް ހޯދާ..."
							className="thaana w-full ps-11 pe-4 py-3 bg-muted/50 border border-border rounded-xl
								text-foreground text-sm placeholder:text-muted-foreground/40
								focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/30
								transition-all"
						/>
					</div>

					{/* Sort */}
					<div className="flex items-center justify-end gap-2 mb-6">
						<span className="thaana text-xs text-muted-foreground">ތަރުތީބު</span>
						<select
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value as 'activity' | 'name')}
							className="thaana text-xs px-2.5 py-1 border border-border rounded-lg bg-transparent text-muted-foreground
								focus:outline-none"
						>
							<option value="activity">ހަރަކާތް</option>
							<option value="name">ނަން</option>
						</select>
					</div>

					{/* Grid */}
					{filtered.length > 0 ? (
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{filtered.map(project => (
								<button
									key={project.id}
									onClick={() => onSelectProject(project.id)}
									className="flex flex-col items-start p-5 bg-transparent border border-border rounded-xl
										hover:bg-accent/50 hover:border-border/80
										transition-all text-right w-full min-h-[120px]"
								>
									<span className="thaana text-sm font-semibold text-foreground truncate w-full">{project.name}</span>
									{project.instructions && (
										<span className="thaana text-sm text-muted-foreground/70 line-clamp-2 w-full mt-1.5">{project.instructions}</span>
									)}
									<span className="text-[11px] text-muted-foreground/50 mt-auto pt-3">
										{formatRelativeTime(project.updatedAt)}
									</span>
								</button>
							))}
						</div>
					) : searchQuery.trim() ? (
						<div className="flex flex-col items-center justify-center py-20 gap-3">
							<Search size={48} className="text-muted-foreground/15" />
							<span className="thaana text-sm text-muted-foreground/50">ނަތީޖާ ނެތް</span>
						</div>
					) : (
						<div className="flex flex-col items-center justify-center py-20 gap-4">
							<div className="relative w-20 h-20 mb-2">
								<svg viewBox="0 0 80 80" width="80" height="80" className="text-muted-foreground/25">
									<rect x="10" y="16" width="36" height="28" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
									<path d="M10 22 h12 l3 -6 h21" fill="none" stroke="currentColor" strokeWidth="2" />
									<rect x="30" y="30" width="40" height="32" rx="3" fill="none" stroke="currentColor" strokeWidth="2.5" />
									<path d="M30 38 h14 l3 -6 h23" fill="none" stroke="currentColor" strokeWidth="2.5" />
								</svg>
							</div>
							<h2 className="thaana text-base text-foreground">ޕްރޮޖެކްޓެއް ފައްޓަވަންވީތޯ؟</h2>
							<p className="thaana text-sm text-muted-foreground/60 text-center max-w-sm leading-relaxed">
								ފައިލް އަޕްލޯޑް ކުރައްވާ، ކަސްޓަމް އިރުޝާދު ސެޓް ކުރައްވާ، އަދި ޗެޓް ތައް އެއް ތަނެއްގައި ތަރުތީބު ކުރައްވާ.
							</p>
							<button
								onClick={onCreateProject}
								className="thaana inline-flex items-center gap-2 px-5 py-2.5 mt-2 text-sm
									border border-border rounded-full text-foreground hover:bg-accent transition-colors"
							>
								+ އައު ޕްރޮޖެކްޓް
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
