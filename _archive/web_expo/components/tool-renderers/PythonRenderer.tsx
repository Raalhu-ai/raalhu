import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronLeft, AlertTriangle } from 'lucide-react';
import { CodeBlock } from '../CodeBlock';

interface PythonRendererProps {
	args: Record<string, unknown>;
	result?: Record<string, unknown> | string;
	status: 'running' | 'done' | 'error';
}

export function PythonRenderer({ args, result, status }: PythonRendererProps) {
	const [showCode, setShowCode] = useState(false);
	const code = (args?.code as string) || '';

	const parsed = useMemo(() => {
		if (!result) return null;
		if (typeof result === 'string') {
			try { return JSON.parse(result); } catch { return { stdout: result }; }
		}
		return result;
	}, [result]);

	const stdout = (parsed?.stdout as string) || '';
	const stderr = (parsed?.stderr as string) || '';
	const error = (parsed?.error as string) || '';

	return (
		<>
			{code && (
				<>
					<button
						onClick={() => setShowCode(!showCode)}
						className="flex items-center gap-1 text-[10px] text-muted-foreground/50 hover:text-muted-foreground transition-colors mt-0.5 mb-1"
					>
						{showCode ? <ChevronDown size={12} /> : <ChevronLeft size={12} />}
						<span className="thaana">ކޯޑް</span>
					</button>
					{showCode && (
						<div className="max-h-[300px] overflow-y-auto mb-1">
							<CodeBlock code={code} language="python" />
						</div>
					)}
				</>
			)}

			{status === 'error' && error ? (
				<p className="text-xs text-destructive font-mono mt-1" dir="ltr">{error}</p>
			) : (
				<>
					{stdout && (
						<pre className="text-[10px] text-muted-foreground font-mono whitespace-pre-wrap overflow-x-auto mt-1 max-h-[200px] overflow-y-auto" dir="ltr">
							{stdout}
						</pre>
					)}
					{stderr && (
						<div className="flex items-start gap-1.5 mt-1.5">
							<AlertTriangle size={12} className="text-amber-500 shrink-0 mt-0.5" />
							<pre className="text-[10px] text-amber-400/80 font-mono whitespace-pre-wrap overflow-x-auto max-h-[150px] overflow-y-auto" dir="ltr">
								{stderr}
							</pre>
						</div>
					)}
					{!stdout && !stderr && parsed && (
						<p className="text-[10px] text-muted-foreground/60 mt-1 thaana">ނަތީޖާ ނެތް</p>
					)}
				</>
			)}
		</>
	);
}
