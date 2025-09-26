import { red } from 'colorette';
import { Game } from './game';

async function main() {
	try {
		const game = new Game();
		await game.start();
	} catch (error) {
		console.error(red(`❌ Error: ${error}`));
		process.exit(1);
	}
}

if (import.meta.main) {
	await main();
}
