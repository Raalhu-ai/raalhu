import React, { useState, useCallback } from 'react';

interface ProjectCreateDialogProps {
	open: boolean;
	onClose: () => void;
	onCreate: (name: string) => void;
}

export function ProjectCreateDialog({ open, onClose, onCreate }: ProjectCreateDialogProps) {
	const [name, setName] = useState('');

	const handleCreate = useCallback(() => {
		if (name.trim()) {
			onCreate(name.trim());
			setName('');
			onClose();
		}
	}, [name, onCreate, onClose]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/50" onClick={onClose} />
			<div className="relative bg-card border border-border rounded-xl p-6 max-w-md w-full mx-4 shadow-lg" dir="rtl">
				<h3 className="thaana text-xl text-foreground font-normal mb-1">އައު ޕްރޮޖެކްޓެއް ހެދުން</h3>
				<p className="thaana text-muted-foreground text-sm mb-4">
					ޕްރޮޖެކްޓް ނަމެއް ޖައްސަވާ
				</p>
				<input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onKeyDown={(e) => {
						if (e.key === 'Enter') { e.preventDefault(); handleCreate(); }
						if (e.key === 'Escape') onClose();
					}}
					placeholder="ޕްރޮޖެކްޓް ނަން..."
					dir="rtl"
					autoFocus
					className="thaana w-full px-3 py-2 bg-background border border-border rounded-lg
						text-foreground focus:outline-none focus:border-ring/50 focus:ring-1 focus:ring-ring/40 mb-4"
				/>
				<div className="flex gap-2 justify-end">
					<button
						onClick={onClose}
						className="thaana px-4 py-2 text-sm text-muted-foreground hover:text-foreground
							border border-border rounded-lg hover:bg-accent transition-colors"
					>
						ކެންސަލް
					</button>
					<button
						onClick={handleCreate}
						disabled={!name.trim()}
						className="thaana px-4 py-2 text-sm bg-primary text-primary-foreground rounded-lg
							hover:bg-primary/90 disabled:opacity-40 transition-colors"
					>
						ހެދުން
					</button>
				</div>
			</div>
		</div>
	);
}
