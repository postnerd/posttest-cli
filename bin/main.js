#! /usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import Table from 'cli-table3';
import figlet from 'figlet';

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

function getUCIEngineName(engineConfig) {
    let name = "";
    return new Promise((resolve, reject) => {
        // TODO: Reject after 5 seconds, if engine doesn't respond
        const engine = spawn(engineConfig.executable, engineConfig.strings);
        engine.stdout.on("data", (data) => {
            const lines = data.toString().split("\n");
            for (let i = 0; i < lines.length; i++) {
                const lineData = lines[i].split(" ");
                for (let i = 0; i < lineData.length; i++) {
                    if (lineData[i] === "id" && lineData[i + 1] === "name") {
                        name = lineData.slice(i + 2).join(" ");
                    }
                    else if (lineData[i] === "uciok") {
                        engine.stdin.end();
                    }
                }
            }
        });
        engine.stderr.on("data", (data) => {
            logger.debug(`${data}`);
        });
        engine.on("error", (error) => {
            reject({
                status: "error",
                error: error.message,
            });
        });
        engine.on("close", (code) => {
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
        engine.stdin.write("uci\n");
    });
}
function getUCIPositionInfo(engineConfig, fen, depth) {
    return new Promise((resolve, reject) => {
        let nps = 0;
        let nodes = 0;
        let time = 0;
        let bestMove = "";
        // TODO: Reject after X seconds, if engine doesn't respond
        const engine = spawn(engineConfig.executable, engineConfig.strings);
        engine.stdout.on("data", (data) => {
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
                        engine.stdin.end();
                    }
                }
            }
        });
        engine.stderr.on("data", (data) => {
            logger.debug(`${data}`);
        });
        engine.on("error", (error) => {
            reject(error.message);
        });
        engine.on("close", (code) => {
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
                status: "success",
            });
        });
        engine.stdin.write(`position fen ${fen}\n`);
        engine.stdin.write(`go depth ${depth}\n`);
    });
}

console.log(figlet.textSync("posttest-cli"));
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
const results = [];
for (let i = 0; i < enginesConfigData.length; i++) {
    const engineResult = {
        id: i,
        name: "engine" + i,
        positions: [],
        status: "success",
    };
    results.push(engineResult);
    try {
        let name = await getUCIEngineName(enginesConfigData[i]);
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
            const result = await getUCIPositionInfo(enginesConfigData[j], fen, depth);
            engineResult.positions.push(result);
            resultTable.push([engineResult.name, result.time, result.nodes, result.nps, result.bestMove]);
        }
        catch (error) {
            const result = {
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
