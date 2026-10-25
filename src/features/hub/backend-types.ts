import type { Category, ThemePreference } from './model.ts';

export type Visibility = 'private' | 'public' | 'group';
export type Versioned = { id: string; revision: number; updated_at: string };
export type RecommendationInput = {
  title: string; category: Category; opinion: string; rating: number; cover_path?: string;
  price_cents?: number | null; location?: string | null; link?: string | null; sample?: boolean;
  visibility?: Visibility; group_id?: string | null;
};
export type RecommendationRow = RecommendationInput & Versioned & { owner_id: string; created_at: string; comments?: { count: number }[] };
export type WishInput = { title: string; category: Category; cover_path?: string; link?: string | null; status?: 'pending' | 'finished' };
export type WishlistRow = WishInput & Versioned & { owner_id: string; recommendation_id: string | null; created_at: string };
export type EventInput = { title: string; category: Category; event_date: string };
export type EventRow = EventInput & Versioned & { owner_id: string };
export type SongInput = { title: string; artist: string; cover_path?: string; link?: string | null };
export type SongRow = SongInput & Versioned;
export type PreferencesInput = { theme?: ThemePreference; wishlist_visibility?: 'private' | 'public' };
export type PreferencesRow = PreferencesInput & Versioned;
export type Edit<T> = T & { id?: string; newId?: string; revision?: number };
export type GroupRow = { id: string; owner_id: string; name: string; created_at: string; group_members?: { count: number }[] };
export type CommentRow = { id: string; post_id: string; author_id: string; body: string; gif_path?: string | null; created_at: string };
export type Author = { id: string; name: string; avatar_path: string | null };
export type AvailabilityPeriod = 'morning' | 'afternoon' | 'evening';
export type AvailabilityRow = { id: string; group_id: string; owner_id: string; available_date: string; period: AvailabilityPeriod };
export type GroupPostKind = 'plan' | 'gift';
export type GroupPostInput = { newId: string; group_id: string; kind: GroupPostKind; title: string; description: string; event_date?: string | null; cover_path?: string };
export type GroupResponse = { post_id: string; owner_id: string };
export type GroupPostRow = Omit<GroupPostInput, 'newId'> & Versioned & { owner_id: string; created_at: string; status: 'open' | 'reserved' | 'delivered'; reserved_for: string | null; group_post_responses: GroupResponse[] };
