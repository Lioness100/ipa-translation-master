/* eslint-disable no-constant-condition */
import { createInterface } from 'node:readline/promises';
import { dim, green, red, yellow } from 'colorette';
import { loadWords } from './dictionary';
import { GameEngine } from './engine';
import { recordGameResult, getProfile, updateProfile, resetProfile, exportData } from './profile';
import {
	renderDifficultySelection,
	renderGameScreen,
	renderStatistics,
	renderMenu,
	renderGameResults,
	renderHelp,
	renderSettings,
	renderGoodbye,
	renderAchievements
} from './ui';
import { GameMode, DifficultyLevel, type GameSettings } from './types';
import { getHints } from './hints';

const continuePrompt = dim('Press Enter to continue…');

export class Game {
	private readonly rl = createInterface({ input: process.stdin, output: process.stdout });
	private gameEngine?: GameEngine;
	private inPrompt = false;
	private abortController?: AbortController;

	public constructor() {
		this.rl.on('SIGINT', () => this.endGame(true));
	}

	private async promptUser(question: string, inGame?: boolean) {
		if (!inGame) {
			this.inPrompt = true;
		}

		this.abortController = new AbortController();
		const answer = await this.rl.question(question, { signal: this.abortController.signal }).catch(() => null);

		if (!inGame) {
			this.inPrompt = false;
		}

		return answer?.trim() ?? null;
	}

	private async selectDifficulty() {
		renderDifficultySelection();

		while (true) {
			const choice = await this.promptUser('\nChoose difficulty (1-5): ');
			const choices = [
				null,
				DifficultyLevel.Beginner,
				DifficultyLevel.Intermediate,
				DifficultyLevel.Advanced,
				DifficultyLevel.Expert
			];

			const idx = Number(choice) - 1;
			if (choices[idx] !== undefined) {
				return choices[idx];
			}

			console.log(red('❌ Invalid choice. Please enter 1-5.'));
		}
	}

	private async startGame(mode: GameMode) {
		console.clear();

		await loadWords();
		const difficulty = await this.selectDifficulty();

		const targetScores: Partial<Record<GameMode, number>> = {
			[GameMode.Streak]: 10,
			[GameMode.Streak50]: 50,
			[GameMode.Streak100]: 100
		};

		const settings: GameSettings = {
			mode,
			difficulty,
			timeLimit: mode === GameMode.TimeAttack ? 60 : undefined,
			targetScore: targetScores[mode]
		};

		this.gameEngine = new GameEngine(settings);
		this.gameEngine.onTimeUp(() => this.abortController?.abort());

		await this.gameLoop();
	}

	private async gameLoop() {
		if (!this.gameEngine) {
			return;
		}

		let lastFeedback = '';

		while (this.gameEngine) {
			const { state, settings } = this.gameEngine;
			if (!state.currentWord) {
				break;
			}

			const hints = getHints(state.currentWord.ipa);
			renderGameScreen(settings, state, hints, lastFeedback);
			state.hintsEnabled = false;

			const guess = await this.promptUser('\nYour answer: ', true);
			const guessLower = guess?.toLowerCase();

			if (guessLower === undefined || guessLower === 'quit') {
				break;
			}

			if (guessLower === 'hint' && !state.hintsEnabled) {
				state.hintsUsed++;
				state.hintsEnabled = true;
				lastFeedback = yellow(`💡 Hints used: ${state.hintsUsed}`);
				continue;
			}

			const result = this.gameEngine.makeGuess(guessLower);
			lastFeedback = result.isCorrect
				? green(`${state.streak && state.streak % 5 === 0 ? '🔥' : '✅'} ${result.feedback}`)
				: red(`❌ ${result.feedback}`);

			if (!result.shouldContinue) {
				break;
			}
		}

		await this.endGame();
	}

	private endGame(exit?: boolean) {
		if (!this.gameEngine) {
			if (exit) {
				this.exitGame();
			}
			return;
		}

		const { state, settings } = this.gameEngine;
		const duration = this.gameEngine.getGameDuration();

		const gameData = { ...state, mode: settings.mode, duration, timestamp: new Date() };
		const newAchievements = recordGameResult(gameData);
		renderGameResults(state, duration, newAchievements);

		delete this.gameEngine;

		if (exit) {
			this.exitGame();
		} else {
			console.log();
			return this.promptUser(continuePrompt) as any;
		}
	}

	private async showStatistics() {
		const profile = getProfile();
		renderStatistics(profile);

		await this.promptUser(continuePrompt);
	}

	private async showAchievements() {
		const profile = getProfile();
		const unlockedAchievements = profile.achievements.filter((a) => a.isUnlocked);
		const lockedAchievements = profile.achievements.filter((a) => !a.isUnlocked);

		renderAchievements(unlockedAchievements, lockedAchievements);
		await this.promptUser(continuePrompt);
	}

	private async showHelp() {
		renderHelp();
		await this.promptUser(continuePrompt);
	}

	private async showSettings() {
		renderSettings();

		const choice = await this.promptUser('\nChoose option (1-4): ');

		switch (choice) {
			case '1': {
				const newName = await this.promptUser('Enter new name: ');
				if (newName) {
					updateProfile({ name: newName });
					console.log(green(`✅ Name changed to: ${newName}`));
				}
				break;
			}
			case '2': {
				const confirm = await this.promptUser(red('❌ Are you sure? This will delete ALL progress (y/N): '));
				if (confirm === 'y') {
					resetProfile();
					console.log(yellow('✅ Progress reset!'));
				}
				break;
			}
			case '3': {
				const exportedData = exportData();
				console.log(green('✅ Your progress data:'));
				console.log(exportedData);
				break;
			}
			case '4': {
				return;
			}
			default: {
				console.log(red('❌ Invalid choice.'));
			}
		}

		console.log();
		await this.promptUser(continuePrompt);
	}

	private exitGame() {
		if (this.inPrompt) {
			console.log();
		}

		renderGoodbye();
		this.rl.close();
		process.exit(0);
	}

	public async start() {
		while (true) {
			const profile = getProfile();
			renderMenu(profile.name, profile.level, profile.experience);

			const choice = await this.promptUser('\nChoose an option (1-10): ');
			const actions: (() => Promise<void> | void)[] = [
				() => this.startGame(GameMode.Classic),
				() => this.startGame(GameMode.TimeAttack),
				() => this.startGame(GameMode.Streak),
				() => this.startGame(GameMode.Streak50),
				() => this.startGame(GameMode.Streak100),
				() => this.showStatistics(),
				() => this.showAchievements(),
				() => this.showSettings(),
				() => this.showHelp(),
				() => this.exitGame()
			];

			const idx = Number(choice) - 1;
			if (actions[idx]) {
				await actions[idx]();
			} else {
				console.log(red('❌ Invalid choice. Please enter 1-8.'));
			}
		}
	}
}
