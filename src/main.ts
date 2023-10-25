#! /usr/bin/env node
import { Options } from "./interfaces.js";
import { getEnginesConfigData, getOptionsFromArgv, getPositionsConfigData, logger } from "./utils.js";
import figlet from "figlet";
import Run from "./run.js";

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

new Run(enginesConfigData, positionsConfigData);
