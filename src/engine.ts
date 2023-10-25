import { ChildProcess, spawn } from "child_process";
import { logger } from "./utils.js";

import { Engine, EngineNamePromise, PositionResult } from "./interfaces.js";

export function getUCIEngineName(engine: Engine): Promise<EngineNamePromise> {
	let name = "";

	return new Promise<EngineNamePromise>((resolve, reject) => {
		// TODO: Reject after 5 seconds, if engine doesn't respond
		const engineProcess: ChildProcess = spawn(engine.executable, engine.strings);

		if (engineProcess.stdout === null || engineProcess.stderr === null || engineProcess.stdin === null) throw new Error("engines stdout, stdin or stderr is null");

		engineProcess.stdout.on("data", (data) => {
			const lines = data.toString().split("\n");

			for (let i = 0; i < lines.length; i++) {
				const lineData = lines[i].split(" ");
				for (let i = 0; i < lineData.length; i++) {
					if (lineData[i] === "id" && lineData[i + 1] === "name") {
						name = lineData.slice(i + 2).join(" ");
					}
					else if (lineData[i] === "uciok") {
						engineProcess.stdin!.end();
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

export function getUCIPositionInfo(engine: Engine, fen: string, depth: number): Promise<PositionResult> {
	return new Promise<PositionResult>((resolve, reject) => {
		let nps = 0;
		let nodes = 0;
		let time = 0;
		let bestMove = "";

		// TODO: Reject after X seconds, if engine doesn't respond
		const engineProcess: ChildProcess = spawn(engine.executable, engine.strings);

		if (engineProcess.stdout === null || engineProcess.stderr === null || engineProcess.stdin === null) throw new Error("engines stdout, stdin or stderr is null");

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
						engineProcess.stdin!.end();
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
