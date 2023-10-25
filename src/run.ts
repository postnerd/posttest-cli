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

		logger.debug(`Setup run object with ${this.engines.length} engines and ${this.positions.length} positions completed.`);

		this.testEngines();

		this.startRun();
	}

	getEngineNameById(id: number): string {
		return this.engines[id].name;
	}

	testEngines(): void {
		logger.debug("Testing engines ...");
		this.engines.forEach(async (engine) => {
			try {
				let name = await getUCIEngineName(engine);
				engine.name = name.name!;
				logger.debug(`UCI spoort for engine ${name.name} detected.`);
			}
			catch (error) {
				logger.error(`Engine with executable "${engine.executable}" and strings "${engine.strings}" doesn't work.`);
				engine.status = "error";
			}
		});

		this.printEngineStatus();
	}

	async startRun(): Promise<void> {
		logger.debug("Starting run ...");
		for (let i = 0; i < this.positions.length; i++) {
			const position = this.positions[i];

			for (let j = 0; j < this.engines.length; j++) {
				const engine = this.engines[j];

				if (engine.status === "error") {
					continue;
				}

				try {
					const fen = position.fen;
					const depth = position.depth;
					const result: PositionResult = await getUCIPositionInfo(engine, fen, depth);
					this.results.push(result);

				}
				catch (error: any) {
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
			logger.nativeLog(chalk.underline(`Position ${i + 1} of ${this.positions.length} (fen: ${position.fen} | ):`));
			this.printPositionResults(position);
		}

		this.printOverallResults();
	}

	printEngineStatus(): void {
		const engineTable = new Table({
			head: [chalk.blue("id"), chalk.blue("name"), chalk.blue("executable"), chalk.blue("strings"), chalk.blue("status")],
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

		logger.nativeLog(chalk.underline("Engines:"));
		logger.nativeLog(engineTable.toString());
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
			head: [chalk.blue(`depth: ${positionToPrint.depth}`), chalk.blue("time"), chalk.blue("nodes"), chalk.blue("nps"), chalk.blue("best move")],
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

		logger.nativeLog(resultTable.toString());
	}

	printOverallResults(): void {
		const overallTable = new Table({
			head: [chalk.blue("Overall"), chalk.blue("time"), chalk.blue("nodes"), chalk.blue("nps"), chalk.blue("failed")],
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

		logger.nativeLog(chalk.underline("Overall performance:"));
		logger.nativeLog(overallTable.toString());
	}
}