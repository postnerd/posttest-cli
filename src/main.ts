#! /usr/bin/env node
import { Options, EngineResult, EngineNamePromise, PositionResult } from "./interfaces.js";
import { getUCIEngineName, getUCIPositionInfo } from "./engine.js";
import { getEnginesConfigData, getOptionsFromArgv, getPositionsConfigData, logger } from "./utils.js";
import Table from "cli-table3";
import chalk from "chalk";
import figlet from "figlet";

console.log(figlet.textSync("posttest-cli"));

const options: Options = getOptionsFromArgv(process.argv.slice(2));

logger.setDebug(options.isDebug);

const positionsConfigData = getPositionsConfigData(options.positionsPath);
const enginesConfigData = getEnginesConfigData(options.enginesPath);

if (options.addStockfish) {
	enginesConfigData.push({
		executable: "/usr/local/bin/node",
		strings: ["./node_modules/stockfish/src/stockfish-nnue-16.js"],
	});
}

const results: EngineResult[] = [];

for (let i = 0; i < enginesConfigData.length; i++) {
	const engineResult: EngineResult = {
		id: i,
		name: "engine" + i,
		positions: [],
		status: "success",
	};

	results.push(engineResult);

	try {
		let name: EngineNamePromise = await getUCIEngineName(enginesConfigData[i]);
		if (name.name !== undefined)
			engineResult.name = name.name;
	}
	catch (error) {
		logger.error(`Couldn't get name of engine ${i} with executable "${enginesConfigData[i].executable}" and strings "${enginesConfigData[i].strings}".`);
		engineResult.status = "error";
	}
}

const engineTable = new Table({
	head: [chalk.blue("id"), chalk.blue("name"), chalk.blue("executable"), chalk.blue("strings"), chalk.blue("status")],
	style: {
		head: [],
	},
});

results.forEach((engineResult) => {
	if (engineResult.status === "success") {
		engineTable.push([engineResult.id, chalk.green(engineResult.name), enginesConfigData[engineResult.id].executable, enginesConfigData[engineResult.id].strings.join(" "), engineResult.status]);
	}
	else {
		engineTable.push([engineResult.id, chalk.red(engineResult.name), enginesConfigData[engineResult.id].executable, enginesConfigData[engineResult.id].strings.join(" "), engineResult.status]);
	}
});
logger.nativeLog(chalk.underline("Engines:"));
logger.nativeLog(engineTable.toString());

for (let i = 0; i < positionsConfigData.length; i++) {
	const position = positionsConfigData[i];

	const resultTable = new Table({
		head: [chalk.blue(`${position.fen} | depth: ${position.depth}`), chalk.blue("time"), chalk.blue("nodes"), chalk.blue("nps"), chalk.blue("best move")],
		style: {
			head: [],
		},
	});

	for (let j = 0; j < results.length; j++) {
		const engineResult = results[j];

		if (engineResult.status === "error") {
			continue;
		}

		try {
			const fen = position.fen;
			const depth = position.depth;
			const result: PositionResult = await getUCIPositionInfo(enginesConfigData[j], fen, depth);
			engineResult.positions.push(result);
			resultTable.push([engineResult.name, result.time, result.nodes, result.nps, result.bestMove]);
		}
		catch (error: any) {
			const result: PositionResult = {
				fen: position.fen,
				depth: position.depth,
				nps: 0,
				nodes: 0,
				time: 0,
				bestMove: "",
				status: "error",
			};
			engineResult.positions.push(result);
			resultTable.push([chalk.red(engineResult.name + " (failed)"), "--", "--", "--", "--"]);
			logger.error(`Couldn't get position info for engine ${engineResult.name} and fen ${position.fen}`);
		}
	}
	logger.nativeLog(chalk.underline(`Position ${i + 1} of ${positionsConfigData.length}:`));
	logger.nativeLog(resultTable.toString());
}

const overallTable = new Table({
	head: [chalk.blue("Overall"), chalk.blue("time"), chalk.blue("nodes"), chalk.blue("nps"), chalk.blue("failed")],
	style: {
		head: [],
	},
});

results.forEach((engineResult) => {
	if (engineResult.status === "error") {
		return;
	}

	let totalTime = 0;
	let totalNodes = 0;
	let failedCount = 0;

	engineResult.positions.forEach((position) => {
		totalTime += position.time;
		totalNodes += position.nodes;
		if (position.status === "error") {
			failedCount++;
		}
	});

	overallTable.push([engineResult.name, totalTime, totalNodes, Math.floor(totalNodes / totalTime * 1000), `${failedCount ? chalk.red(failedCount) : failedCount}`]);
});

logger.nativeLog(chalk.underline("Overall performance:"));
logger.nativeLog(overallTable.toString());
