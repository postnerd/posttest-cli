import { EngineConfigData, PositionConfigData, Engine, PositionResult } from "./interfaces.js";
import { getUCIEngineName, getUCIPositionInfo } from "./engine.js";
import { logger } from "./utils.js";
import chalk from "chalk";
import Table from "cli-table3";

export default class Run {
	engines: Engine[] = [];
	positions: PositionConfigData[];
	results: PositionResult[] = [];

	constructor(engines: EngineConfigData[], positions: PositionConfigData[]) {
		engines.forEach((engine, index) => {
			this.engines.push({
				id: index,
				name: "engine" + index,
				executable: engine.executable,
				strings: engine.strings,
				status: "success",
			});
		});
		this.positions = positions;

		logger.setProgressBar(this.engines.filter(engine => engine.status === "success").length, this.positions.length);
		logger.debug(`Setup for new run with ${this.engines.length} engines and ${this.positions.length} positions completed.`);
	}

	getEngineNameById(id: number): string {
		return this.engines[id].name;
	}

	async go(): Promise<void> {
		await this.testEngines();

		await this.startRun();
	}

	async testEngines(): Promise<void> {
		logger.debug("Testing engines ...");

		for (let i = 0; i < this.engines.length; i++) {
			const engine = this.engines[i];
			try {
				const name = await getUCIEngineName(engine);
				engine.name = name.name!;
				logger.debug(`UCI spoort for engine ${name.name} detected.`);
			}
			catch (error) {
				logger.error(`Engine with executable "${engine.executable}" and strings "${engine.strings}" doesn't work.`);
				engine.status = "error";
			}
		}

		this.printEngineStatus();
	}

	async startRun(): Promise<void> {
		logger.debug("Starting run ...");
		for (let i = 0; i < this.positions.length; i++) {
			const position = this.positions[i];

			for (let j = 0; j < this.engines.length; j++) {
				const engine = this.engines[j];

				logger.updateProgressBar(engine.name, i + 1);

				if (engine.status === "error") {
					continue;
				}

				try {
					const fen = position.fen;
					const depth = position.depth;
					const result: PositionResult = await getUCIPositionInfo(engine, fen, depth);
					this.results.push(result);

				}
				catch (error: unknown) {
					const result: PositionResult = {
						fen: position.fen,
						depth: position.depth,
						nps: 0,
						nodes: 0,
						time: 0,
						bestMove: "",
						engineId: engine.id,
						status: "error",
					};
					this.results.push(result);

					logger.error(`Couldn't get position info for engine ${engine.name} and fen ${position.fen}`);
				}
			}

			const positionInfo = chalk.underline(`Position ${i + 1} of ${this.positions.length} (fen: ${position.fen}):`);
			logger.log(positionInfo, true);
			this.printPositionResults(position);

		}

		this.printOverallResults();
	}

	printEngineStatus(): void {
		const engineTable = new Table({
			head: [chalk.cyan("id"), chalk.cyan("name"), chalk.cyan("executable"), chalk.cyan("strings"), chalk.cyan("status")],
			style: {
				head: [],
			},
		});

		this.engines.forEach((engine) => {
			if (engine.status === "success") {
				engineTable.push([engine.id, chalk.green(engine.name), engine.executable, engine.strings.join(" "), engine.status]);
			}
			else {
				engineTable.push([engine.id, chalk.red(engine.name), engine.executable, engine.strings.join(" "), engine.status]);
			}
		});

		logger.log(chalk.underline("Engines:"), true);
		logger.log(engineTable.toString(), true);
	}

	printPositionResults(positionToPrint: PositionConfigData): void {
		const results = this.results.filter((results) => {
			return results.fen === positionToPrint.fen && results.depth === positionToPrint.depth;
		});

		if (results === undefined) {
			console.debug("Couldn't find results to print for position: " + positionToPrint);
			return;
		}

		const resultTable = new Table({
			head: [chalk.cyan(`depth: ${positionToPrint.depth}`), chalk.cyan("time"), chalk.cyan("nodes"), chalk.cyan("nps"), chalk.cyan("best move")],
			style: {
				head: [],
			},
		});

		results.forEach((result) => {
			if (result.status === "success") {
				resultTable.push([this.getEngineNameById(result.engineId), result.time, result.nodes, result.nps, result.bestMove]);
			}
			else {
				resultTable.push([chalk.red(this.getEngineNameById(result.engineId), + " (failed)"), "--", "--", "--", "--"]);
			}
		});

		logger.log(resultTable.toString(), true);
	}

	printOverallResults(): void {
		const overallTable = new Table({
			head: [chalk.cyan("Overall"), chalk.cyan("time"), chalk.cyan("nodes"), chalk.cyan("nps"), chalk.cyan("failed")],
			style: {
				head: [],
			},
		});

		this.engines.forEach((engine) => {
			if (engine.status === "error") {
				return;
			}

			const results = this.results.filter((result) => {
				return result.engineId === engine.id;
			});

			let totalTime = 0;
			let totalNodes = 0;
			let failedCount = 0;

			results.forEach((positionResult) => {
				totalTime += positionResult.time;
				totalNodes += positionResult.nodes;
				if (positionResult.status === "error") {
					failedCount++;
				}
			});

			overallTable.push([engine.name, totalTime, totalNodes, Math.floor(totalNodes / totalTime * 1000), `${failedCount ? chalk.red(failedCount) : failedCount}`]);
		});

		logger.log(chalk.underline("Overall performance:"), true);
		logger.log(overallTable.toString(), true);
	}
}
