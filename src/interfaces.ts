import fs from "fs";

export interface Options {
	enginesPath: string,
	positionsPath: string,
    outputPath: string | undefined,
	isDebug: boolean,
    isSilent: boolean,
    addStockfish: boolean,
}

export interface Logger {
	isDebug: boolean,
	isSilent: boolean,
	outputPath: string | undefined,
	outputStream: fs.WriteStream | undefined,
	progressBar: ProgressBar | undefined,
	log: (message: unknown, addToOutput?: boolean) => void,
	debug: (message: unknown) => void,
	success: (message: unknown) => void,
	error: (message: unknown) => void,
	updateProgressBar: (eninge: string, pos: number) => void,
	setDebug: (isDebug: boolean) => void,
	setSilent: (isSilent: boolean) => void,
	setOutputPath: (outputPath: string) => void,
	setProgressBar: (engineCount: number, positionCount: number) => void,
}

export interface PositionConfigData {
    fen: string,
    depth: number,
}

export interface EngineConfigData {
    executable: string,
    strings: string[],
}

export interface Engine {
    id: number,
    name: string,
    executable: string,
    strings: string[],
    status: "success" | "error",
}

export interface PositionResult {
    fen: string,
    depth: number,
    nps: number,
    nodes: number,
    time: number,
    bestMove: string,
    engineId: number,
    status: "success" | "error",
}

export interface EngineNamePromise {
    status: "success" | "error",
    error?: string,
    name?: string,
}
