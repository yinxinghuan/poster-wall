import type { GuestMessage, WithMessages } from '../shared/social/guestbook';

export const FIELD_W = 390;
export const FIELD_H = 680;

export type PosterMode = 'avatar' | 'basic';
export type PosterStatus = 'idle' | 'generating' | 'complete' | 'failed';
export type PosterTone = 'neon' | 'paper' | 'acid';

export interface PosterEntry {
  id: string;
  createdAt: number;
  mode: PosterMode;
  imageUrl: string;
  prompt: string;
  hasAvatar: boolean;
  posterTone?: PosterTone;
  posterTemplate?: string;
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
}

export interface PosterLike {
  id: string;
  target: string;
  toUserId?: string;
  ts: number;
  fromUserId?: string;
  userName?: string;
  userAvatarUrl?: string;
}

export interface PosterSave extends WithMessages {
  posters: PosterEntry[];
  totalGenerated: number;
  messages?: GuestMessage[];
  likes?: PosterLike[];
  lastGeneratedAt?: number;
  _lastActive?: number;
}

export interface ProfileInfo {
  name?: string;
  head_url?: string;
}

export interface SaveRow {
  user_id?: string;
  resource_data?: string;
  time?: string;
}

export interface WallEntry extends PosterEntry {
  userId: string;
  userName?: string;
  userAvatarUrl?: string;
  isSelf?: boolean;
  likeCount?: number;
  commentCount?: number;
  likedByMe?: boolean;
}

export const REVIEW_POSTER_IMAGES = [
  './img/review-generated/avatar-hex.jpg',
  './img/review-generated/avatar-tokyo.jpg',
  './img/review-generated/avatar-swiss.jpg',
  './img/review-generated/username-flat-ref.jpg',
];
