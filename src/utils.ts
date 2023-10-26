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
			console.debug(chalk.blue(message));
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
	let enginesPath: string | undefined = undefined;
	let positionsPath: string | undefined = undefined;
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

	if (enginesPath === undefined || positionsPath === undefined) {
		logger.error("Missing some mandatory options like -p or -e.");
		logger.log("");

		logger.log(chalk.underline("Usage:"));
		const infoTable = new Table({
			head: [chalk.blue("option"), chalk.blue("description")],
			style: {
				head: [],
			},
		});

		infoTable.push(["-e", "Path to engines config file"]);
		infoTable.push(["-p", "Path to positions config file"]);
		infoTable.push(["-p", "Path to output file for storing results"]);
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
		process.exit();
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
