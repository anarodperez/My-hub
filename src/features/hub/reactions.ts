export const reactionOptions = [
  { value: 'need', label: 'Lo necesito', count: 'need_count' },
  { value: 'convinced', label: 'Me has convencido', count: 'convinced_count' },
  { value: 'you', label: 'Esto es muy tú', count: 'you_count' },
] as const;
export type ReactionKind = typeof reactionOptions[number]['value'];
export type ReactionSummary = { post_id: string; need_count: number; convinced_count: number; you_count: number; mine: ReactionKind | null };
