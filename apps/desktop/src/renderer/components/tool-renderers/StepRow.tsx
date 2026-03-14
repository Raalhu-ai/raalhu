import React, { useState } from 'react';

interface StepRowProps {
	icon: string;
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
						<span className="text-muted-foreground/40 text-xs">{expanded ? '▼' : '◀'}</span>
					</span>
				)}
			</button>

			{children && expanded && (
				<div className="mr-6 pb-1.5">
					{children}
				</div>
			)}
		</div>
	);
}
