import { DocumentLink, DocumentRank } from '../types/document';
export declare class ScoringUtils {
    private static readonly DAMPING_FACTOR;
    private static readonly MAX_ITERATIONS;
    private static readonly CONVERGENCE_THRESHOLD;
    static calculateDocumentRanks(documents: Map<string, any>, links: DocumentLink[]): Map<string, DocumentRank>;
}
