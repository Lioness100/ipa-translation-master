import { DifficultyLevel, type Word } from './types';

let words: Word[] = [];
const wordsByDifficulty = new Map<DifficultyLevel, Word[]>();

function calculateDifficulty(word: string, ipa: string) {
	let score = 0;
	if (word.length <= 4) {
		score += 0;
	} else if (word.length <= 7) {
		score += 1;
	} else if (word.length <= 10) {
		score += 2;
	} else {
		score += 3;
	}

	const complexSounds = ['θ', 'ð', 'ʃ', 'ʒ', 'ŋ', 'tʃ', 'dʒ', 'æ', 'ɔj', 'aj', 'aw', 'ɚ', 'ɝ'];
	const complexCount = complexSounds.reduce((count, sound) => {
		return count + (ipa.split(sound).length - 1);
	}, 0);

	score += Math.min(complexCount, 3);
	const syllableCount = (ipa.match(/[aeiouæɑɔəɚɛɜɝɪʊʌ]/g) ?? []).length;

	if (syllableCount >= 3) {
		score += 1;
	}

	if (syllableCount >= 5) {
		score += 1;
	}

	if (score <= 2) {
		return DifficultyLevel.Beginner;
	}

	if (score <= 4) {
		return DifficultyLevel.Intermediate;
	}

	if (score <= 6) {
		return DifficultyLevel.Advanced;
	}

	return DifficultyLevel.Expert;
}

function categorizeByDifficulty() {
	wordsByDifficulty.clear();
	for (const difficulty of Object.values(DifficultyLevel)) {
		wordsByDifficulty.set(difficulty, []);
	}

	for (const word of words) {
		wordsByDifficulty.get(word.difficulty)?.push(word);
	}
}

export async function loadWords() {
	const file = await Bun.file('en_US.txt').text();
	const lines = file.split('\n');

	words = lines
		.map((line) => {
			const [word, ipa] = line.split(',');
			return { word, ipa, difficulty: calculateDifficulty(word, ipa) };
		})
		.filter((word) => word.word && word.ipa);

	categorizeByDifficulty();
}

export function getRandomWord(difficulty: DifficultyLevel | null) {
	if (difficulty) {
		const wordsForDifficulty = wordsByDifficulty.get(difficulty) ?? [];
		return wordsForDifficulty[Math.floor(Math.random() * wordsForDifficulty.length)];
	}

	return words[Math.floor(Math.random() * words.length)];
}

export function getIPA(word: string) {
	const entry = words.find((w) => w.word === word);
	return entry?.ipa;
}
