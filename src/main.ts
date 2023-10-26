#! /usr/bin/env node
import { Options } from "./interfaces.js";
import { getEnginesConfigData, getOptionsFromArgv, getPositionsConfigData, logger } from "./utils.js";
import figlet from "figlet";
import Run from "./run.js";

import { name, version, author } from "../package.json";

logger.log(figlet.textSync("posttest-cli"));
logger.log(`${name} ${version} by ${author} \n`);

const options: Options = getOptionsFromArgv(process.argv.slice(2));

logger.setDebug(options.isDebug);
logger.setSilent(options.isSilent);
if (options.outputPath) {
	await logger.setOutputPath(options.outputPath);
}

const positionsConfigData = getPositionsConfigData(options.positionsPath);
const enginesConfigData = getEnginesConfigData(options.enginesPath);

if (options.addStockfish) {
	enginesConfigData.push({
		executable: "/usr/local/bin/node",
		strings: ["./node_modules/stockfish/src/stockfish-nnue-16.js"],
	});
}

const run = new Run(enginesConfigData, positionsConfigData);
await run.go();

if (logger.outputStream) {
	logger.outputStream.end();
}
