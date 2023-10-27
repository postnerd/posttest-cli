import fs from "fs";
import path from "path";
import chalk from "chalk";
import figlet from "figlet";
import Table from "cli-table3";
import ProgressBar from "progress";
import stripAnsi from "strip-ansi";

import { Options, PositionConfigData, EngineConfigData, Logger } from "./interfaces.js";

export const logger: Logger = {
	isDebug: false,
	isSilent: false,
	outputPath: undefined,
	outputStream: undefined,
	progressBar: undefined,

	log: (message: unknown, addToOutput?: boolean) => {
		if (!logger.isSilent) console.log(message);
		if (addToOutput) {
			logger.outputStream?.write(stripAnsi(message + "\n"));
		}
	},
	debug: (message: unknown) => {
		if (logger.isDebug)
			console.debug(chalk.cyan(message));
	},
	success: (message: unknown) => {
		console.log(chalk.green(message));
	},
	error: (message: unknown) => {
		console.error(chalk.red(message));
	},
	updateProgressBar: (eninge: string, pos: number) => {
		if (!logger.isSilent) return;

		logger.progressBar?.tick({
			engine: eninge,
			pos: pos,
		});
	},
	setDebug: (isDebug: boolean) => {
		logger.isDebug = isDebug;

		if (isDebug) {
			logger.debug("Debug mode is enabled.");
		}
	},
	setSilent: (isSilent) => {
		logger.isSilent = isSilent;
	},
	setOutputPath: (outputPath: string): Promise<void> => {
		return new Promise<void>((resolve, reject) => {
			logger.outputPath = outputPath;
			logger.outputStream = fs.createWriteStream(outputPath, { flags: "a" });
			logger.outputStream.on("error", (error) => {
				logger.error(`Couldn't write to output file "${outputPath}".`);
				logger.error(error);
				reject();
			});
			logger.outputStream.on("open", () => {
				logger.success(`Output will be written to file "${outputPath}".`);
				logger.outputStream?.write(figlet.textSync("posttest-cli") + "\n");
				logger.outputStream?.write(`posttest-cli run from ${new Date(Date.now()).toLocaleString()} \n`);
				resolve();
			});
			logger.outputStream.on("close", () => {
				logger.debug(`Output file "${outputPath}" was closed.`);
			});
		});
	},
	setProgressBar: (engineCount: number, positionCount: number) => {
		logger.progressBar = new ProgressBar(`Running ${engineCount} engine(s) with ${positionCount} position(s): :bar :percent (Position :pos of ${positionCount} with :engine)`, { total: positionCount * engineCount });
	},
};

export function getOptionsFromArgv(input: string[]): Options {
	logger.isDebug = true;
	let enginesPath: string = "engines.json";
	let positionsPath: string = "positions.json";
	let outputPath: string | undefined = undefined;
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
		else if (option === "-o") {
			outputPath = input[i + 1];
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

	const options: Options = {
		enginesPath: enginesPath,
		positionsPath: positionsPath,
		outputPath: outputPath,
		isDebug: isDebug,
		addStockfish: addStockfish,
		isSilent: isSilent,
	};

	return options;
}

export function printUsage(): void {
	logger.log(chalk.underline("Usage:"));
	const infoTable = new Table({
		head: [chalk.cyan("option"), chalk.cyan("description")],
		style: {
			head: [],
		},
	});

	infoTable.push(["-e", "Optional: Path to engines config file (default: engines.json)"]);
	infoTable.push(["-p", "Optional: Path to positions config file (default: positions.json)"]);
	infoTable.push(["-o", "Optional: Path to output file for storing results"]);
	infoTable.push(["-d", "Optional: activate debug mode"]);
	infoTable.push(["-sf", "Optional: add stockfish engine"]);
	infoTable.push(["-s", "Optional: silent mode to just show a progress"]);

	logger.log(infoTable.toString());

	logger.log("");
	logger.log(chalk.underline("Example for global installation:"));
	logger.log(chalk.italic("posttest -e engines.config.example.json -p positions.config.example.json -d -sf"));
	logger.log("");
	logger.log(chalk.underline("Example for local installation:"));
	logger.log(chalk.italic("npm start -- -e engines.config.example.json -p positions.config.example.json -d -sf"));
}

export function getPositionsConfigData(positionsPath: string): PositionConfigData[] {
	const positionsData: PositionConfigData[] = [];
	const url = path.join(process.cwd(), positionsPath);
	let data;

	try {
		data = JSON.parse(fs.readFileSync(url).toString());
	}
	catch (error) {
		logger.error(`Couldn't load position config file from "${url}". Please check name and location of your config file or specify a config file with the -p option.`);
		logger.log("");
		printUsage();
		process.exit();
	}

	data.forEach((position: PositionConfigData) => {
		if (position.depth === undefined || position.fen === undefined) {
			logger.error(`Position config file "${url}" has not the correct format or is missing some data.`);
			process.exit();
		}

		if (typeof position.depth !== "number" || typeof position.fen !== "string") {
			logger.error(`Position config file "${url}" has not the correct format.`);
			process.exit();
		}

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
		logger.error(`Couldn't load position config file from "${url}". Please check name and location of your config file or specify a config file with the -e option.`);
		logger.log("");
		printUsage();
		process.exit();
	}

	data.forEach((engine: EngineConfigData) => {
		if (engine.executable === undefined || engine.strings === undefined) {
			logger.error(`Engine config file "${url}" has not the correct format or is missing some data.`);
			process.exit();
		}

		if (typeof engine.executable !== "string" || typeof engine.strings !== "object") {
			logger.error(`Engine config file "${url}" has not the correct format.`);
			process.exit();
		}

		for (let i = 0; i < engine.strings.length; i++) {
			const string = engine.strings[i];

			if (typeof string !== "string") {
				logger.error(`Arguments for engine executabel '${engine.executable}' have to be strings. Found wrong format in "${url}".`);
				process.exit();
			}
		}

		if (engine.name !== undefined && typeof engine.name !== "string") {
			logger.error(`Engine name has to be a string. Found wrong format in "${url}".`);
			process.exit();
		}

		enginesData.push({
			executable: engine.executable,
			strings: engine.strings,
			name: engine.name,
		});
	});

	return enginesData;
}
