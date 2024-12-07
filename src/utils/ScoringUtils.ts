import { DocumentLink, DocumentRank } from '../types/document';

export class ScoringUtils {
    private static readonly DAMPING_FACTOR = 0.85;
    private static readonly MAX_ITERATIONS = 100;
    private static readonly CONVERGENCE_THRESHOLD = 0.0001;

    static calculateDocumentRanks(
        documents: Map<string, any>,
        links: DocumentLink[]
    ): Map<string, DocumentRank> {
        const documentRanks = new Map<string, DocumentRank>();
        const adjacencyMap = new Map<string, Set<string>>();

        // Initialize ranks and adjacency
        for (const docId of documents.keys()) {
            documentRanks.set(docId, {
                id: docId,
                rank: 1 / documents.size,
                incomingLinks: 0,
                outgoingLinks: 0
            });
            adjacencyMap.set(docId, new Set());
        }

        // Build links
        for (const link of links) {
            const fromRank = documentRanks.get(link.fromId);
            const toRank = documentRanks.get(link.toId);
            if (fromRank && toRank && adjacencyMap.has(link.fromId)) {
                adjacencyMap.get(link.fromId)!.add(link.toId);
                fromRank.outgoingLinks++;
                toRank.incomingLinks++;
            }
        }

        // Iterative calculation
        let iteration = 0;
        let maxDiff = 1;

        while (iteration < this.MAX_ITERATIONS && maxDiff > this.CONVERGENCE_THRESHOLD) {
            maxDiff = 0;
            const newRanks = new Map<string, number>();

            for (const [docId, docRank] of documentRanks) {
                let newRank = (1 - this.DAMPING_FACTOR) / documents.size;
                
                // Calculate contribution from incoming links
                for (const [fromId, toIds] of adjacencyMap.entries()) {
                    if (toIds.has(docId)) {
                        const fromRank = documentRanks.get(fromId)!.rank;
                        const outgoingCount = documentRanks.get(fromId)!.outgoingLinks;
                        newRank += this.DAMPING_FACTOR * (fromRank / outgoingCount);
                    }
                }

                newRanks.set(docId, newRank);
                maxDiff = Math.max(maxDiff, Math.abs(newRank - docRank.rank));
            }

            // Update ranks
            for (const [docId, newRank] of newRanks) {
                const docRank = documentRanks.get(docId)!;
                docRank.rank = newRank;
            }

            iteration++;
        }

        return documentRanks;
    }
}
