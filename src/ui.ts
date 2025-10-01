/* eslint-disable @typescript-eslint/no-use-before-define */
import { cyan, green, yellow, blue, bold, dim, red } from 'colorette';
import dedent from 'dedent';
import { DifficultyLevel } from './types';
import type { GameState, GameSettings, UserProfile, Achievement, Hint } from './types';

export const MAIN_WIDTH = 80;
export const SIDEBAR_WIDTH = 35;

export function renderTitle(title?: string) {
	console.log(dedent`
		${blue('═'.repeat(MAIN_WIDTH))}
		${cyan(bold(title ?? '🎯 IPA TRANSLATION MASTER 🎯'))}
		${blue('═'.repeat(MAIN_WIDTH))}\n
	`);
}

export function renderMenu(profileName: string, level: number, experience: number) {
	console.clear();
	renderTitle();

	console.log(dedent`
		${green(`Welcome back, ${profileName}!`)}
		${yellow(`Level ${level} | Experience: ${experience}`)}
	`);

	const columns = [
		['Game Modes:', 'Other Options:'],
		['1. 📚 Classic Game', '6. 📊 View Statistics'],
		['2. 🏃 Time Attack (60s)', '7. 🏆 View Achievements'],
		['3. 🔥 10 Streak Challenge', '8. ⚙️  Settings'],
		['4. 🐦 50 Streak Challenge', '9. ❓ Help'],
		['5. 🚩 100 Streak Challenge', '10. 🚪 Exit']
	];

	const columnLength = Math.max(...columns.map(([line]) => line.length)) + 10;
	let menuText = '';
	for (const [i, [left, right]] of columns.entries()) {
		const line = `\n${left.padEnd(columnLength)}${right}`;
		menuText += i === 0 ? bold(line) : line;
	}

	console.log(menuText);
}

export function renderDifficultySelection() {
	renderTitle();
	console.log(dedent`
		${bold('Select Difficulty:')}
		1. ${'🌈'} All Difficulties
		2. ${'🟢'} Beginner
		3. ${'🟡'} Intermediate
		4. ${'🟠'} Advanced
		5. ${'🔴'} Expert
	`);
}

export function renderGameScreen(settings: GameSettings, state: GameState, hints: Hint[], feedback?: string) {
	console.clear();

	renderMainContent(settings, state, feedback);
	renderSidebar(hints, state.hintsEnabled ?? false);
}

const difficultyColors: Record<DifficultyLevel, (text: string) => string> = {
	[DifficultyLevel.Beginner]: green,
	[DifficultyLevel.Intermediate]: yellow,
	[DifficultyLevel.Advanced]: blue,
	[DifficultyLevel.Expert]: red
};

function renderMainContent(settings: GameSettings, state: GameState, feedback?: string) {
	process.stdout.write('\u001B[1;1H');

	renderTitle(`🎯 ${settings.mode.toUpperCase().replace('_', ' ')} MODE`);

	let statsLine = `Score: ${state.score} | Streak: ${state.streak} | Best: ${state.maxStreak}`;
	if (state.timeRemaining !== undefined) {
		statsLine += ` | Time: ${state.timeRemaining}s`;
	}

	const color = difficultyColors[state.currentWord!.difficulty];

	let mainText = dedent`
		${cyan(statsLine)}

		${bold('Pronunciation:')}
		${green(`/${state.currentWord!.ipa}/`)}

		${dim(`Difficulty: ${color(state.currentWord!.difficulty)}`)}
	`;

	if (feedback) {
		mainText += `\n${feedback}\n`;
	}

	mainText += `\n${dim('Commands: answer | hint | quit')}`;
	console.log(mainText);
}

function renderHint(row: number, col: number, hint: Hint, show: boolean) {
	process.stdout.write(`\u001B[${row};${col}H`);
	const hintText = `${green(hint.symbol)}: ${show ? hint.example : '*'.repeat(hint.example.length)}\n`;
	process.stdout.write(hintText);
}

function renderSidebar(hints: { example: string; symbol: string }[], show: boolean) {
	let sidebarCol = MAIN_WIDTH - SIDEBAR_WIDTH + 1;

	process.stdout.write(`\u001B[4;${sidebarCol}H`);
	process.stdout.write(yellow(bold('💡 IPA HINTS (type "hint")')));

	process.stdout.write(`\u001B[5;${sidebarCol}H`);
	process.stdout.write(blue('─'.repeat(SIDEBAR_WIDTH)));

	const maxRows = process.stdout.rows - 9;
	if (hints.length > maxRows) {
		const columns = [hints.slice(0, maxRows), hints.slice(maxRows)];
		for (const colHints of columns) {
			for (const [index, hint] of colHints.entries()) {
				const row = 7 + index;
				renderHint(row, sidebarCol, hint, show);
			}

			sidebarCol += Math.max(...columns[0].map((h) => h.example.length)) + 6;
		}
	} else {
		for (const [index, hint] of hints.entries()) {
			const row = 7 + index;
			renderHint(row, sidebarCol, hint, show);
		}
	}

	process.stdout.write(`\u001B[14;1H`);
}

export function renderStatistics(profile: UserProfile) {
	console.clear();
	renderTitle('📊 YOUR STATISTICS');

	console.log(dedent`
		${bold('Profile:')}
		Name: ${green(profile.name)} | Level: ${yellow(profile.level)} | Experience: ${cyan(profile.experience)}\n
	`);

	const { stats } = profile;

	const leftColumn = [
		'Overall Stats:',
		`Games Played: ${cyan(stats.totalGamesPlayed)}`,
		`Words Attempted: ${green(stats.totalWordsGuessed)}`,
		`Average Score: ${yellow(stats.averageScore)}`,
		`Best Streak: ${cyan(stats.bestStreak)}`,
		`Accuracy: ${green(`${stats.accuracyPercentage}%`)}`,
		`Time Played: ${cyan(`${Math.floor(stats.timePlayedSeconds / 60)} minutes`)}`
	];

	const rightColumn = ['By Word Difficulty:'];

	for (const [difficulty, wordStats] of Object.entries(stats.wordStats)) {
		const titleCased = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
		const color = difficultyColors[difficulty as DifficultyLevel];
		const accuracy = wordStats.played > 0 ? Math.round((wordStats.correct / wordStats.played) * 100) : 0;
		rightColumn.push(
			`${color(`${titleCased}:`.padEnd(13))} ${wordStats.played} words, ${wordStats.correct} correct (${accuracy}%)`
		);
	}

	const columnLength = Math.max(...leftColumn.map((line) => line.length)) + 10;
	let statsText = '';
	for (let i = 0; i < Math.max(leftColumn.length, rightColumn.length); i++) {
		const left = leftColumn[i] ?? '';
		const right = rightColumn[i] ?? '';
		const line = `${left.padEnd(columnLength - (i === 0 ? 10 : 0))}${right}\n`;
		statsText += i === 0 ? bold(line) : line;
	}

	console.log(statsText);
}

export function renderGameResults(state: GameState, duration: number, achievements: Achievement[]) {
	console.clear();
	renderTitle('🎯 GAME OVER');

	let resultsText = '';
	if (state.isWinner) {
		resultsText += green('✅ 🎉 CONGRATULATIONS! YOU WON! 🎉') + '\n\n';
	}

	resultsText += dedent`
		${bold('Final Results:')}
		Score: ${cyan(state.score)}
		Best Streak: ${yellow(state.maxStreak)}
		Time Played: ${green(`${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`)}
		Hints Used: ${cyan(state.hintsUsed)}
	`;

	if (achievements.length) {
		resultsText += `\n\n${yellow('🏆 NEW ACHIEVEMENTS UNLOCKED!')}`;
		for (const achievement of achievements) {
			resultsText += `\n${achievement.icon} ${achievement.name}: ${achievement.description}`;
		}
	}

	console.log(resultsText);
}

export function renderAchievements(unlocked: Achievement[], locked: Achievement[]) {
	console.clear();
	renderTitle('🏆 YOUR ACHIEVEMENTS');

	let achievementsText = '';
	if (unlocked.length > 0) {
		achievementsText += green('✅ Unlocked:') + '\n';
		for (const achievement of unlocked) {
			achievementsText += `${achievement.icon} ${green(achievement.name)}: ${achievement.description}\n`;
		}
		achievementsText += '\n';
	}

	if (locked.length > 0) {
		achievementsText += dim('🔒 Locked:') + '\n';
		for (const achievement of locked) {
			achievementsText += `${achievement.icon} ${dim(achievement.name)}: ${achievement.description}\n`;
		}
	}

	console.log(achievementsText);
}

export function renderHelp() {
	console.clear();
	renderTitle('❓ HELP & TUTORIAL');
	console.log(dedent`
		${bold('How to Play:')}
		1. You'll see an IPA transcription like ${'/kæt/'}
		2. Type the English word that matches the pronunciation ("cat" in this case)
		3. Press Enter to submit your answer
		4. Type "hint" for additional help\n
	`);
}

export function renderSettings() {
	console.clear();
	renderTitle('⚙️  SETTINGS');
	console.log(dedent`
		1. Change Player Name
		2. Reset All Progress
		3. Export Progress
		4. Back to Menu
	`);
}

export function renderGoodbye() {
	console.log(dedent`
		\n${cyan('👋 Thanks for playing IPA Translation Master!')}
		${yellow('Keep practicing those translations! 🎯')}
	`);
}
