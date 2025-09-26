export interface Word {
	difficulty: DifficultyLevel;
	ipa: string;
	word: string;
}

export enum DifficultyLevel {
	Advanced = 'advanced',
	Beginner = 'beginner',
	Expert = 'expert',
	Intermediate = 'intermediate'
}

export enum GameMode {
	Classic = 'classic',
	Streak = 'streak',
	TimeAttack = 'timeAttack'
}

export interface GameSettings {
	difficulty: DifficultyLevel | null;
	mode: GameMode;
	targetScore?: number;
	timeLimit?: number;
}

export interface GameState {
	attempts: number;
	currentWord: Word | null;
	currentWordStartTime?: Date;
	hintsEnabled?: boolean;
	hintsUsed: number;
	isWinner: boolean;
	maxAttempts: number;
	maxStreak: number;
	score: number;
	streak: number;
	timeRemaining?: number;
	totalCorrect: number;
	totalWords: number;
	wordResults: WordResult[];
}

export interface WordStats {
	averageTime: number;
	correct: number;
	played: number;
}

export interface PlayerStats {
	accuracyPercentage: number;
	averageScore: number;
	bestStreak: number;
	favoriteMode: GameMode;
	timePlayedSeconds: number;
	totalGamesPlayed: number;
	totalWordsGuessed: number;
	wordStats: Record<DifficultyLevel, WordStats>;
}

export interface UserProfile {
	achievements: Achievement[];
	experience: number;
	level: number;
	name: string;
	stats: PlayerStats;
}

export interface Achievement {
	description: string;
	icon: string;
	id: string;
	isUnlocked: boolean;
	name: string;
	unlockedAt?: Date;
}

export interface AnswerResult {
	feedback: string;
	isCorrect: boolean;
	shouldContinue: boolean;
}

export interface WordResult {
	correct: boolean;
	difficulty: DifficultyLevel;
	timeSpent: number;
	word: string;
}

export interface GameResult {
	duration: number;
	hintsUsed: number;
	maxStreak: number;
	mode: GameMode;
	score: number;
	timestamp: Date;
	totalCorrect: number;
	totalWords: number;
	wordResults: WordResult[];
}

export interface StoreSchema {
	gameHistory: GameResult[];
	profile: UserProfile;
}

export interface Hint {
	example: string;
	symbol: string;
}
