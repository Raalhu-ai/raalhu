import { modelDisplayName } from "./modes";

export const EFFORTS = ["extra-low", "low", "medium", "high"] as const;
export type Effort = typeof EFFORTS[number];
export const effortLabel: Record<Effort, string> = {
  "extra-low": "އެކްސްޓްރާ ލޯ", low: "ލޯ", medium: "މީޑިއަމް", high: "ހައި",
};
export interface ModelGroup {
  key: string;
  label: string;
  options: { id: string; effort?: Effort }[];
}

export function modelLabel(id: string) {
  return modelDisplayName(id);
}

export function groupModels(ids: string[]): ModelGroup[] {
  const groups = new Map<string, ModelGroup>();
  for (const id of new Set(ids)) {
    // Only explicit effort variants are combined. Tiered, Lite, Image and Agent
    // remain independent models; their suffixes are not thinking levels.
    const match = /^(gemini-\d+(?:\.\d+)*-(?:flash|pro))-(extra-low|low|medium|high)$/.exec(id);
    const key = match ? `${match[1]}:effort` : id;
    const group = groups.get(key) ?? { key, label: modelLabel(match?.[1] ?? id), options: [] };
    group.options.push({ id, effort: match?.[2] as Effort | undefined });
    groups.set(key, group);
  }
  return [...groups.values()].map((group) => ({
    ...group,
    options: group.options.sort((a, b) => EFFORTS.indexOf(a.effort!) - EFFORTS.indexOf(b.effort!)),
  })).sort((a, b) => a.key.localeCompare(b.key, "en", { numeric: true }));
}

export function preferredOption(group: ModelGroup, remembered?: string) {
  return group.options.find((option) => option.id === remembered)
    ?? group.options.find((option) => option.effort === "medium")
    ?? group.options[0];
}
