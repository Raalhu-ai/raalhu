import React from 'react';

interface WaveIndicatorProps {
	verb: string;
	sandboxStep?: string;
}

/**
 * Animated wave loading indicator with Dhivehi verb,
 * shown during agent streaming.
 */
export function WaveIndicator({ verb, sandboxStep }: WaveIndicatorProps) {
	const displayText = sandboxStep || (verb ? `${verb}...` : '');

	return (
		<div className="flex items-center gap-3 px-2 py-3" dir="rtl">
			{/* SVG wave animation */}
			<div style={{ width: 36, height: 23, overflow: 'visible', flexShrink: 0 }}>
				<svg viewBox="0 0 44 28" width="36" height="23" className="text-primary overflow-visible">
					<g clipPath="url(#wave-clip)">
						<path
							d="M-20,8 Q-15,4 -10,8 Q-5,12 0,8 Q5,4 10,8 Q15,12 20,8 Q25,4 30,8 Q35,12 40,8 Q45,4 50,8 Q55,12 60,8"
							fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.7"
						>
							<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="1.5s" repeatCount="indefinite" />
						</path>
						<path
							d="M-20,14 Q-15,10 -10,14 Q-5,18 0,14 Q5,10 10,14 Q15,18 20,14 Q25,10 30,14 Q35,18 40,14 Q45,10 50,14 Q55,18 60,14"
							fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.5"
						>
							<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="2s" repeatCount="indefinite" />
						</path>
						<path
							d="M-20,20 Q-15,16 -10,20 Q-5,24 0,20 Q5,16 10,20 Q15,24 20,20 Q25,16 30,20 Q35,24 40,20 Q45,16 50,20 Q55,24 60,20"
							fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.35"
						>
							<animateTransform attributeName="transform" type="translate" values="0,0;-20,0" dur="2.5s" repeatCount="indefinite" />
						</path>
					</g>
					<defs>
						<clipPath id="wave-clip">
							<rect x="0" y="0" width="44" height="28" />
						</clipPath>
					</defs>
				</svg>
			</div>
			{displayText ? (
				<span className="thaana text-xs text-muted-foreground animate-pulse">
					{displayText}
				</span>
			) : null}
		</div>
	);
}
