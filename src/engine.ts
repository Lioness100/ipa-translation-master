import { createWordGenerator, getIPA } from './dictionary';
import { type GameState, type GameSettings, GameMode, DifficultyLevel, type AnswerResult, type Word } from './types';

export class GameEngine {
	public readonly state: GameState;
	private readonly gameStartTime = new Date();
	private timer?: NodeJS.Timeout;
	private onTimeUpCallback?: () => void;
	private readonly wordStartTimes = new Map<string, Date>();
	private readonly wordGenerator: Iterator<Word, void>;

	public constructor(public readonly settings: GameSettings) {
		this.state = {
			currentWord: null,
			score: 0,
			streak: 0,
			maxStreak: 0,
			attempts: 0,
			totalWords: 0,
			totalCorrect: 0,
			maxAttempts: settings.mode === GameMode.Classic ? 3 : 1,
			timeRemaining: settings.timeLimit,
			hintsUsed: 0,
			isWinner: false,
			wordResults: [],
			currentWordStartTime: new Date()
		};

		this.wordGenerator = createWordGenerator(settings.difficulty);
		this.initializeGame();
	}

	private initializeGame() {
		this.nextWord();

		if (this.settings.timeLimit) {
			this.startTimer();
		}
	}

	private startTimer() {
		this.timer = setInterval(() => {
			if (this.state.timeRemaining && this.state.timeRemaining > 0) {
				this.state.timeRemaining--;

				if (this.state.timeRemaining === 0) {
					this.endGame(false);
				}
			}
		}, 1000);
	}

	private stopTimer() {
		if (this.timer) {
			clearInterval(this.timer);
			delete this.timer;
		}
	}

	public nextWord() {
		this.state.currentWord = this.wordGenerator.next().value!;
		this.state.totalWords++;
		this.state.attempts = 0;
		this.state.currentWordStartTime = new Date();
		this.wordStartTimes.set(this.state.currentWord.word, new Date());
	}

	public makeGuess(guess: string) {
		const { word, difficulty, ipa } = this.state.currentWord!;
		const correct = getIPA(guess) === ipa;

		const startTime = this.wordStartTimes.get(word);
		const timeSpent = startTime ? Math.round((Date.now() - startTime.getTime()) / 1000) : 0;

		this.state.wordResults.push({ correct, word, difficulty, timeSpent });
		this.state.attempts++;

		return {
			isCorrect: correct,
			...(correct ? this.handleCorrectGuess() : this.handleIncorrectGuess())
		} as AnswerResult;
	}

	private handleCorrectGuess() {
		const timeBonus = this.calculateTimeBonus();
		const difficultyMultiplier = GameEngine.getDifficultyMultiplier(this.state.currentWord!.difficulty);
		const streakBonus = Math.floor(this.state.streak * 0.1);

		const points = Math.floor((10 + timeBonus + streakBonus) * difficultyMultiplier);

		this.state.score += points;
		this.state.totalCorrect++;
		this.state.streak++;
		this.state.maxStreak = Math.max(this.state.maxStreak, this.state.streak);

		if (this.checkWinCondition()) {
			this.endGame(true);
			return { shouldContinue: false, feedback: `Correct! +${points} points. You won!` };
		}

		this.nextWord();
		return { shouldContinue: true, feedback: `Correct! +${points} points (Streak: ${this.state.streak})` };
	}

	private handleIncorrectGuess() {
		this.state.streak = 0;

		if (this.state.attempts >= this.state.maxAttempts) {
			const correctWord = this.state.currentWord!.word;
			this.nextWord();

			return { shouldContinue: true, feedback: `Incorrect. The answer was: ${correctWord}` };
		}

		const remainingAttempts = this.state.maxAttempts - this.state.attempts;
		return { shouldContinue: true, feedback: `Incorrect. ${remainingAttempts} attempts remaining.` };
	}

	private calculateTimeBonus() {
		const timeElapsed = (Date.now() - this.state.currentWordStartTime!.getTime()) / 1000;
		if (timeElapsed < 5) {
			return 5;
		}

		if (timeElapsed < 10) {
			return 3;
		}

		if (timeElapsed < 15) {
			return 1;
		}

		return 0;
	}

	private static getDifficultyMultiplier(difficulty: DifficultyLevel) {
		const multiplier: Record<DifficultyLevel, number> = {
			[DifficultyLevel.Beginner]: 1,
			[DifficultyLevel.Intermediate]: 1.2,
			[DifficultyLevel.Advanced]: 1.5,
			[DifficultyLevel.Expert]: 2
		};

		return multiplier[difficulty] ?? 1;
	}

	private checkWinCondition() {
		return this.settings.targetScore && this.state.streak >= this.settings.targetScore;
	}

	private endGame(isWinner: boolean) {
		this.state.isWinner = isWinner;
		this.stopTimer();
		this.onTimeUpCallback?.();
	}

	public onTimeUp(callback: () => unknown) {
		this.onTimeUpCallback = callback;
	}

	public getGameDuration() {
		return Math.floor((Date.now() - this.gameStartTime.getTime()) / 1000);
	}
}
