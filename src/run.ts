import { EngineConfigData, PositionConfigData, Engine, PositionResult } from "./interfaces.js";
import { getUCIEngineName, getUCIPositionInfo } from "./engine.js";
import { logger } from "./utils.js";
import chalk from "chalk";
import Table from "cli-table3";
import  ProgressBar from "progress";

export default class Run {
	engines: Engine[] = [];
	positions: PositionConfigData[];
	results: PositionResult[] = [];
	isSilent: boolean = false;
	progressBar;

	constructor(engines: EngineConfigData[], positions: PositionConfigData[], isSilent?: boolean) {
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
		this.isSilent = isSilent || false;

		logger.debug(`Setup run object with ${this.engines.length} engines and ${this.positions.length} positions completed.`);

		this.testEngines();

		this.progressBar = new ProgressBar(`Running ${this.engines.length} engines with ${this.positions.length} positions: :bar :percent (Position :pos of ${this.positions.length} with :engine)`, { total: this.positions.length * this.engines.filter((engine) => engine.status === "success").length });

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

		if (!this.isSilent) this.printEngineStatus();
	}

	async startRun(): Promise<void> {
		logger.debug("Starting run ...");
		for (let i = 0; i < this.positions.length; i++) {
			const position = this.positions[i];

			for (let j = 0; j < this.engines.length; j++) {
				const engine = this.engines[j];

				if (this.isSilent) {
					this.progressBar.tick({
						"pos": i + 1,
						"engine": engine.name,
					});
				}

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
			if (!this.isSilent) {
				logger.nativeLog(chalk.underline(`Position ${i + 1} of ${this.positions.length} (fen: ${position.fen} | ):`));
				this.printPositionResults(position);
			}
		}

		if (!this.isSilent) this.printOverallResults();
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

		logger.nativeLog(resultTable.toString());
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

		logger.nativeLog(chalk.underline("Overall performance:"));
		logger.nativeLog(overallTable.toString());
	}
}
