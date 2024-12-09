export interface ScoringWeights {
    textMatch: number;
    documentRank: number;
    tfIdf: number;
}

export interface DocumentScore {
    id: string;
    score: number;
    matches: string[];
    rank?: number;
}