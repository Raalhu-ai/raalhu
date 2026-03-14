import React from 'react';
import { Keyboard, PenLine, Eye, FolderOpen, Upload, BookOpen, HelpCircle, PenTool, CookingPot, Globe, Lock, Wrench } from 'lucide-react';
import { StepRow } from './StepRow';
import { PythonRenderer } from './PythonRenderer';
import { WriteFileRenderer } from './WriteFileRenderer';
import { ReadFileRenderer } from './ReadFileRenderer';
import { ListDirRenderer } from './ListDirRenderer';
import { PresentFileRenderer } from './PresentFileRenderer';
import { WebResultRenderer } from './WebResultRenderer';
import { SkillRenderer } from './SkillRenderer';
import { DefaultRenderer } from './DefaultRenderer';

interface ToolCallStepProps {
	name: string;
	args: Record<string, unknown>;
	status: 'running' | 'done' | 'error';
	result?: Record<string, unknown> | string;
}

interface ToolMeta {
	icon: React.ReactNode;
	displayName: string;
}

function getToolMeta(name: string, args: Record<string, unknown>): ToolMeta {
	const desc = args?.description as string | undefined;

	switch (name) {
		case 'execute_python':
			return { icon: <Keyboard size={12} />, displayName: desc || 'Python ރަން ކުރުން' };
		case 'write_file':
			return { icon: <PenLine size={12} />, displayName: desc || 'ފައިލް ލިޔުން' };
		case 'read_file':
			return { icon: <Eye size={12} />, displayName: desc || 'ފައިލް ކިޔުން' };
		case 'list_directory':
			return { icon: <FolderOpen size={12} />, displayName: 'ޑިރެކްޓަރީ ލިސްޓް' };
		case 'present_file':
			return { icon: <Upload size={12} />, displayName: 'ފައިލް ދެއްކުން' };
		case 'read_skill':
			return { icon: <BookOpen size={12} />, displayName: 'ސްކިލް ކިޔުން' };
		case 'ask_user_input':
			return { icon: <HelpCircle size={12} />, displayName: 'ސުވާލު ކުރުން' };
		case 'message_compose':
			return { icon: <PenTool size={12} />, displayName: 'މެސެޖް ލިޔުން' };
		case 'recipe_display':
			return { icon: <CookingPot size={12} />, displayName: 'ރެސިޕީ ދެއްކުން' };
		case 'show_widget':
			return { icon: '📊', displayName: desc || 'ވިޝުއަލައިޒް' };
		case 'web_search':
			return { icon: <Globe size={12} />, displayName: 'ވެބް ސާޗް' };
		case 'web_fetch':
			return { icon: <Lock size={12} />, displayName: 'ވެބް ފެޗް' };
		default:
			return { icon: <Wrench size={12} />, displayName: name };
	}
}

export function ToolCallStep({ name, args, status, result }: ToolCallStepProps) {
	const meta = getToolMeta(name, args);

	return (
		<StepRow icon={meta.icon} label={meta.displayName} shimmer={status === 'running'}>
			{result != null && (
				<>
					{name === 'execute_python' && (
						<PythonRenderer args={args} result={result} status={status} />
					)}
					{name === 'write_file' && (
						<WriteFileRenderer args={args} result={result} status={status} />
					)}
					{name === 'read_file' && (
						<ReadFileRenderer args={args} result={result} status={status} />
					)}
					{name === 'list_directory' && (
						<ListDirRenderer args={args} result={result} status={status} />
					)}
					{name === 'present_file' && (
						<PresentFileRenderer args={args} result={result} status={status} />
					)}
					{(name === 'web_search' || name === 'web_fetch') && (
						<WebResultRenderer result={result} />
					)}
					{name === 'read_skill' && (
						<SkillRenderer result={result} status={status} />
					)}
					{!['execute_python', 'write_file', 'read_file', 'list_directory', 'present_file', 'web_search', 'web_fetch', 'read_skill', 'ask_user_input', 'message_compose', 'recipe_display', 'show_widget'].includes(name) && (
						<DefaultRenderer result={result} />
					)}
				</>
			)}
		</StepRow>
	);
}
