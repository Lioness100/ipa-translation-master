/* eslint-disable import/no-unresolved */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-mixed-operators */
/* eslint-disable @typescript-eslint/no-use-before-define */
import Conf from 'conf';
import {
	type UserProfile,
	type PlayerStats,
	GameMode,
	DifficultyLevel,
	type WordStats,
	type StoreSchema,
	type Achievement,
	type GameResult
} from './types';

const DEFAULT_WORD_STATS: WordStats = { played: 0, correct: 0, averageTime: 0 };

const store = new Conf<StoreSchema>({
	projectName: 'ipa-game-enhanced',
	projectVersion: '1.0.0',
	defaults: {
		profile: createDefaultProfile(),
		gameHistory: []
	}
});

function createDefaultProfile() {
	return {
		name: 'Player',
		level: 1,
		experience: 0,
		stats: {
			totalGamesPlayed: 0,
			totalWordsGuessed: 0,
			averageScore: 0,
			bestStreak: 0,
			timePlayedSeconds: 0,
			accuracyPercentage: 0,
			favoriteMode: GameMode.Classic,
			wordStats: {
				[DifficultyLevel.Beginner]: { ...DEFAULT_WORD_STATS },
				[DifficultyLevel.Intermediate]: { ...DEFAULT_WORD_STATS },
				[DifficultyLevel.Advanced]: { ...DEFAULT_WORD_STATS },
				[DifficultyLevel.Expert]: { ...DEFAULT_WORD_STATS }
			}
		},
		achievements: createDefaultAchievements()
	} as UserProfile;
}

function createDefaultAchievements() {
	const entries = [
		{ id: 'firstGame', name: 'First Steps', description: 'Play your first game', icon: '👶' },
		{ id: 'streak5', name: 'On a Roll', description: 'Get a 5-word streak', icon: '🔥' },
		{ id: 'streak10', name: 'Unstoppable', description: 'Get a 10-word streak', icon: '🛑' },
		{ id: 'score100', name: 'Century', description: 'Score 100 points in a single game', icon: '💯' },
		{ id: 'beginnerMaster', name: 'Beginner Master', description: 'Get 50 correct beginner words', icon: '🎓' },
		{ id: 'expertMaster', name: 'Expert Master', description: 'Get 25 correct expert words', icon: '👑' },
		{ id: 'speedDemon', name: 'Speed Demon', description: 'Complete Time Attack with 50+ points', icon: '🏃' },
		{ id: 'pureSkill', name: 'Pure Skill', description: 'Complete a 10+ word game without hints', icon: '🧠' },
		{ id: 'marathon', name: 'Marathon Player', description: 'Play for 30 minutes total', icon: '⏰' },
		{ id: 'perfectionist', name: 'Perfectionist', description: 'Get 100% accuracy in a 10+ word game', icon: '✨' }
	];

	return entries.map<Achievement>((achievement) => ({ ...achievement, isUnlocked: false }));
}

export function getProfile() {
	return store.get('profile');
}

export function updateProfile(updates: Partial<UserProfile>) {
	const currentProfile = getProfile();
	const updatedProfile = { ...currentProfile, ...updates };
	store.set('profile', updatedProfile);
}

export function recordGameResult(gameData: GameResult) {
	const profile = getProfile();
	const newAchievements: Achievement[] = [];

	const updatedWordStats = { ...profile.stats.wordStats };
	for (const wordResult of gameData.wordResults) {
		const { difficulty, correct, timeSpent } = wordResult;
		const currentStats = updatedWordStats[difficulty];

		updatedWordStats[difficulty] = {
			played: currentStats.played + 1,
			correct: currentStats.correct + (correct ? 1 : 0),
			averageTime: Math.round(
				(currentStats.averageTime * currentStats.played + timeSpent) / (currentStats.played + 1)
			)
		};
	}

	const updatedStats: PlayerStats = {
		...profile.stats,
		totalGamesPlayed: profile.stats.totalGamesPlayed + 1,
		totalWordsGuessed: profile.stats.totalWordsGuessed + gameData.totalWords,
		bestStreak: Math.max(profile.stats.bestStreak, gameData.maxStreak),
		timePlayedSeconds: profile.stats.timePlayedSeconds + gameData.duration,
		averageScore: Math.round(
			(profile.stats.averageScore * profile.stats.totalGamesPlayed + gameData.score) /
				(profile.stats.totalGamesPlayed + 1)
		),
		accuracyPercentage: Math.round(
			(((profile.stats.totalWordsGuessed * profile.stats.accuracyPercentage) / 100 + gameData.totalCorrect) /
				(profile.stats.totalWordsGuessed + gameData.totalWords)) *
				100
		),
		favoriteMode: getMostPlayedMode(gameData.mode),
		wordStats: updatedWordStats
	};

	const achievements = [...profile.achievements];

	unlockAchievementsIf(achievements, newAchievements, {
		firstGame: () => true,
		streak5: () => gameData.maxStreak >= 5,
		streak10: () => gameData.maxStreak >= 10,
		score100: () => gameData.score >= 100,
		beginnerMaster: () => updatedWordStats[DifficultyLevel.Beginner].correct >= 50,
		expertMaster: () => updatedWordStats[DifficultyLevel.Expert].correct >= 25,
		speedDemon: () => gameData.mode === GameMode.TimeAttack && gameData.score >= 50,
		pureSkill: () => gameData.hintsUsed === 0 && gameData.totalWords >= 10,
		marathon: () => updatedStats.timePlayedSeconds >= 1800,
		perfectionist: () => gameData.totalWords >= 10 && gameData.totalCorrect === gameData.totalWords
	});

	const expGain = calculateExperienceGain(gameData);
	const newExp = profile.experience + expGain;
	const newLevel = calculateLevel(newExp);

	updateProfile({ experience: newExp, level: newLevel, stats: updatedStats, achievements });

	const gameHistory = getGameHistory();
	gameHistory.push(gameData);

	if (gameHistory.length > 100) {
		gameHistory.splice(0, gameHistory.length - 100);
	}

	store.set('gameHistory', gameHistory);

	return newAchievements;
}

function unlockAchievementsIf(
	achievements: Achievement[],
	newAchievements: Achievement[],
	list: Record<string, () => boolean>
) {
	for (const [id, condition] of Object.entries(list)) {
		unlockAchievementIf(id, achievements, condition, newAchievements);
	}
}

function unlockAchievementIf(
	id: string,
	achievements: Achievement[],
	condition: () => boolean,
	newAchievements: Achievement[]
) {
	const achievement = achievements.find((a) => a.id === id);
	if (achievement && !achievement.isUnlocked && condition()) {
		achievement.isUnlocked = true;
		achievement.unlockedAt = new Date();
		newAchievements.push(achievement);
	}
}

const expForDifficulty: Record<DifficultyLevel, number> = {
	[DifficultyLevel.Beginner]: 2,
	[DifficultyLevel.Intermediate]: 3,
	[DifficultyLevel.Advanced]: 5,
	[DifficultyLevel.Expert]: 8
};

function calculateExperienceGain(gameData: GameResult) {
	let exp = gameData.score * 2;
	exp += gameData.maxStreak * 5;
	exp += gameData.totalCorrect * 3;

	for (const wordResult of gameData.wordResults) {
		if (wordResult.correct) {
			exp += expForDifficulty[wordResult.difficulty];
		}
	}

	return Math.floor(exp);
}

function calculateLevel(experience: number) {
	let level = 1;
	let requiredExp = 0;

	while (experience >= requiredExp) {
		level++;
		requiredExp += level * 100;
	}

	return level - 1;
}

function getMostPlayedMode(currentMode: GameMode) {
	const history = getGameHistory();
	const modeCounts: Record<GameMode, number> = {
		[GameMode.Classic]: 0,
		[GameMode.TimeAttack]: 0,
		[GameMode.Streak]: 0,
		[GameMode.Streak50]: 0,
		[GameMode.Streak100]: 0
	};

	for (const game of history) {
		modeCounts[game.mode]++;
	}
	modeCounts[currentMode]++;

	let mostPlayed = GameMode.Classic;
	let maxCount = 0;

	for (const [mode, count] of Object.entries(modeCounts)) {
		if (count > maxCount) {
			maxCount = count;
			mostPlayed = mode as GameMode;
		}
	}

	return mostPlayed;
}

export function getGameHistory() {
	return store.get('gameHistory');
}

export function resetProfile() {
	store.set('profile', createDefaultProfile());
	store.set('gameHistory', []);
}

export function exportData() {
	return JSON.stringify({ profile: getProfile(), gameHistory: getGameHistory() }, null, 2);
}
