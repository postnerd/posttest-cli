export interface Options {
	enginesPath: string,
	positionsPath: string,
	isDebug: boolean
    addStockfish: boolean,
}

export interface PositionConfigData {
    fen: string,
    depth: number,
}

export interface EngineConfigData {
    executable: string,
    strings: string[],
}

export interface PositionResult {
    fen: string,
    depth: number,
    nps: number,
    nodes: number,
    time: number,
    bestMove: string,
    status: "success" | "error",
}

export interface EngineResult {
	id: number,
	name: string,
	positions: PositionResult[],
    status: "success" | "error",
}

export interface EngineNamePromise {
    status: "success" | "error",
    error?: string,
    name?: string,
}
