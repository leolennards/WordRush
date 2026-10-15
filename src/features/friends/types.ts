import type { GameStatus } from '@/engine';

/** Today's daily result as shown to friends: colours only, never letters. */
export interface DailySummary {
  dayIndex: number;
  status: GameStatus;
  /** Encoded rows, e.g. ["caaap", "ccccc"]. */
  rows: string[];
  streak: number;
}

export interface PlayerDoc {
  name: string;
  code: string;
  createdAt: number;
  daily: DailySummary | null;
  /** Avatar frame and badge from the shop (absent = none). */
  frame?: string | null;
  badge?: string | null;
}

/** A present from a friend: coins, or a shop item. */
export interface GiftDoc {
  from: string;
  to: string;
  kind: 'coins' | 'item';
  coins?: number;
  item?: string;
  createdAt: number;
  claimed: boolean;
}

export interface FriendLink {
  uid: string;
  since: number;
}

export interface FinishedResult {
  status: Exclude<GameStatus, 'playing'>;
  rows: string[];
  finishedAt: number;
}

export interface ChallengeDoc {
  from: string;
  to: string;
  players: [string, string];
  answer: string;
  createdAt: number;
  results: Record<string, FinishedResult>;
}

export type RaceState = 'invited' | 'countdown' | 'playing' | 'finished' | 'declined' | 'cancelled';

export interface RaceProgress {
  status: GameStatus;
  rows: string[];
  finishedAt: number | null;
}

export interface RaceDoc {
  host: string;
  guest: string;
  players: [string, string];
  answer: string;
  state: RaceState;
  createdAt: number;
  /** Epoch ms when both players may start typing. */
  startAt: number | null;
  progress: Record<string, RaceProgress>;
  winner: string | 'draw' | null;
}

export type Challenge = ChallengeDoc & { id: string };
export type Race = RaceDoc & { id: string };
export type Friend = { uid: string; since: number; profile: PlayerDoc | null };

export interface Account {
  uid: string;
  /** True for guest profiles that exist only on this device. */
  isAnonymous: boolean;
  email: string | null;
  displayName: string | null;
}
