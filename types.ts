export enum Player {
  None = 0,
  Black = 1, // Black usually goes first
  White = 2
}

export enum GameMode {
  PvP = 'PvP',
  PvE = 'PvE'
}

export enum AIDifficulty {
  Easy = 'easy',
  Hard = 'hard',
  SuperHard = 'super_hard'
}

export interface Coordinate {
  row: number;
  col: number;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  cost: number;
  icon: string; // Lucide icon name
  isImplemented: boolean;
}

export interface PlayerState {
  skillPoints: number;
  usedSkills: string[]; // IDs of skills used this game
  isDoubleMoveActive: boolean;
}

export interface MoveResult {
  row: number;
  col: number;
  analysis?: string;
}