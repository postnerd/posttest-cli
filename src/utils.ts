import fs from "fs";
import path from "path";
import chalk from "chalk";
import Table from "cli-table3";

import { Options, PositionConfigData, EngineConfigData } from "./interfaces.js";

export const logger = {
	isDebug: false,

	log: (message: any) => {
		console.log(chalk.green(message));
	},
	nativeLog(message: any) {
		console.log(message);
	},
	debug: (message: any) => {
		if (logger.isDebug)
			console.debug(chalk.blue(message));
	},
	error: (message: any) => {
		console.error(chalk.red(message));
	},
	setDebug(isDebug: boolean) {
		this.isDebug = isDebug;

		if (isDebug) {
			logger.debug("Debug mode is enabled.");
		}
	},
};

export function getOptionsFromArgv(input: string[]): Options {
	logger.isDebug = true;
	let enginesPath: string | undefined = undefined;
	let positionsPath: string | undefined = undefined;
	let isDebug: boolean = false;
	let addStockfish: boolean = false;
	let isSilent: boolean = false;

	for (let i = 0; i < input.length; i++) {
		const option = input[i];

		if (option === "-e") {
			enginesPath = input[i + 1];
		}
		else if (option === "-p") {
			positionsPath = input[i + 1];
		}
		else if (option === "-d") {
			isDebug = true;
		}
		else if (option === "-sf") {
			addStockfish = true;
		}
		else if (option === "-s") {
			isSilent = true;
		}
	}

	if (enginesPath === undefined || positionsPath === undefined) {
		logger.error("Missing some mandatory options like -p or -e.");
		logger.nativeLog("");

		logger.nativeLog(chalk.underline("Usage:"));
		const infoTable = new Table({
			head: [chalk.blue("option"), chalk.blue("description")],
			style: {
				head: [],
			},
		});

		infoTable.push(["-e", "Path to engines config file"]);
		infoTable.push(["-p", "Path to positions config file"]);
		infoTable.push(["-d", "Optional: activate debug mode"]);
		infoTable.push(["-sf", "Optional: add stockfish engine"]);
		infoTable.push(["-s", "Optional: silent mode to just show a progress"]);

		logger.nativeLog(infoTable.toString());

		logger.nativeLog("");
		logger.nativeLog(chalk.underline("Example for global installation:"));
		logger.nativeLog(chalk.italic("posttest -e engines.config.example.json -p positions.config.example.json -d -sf"));
		logger.nativeLog("");
		logger.nativeLog(chalk.underline("Example for local installation:"));
		logger.nativeLog(chalk.italic("npm start -- -e engines.config.example.json -p positions.config.example.json -d -sf"));
		process.exit();
	}

	const options: Options = {
		enginesPath: enginesPath,
		positionsPath: positionsPath,
		isDebug: isDebug,
		addStockfish: addStockfish,
		isSilent: isSilent,
	};

	return options;
}

export function getPositionsConfigData(positionsPath: string): PositionConfigData[] {
	const positionsData: PositionConfigData[] = [];
	const url = path.join(process.cwd(), positionsPath);
	let data;

	try {
		data = JSON.parse(fs.readFileSync(url).toString());
	}
	catch (error) {
		logger.error(`Couldn't load position config file from "${url}". Please check name and location of your config file.`);
		process.exit();
	}

	// TODO: Check for correct format
	data.forEach((position: PositionConfigData) => {
		positionsData.push({
			fen: position.fen,
			depth: position.depth,
		});
	});

	return positionsData;
}

export function getEnginesConfigData(enginesPath: string): EngineConfigData[] {
	const enginesData: EngineConfigData[] = [];
	const url = path.join(process.cwd(), enginesPath);
	let data;

	try {
		data = JSON.parse(fs.readFileSync(url).toString());
	}
	catch (error) {
		logger.error(`Couldn't load position config file from "${url}". Please check name and location of your config file.`);
		process.exit();
	}

	// TODO: Check for correct format
	data.forEach((eninge: EngineConfigData) => {
		enginesData.push({
			executable: eninge.executable,
			strings: eninge.strings,
		});
	});

	return enginesData;
}
