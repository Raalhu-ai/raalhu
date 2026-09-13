import { getProject, listSessions, storage } from './storage';

export interface MemoriesPayload {
  global?: string;
  project?: string;
  projectName?: string;
}

/** Resolve saved memory for this conversation, including reopened project chats. */
export async function loadChatMemories(sessionId: string): Promise<MemoriesPayload | undefined> {
  const session = (await listSessions()).find(session => session.id === sessionId);
  const project = session?.projectId ? await getProject(session.projectId) : undefined;
  const globalMemory = (await storage().getGlobalMemory()).content;
  const projectMemory = project?.memory?.trim() || '';
  if (!globalMemory && !projectMemory) return undefined;
  return {
    ...(globalMemory && { global: globalMemory }),
    ...(projectMemory && { project: projectMemory, projectName: project!.name }),
  };
}
