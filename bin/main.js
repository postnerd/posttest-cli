#! /usr/bin/env node
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import figlet from 'figlet';
import { spawn } from 'child_process';
import ProgressBar from 'progress';

const logger = {
    isDebug: false,
    log: (message) => {
        console.log(chalk.green(message));
    },
    nativeLog(message) {
        console.log(message);
    },
    debug: (message) => {
        if (logger.isDebug)
            console.debug(chalk.blue(message));
    },
    error: (message) => {
        console.error(chalk.red(message));
    },
    setDebug(isDebug) {
        this.isDebug = isDebug;
        if (isDebug) {
            logger.debug("Debug mode is enabled.");
        }
    },
};
function getOptionsFromArgv(input) {
    logger.isDebug = true;
    let enginesPath = undefined;
    let positionsPath = undefined;
    let isDebug = false;
    let addStockfish = false;
    let isSilent = false;
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
    const options = {
        enginesPath: enginesPath,
        positionsPath: positionsPath,
        isDebug: isDebug,
        addStockfish: addStockfish,
        isSilent: isSilent,
    };
    return options;
}
function getPositionsConfigData(positionsPath) {
    const positionsData = [];
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
    data.forEach((position) => {
        positionsData.push({
            fen: position.fen,
            depth: position.depth,
        });
    });
    return positionsData;
}
function getEnginesConfigData(enginesPath) {
    const enginesData = [];
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
    data.forEach((eninge) => {
        enginesData.push({
            executable: eninge.executable,
            strings: eninge.strings,
        });
    });
    return enginesData;
}

function getUCIEngineName(engine) {
    let name = "";
    return new Promise((resolve, reject) => {
        // TODO: Reject after 5 seconds, if engine doesn't respond
        const engineProcess = spawn(engine.executable, engine.strings);
        if (engineProcess.stdout === null || engineProcess.stderr === null || engineProcess.stdin === null)
            throw new Error("engines stdout, stdin or stderr is null");
        engineProcess.stdout.on("data", (data) => {
            const lines = data.toString().split("\n");
            for (let i = 0; i < lines.length; i++) {
                const lineData = lines[i].split(" ");
                for (let i = 0; i < lineData.length; i++) {
                    if (lineData[i] === "id" && lineData[i + 1] === "name") {
                        name = lineData.slice(i + 2).join(" ");
                    }
                    else if (lineData[i] === "uciok") {
                        engineProcess.stdin.end();
                    }
                }
            }
        });
        engineProcess.stderr.on("data", (data) => {
            logger.debug(`${data}`);
        });
        engineProcess.on("error", (error) => {
            reject({
                status: "error",
                error: error.message,
            });
        });
        engineProcess.on("close", (code) => {
            logger.debug(`Child process exited with code ${code}`);
            if (name === "") {
                reject({
                    status: "error",
                    error: "Couldn't get engine name",
                });
            }
            else {
                resolve({
                    status: "success",
                    name: name,
                });
            }
        });
        engineProcess.stdin.write("uci\n");
    });
}
function getUCIPositionInfo(engine, fen, depth) {
    return new Promise((resolve, reject) => {
        let nps = 0;
        let nodes = 0;
        let time = 0;
        let bestMove = "";
        // TODO: Reject after X seconds, if engine doesn't respond
        const engineProcess = spawn(engine.executable, engine.strings);
        if (engineProcess.stdout === null || engineProcess.stderr === null || engineProcess.stdin === null)
            throw new Error("engines stdout, stdin or stderr is null");
        engineProcess.stdout.on("data", (data) => {
            const lines = data.toString().split("\n");
            for (let i = 0; i < lines.length; i++) {
                logger.debug(lines[i]);
                const lineData = lines[i].split(" ");
                for (let i = 0; i < lineData.length; i++) {
                    if (lineData[i] === "nps") {
                        nps = parseInt(lineData[i + 1]);
                    }
                    else if (lineData[i] === "nodes") {
                        nodes = parseInt(lineData[i + 1]);
                    }
                    else if (lineData[i] === "time") {
                        time = parseInt(lineData[i + 1]);
                    }
                    else if (lineData[i] === "bestmove") {
                        bestMove = lineData[i + 1];
                        engineProcess.stdin.end();
                    }
                }
            }
        });
        engineProcess.stderr.on("data", (data) => {
            logger.debug(`${data}`);
        });
        engineProcess.on("error", (error) => {
            reject(error.message);
        });
        engineProcess.on("close", (code) => {
            logger.debug(`Child process exited with code ${code}`);
            if (bestMove === "" || nodes === 0) {
                reject("Couldn't get position infos");
            }
            resolve({
                fen: fen,
                depth: depth,
                nps: nps,
                nodes: nodes,
                time: time,
                bestMove: bestMove,
                engineId: engine.id,
                status: "success",
            });
        });
        engineProcess.stdin.write(`position fen ${fen}\n`);
        engineProcess.stdin.write(`go depth ${depth}\n`);
    });
}

class Run {
    engines = [];
    positions;
    results = [];
    isSilent = false;
    progressBar;
    constructor(engines, positions, isSilent) {
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
    getEngineNameById(id) {
        return this.engines[id].name;
    }
    testEngines() {
        logger.debug("Testing engines ...");
        this.engines.forEach(async (engine) => {
            try {
                let name = await getUCIEngineName(engine);
                engine.name = name.name;
                logger.debug(`UCI spoort for engine ${name.name} detected.`);
            }
            catch (error) {
                logger.error(`Engine with executable "${engine.executable}" and strings "${engine.strings}" doesn't work.`);
                engine.status = "error";
            }
        });
        if (!this.isSilent)
            this.printEngineStatus();
    }
    async startRun() {
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
                    const result = await getUCIPositionInfo(engine, fen, depth);
                    this.results.push(result);
                }
                catch (error) {
                    const result = {
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
        if (!this.isSilent)
            this.printOverallResults();
    }
    printEngineStatus() {
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
    printPositionResults(positionToPrint) {
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
                resultTable.push([chalk.red(this.getEngineNameById(result.engineId), +" (failed)"), "--", "--", "--", "--"]);
            }
        });
        logger.nativeLog(resultTable.toString());
    }
    printOverallResults() {
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

logger.nativeLog(figlet.textSync("posttest-cli"));
const options = getOptionsFromArgv(process.argv.slice(2));
logger.setDebug(options.isDebug);
const positionsConfigData = getPositionsConfigData(options.positionsPath);
const enginesConfigData = getEnginesConfigData(options.enginesPath);
if (options.addStockfish) {
    enginesConfigData.push({
        executable: "/usr/local/bin/node",
        strings: ["./node_modules/stockfish/src/stockfish-nnue-16.js"],
    });
}
new Run(enginesConfigData, positionsConfigData, options.isSilent);
