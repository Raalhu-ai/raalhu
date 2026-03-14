import React, { useState } from 'react';
import { ChevronDown, ChevronLeft } from 'lucide-react';

interface StepRowProps {
	icon: React.ReactNode;
	label: string;
	shimmer?: boolean;
	children?: React.ReactNode;
}

export function StepRow({ icon, label, shimmer = false, children }: StepRowProps) {
	const [expanded, setExpanded] = useState(false);
	const expandable = !!children && !shimmer;

	return (
		<div className="mb-0.5">
			<button
				onClick={() => { if (expandable) setExpanded(!expanded); }}
				className="group/step inline-flex items-center gap-1.5 h-7 text-xs transition-colors"
			>
				<span className="text-muted-foreground/60 shrink-0 text-xs">{icon}</span>
				<span className={`thaana text-xs text-muted-foreground/70 ${shimmer ? 'step-shimmer' : ''}`}>
					{label}
				</span>
				{expandable && (
					<span className={`${expanded ? 'opacity-100' : 'opacity-0 group-hover/step:opacity-100'} transition-opacity duration-150`}>
						{expanded ? <ChevronDown size={12} className="text-muted-foreground/40" /> : <ChevronLeft size={12} className="text-muted-foreground/40" />}
					</span>
				)}
			</button>

			{children && expanded && (
				<div className="me-6 pb-1.5">
					{children}
				</div>
			)}
		</div>
	);
}
