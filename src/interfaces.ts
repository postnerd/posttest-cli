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
