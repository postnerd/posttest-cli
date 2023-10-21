import { spawn } from "child_process";
import { logger } from "./utils.js";

import { EngineConfigData, EngineNamePromise, PositionResult } from "./interfaces.js";

export function getUCIEngineName(engineConfig: EngineConfigData): Promise<EngineNamePromise> {
	let name = "";
	return new Promise<EngineNamePromise>((resolve, reject) => {
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

export function getUCIPositionInfo(engineConfig: EngineConfigData, fen: string, depth: number): Promise<PositionResult> {
	return new Promise<PositionResult>((resolve, reject) => {
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
