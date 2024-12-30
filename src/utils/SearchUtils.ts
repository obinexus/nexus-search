import { IndexedDocument } from "@/storage";
import { 
    IndexNode, 
    OptimizationResult, 
    SearchableDocument,
    DocumentContent, 
    DocumentValue,
    RegexSearchResult,
    RegexOptions
} from "@/types";

/**
 * Enhanced regex search configuration
 */
interface RegexSearchConfig {
    maxDepth?: number;
    timeoutMs?: number;
    caseSensitive?: boolean;
    wholeWord?: boolean;
}

/**
 * Performs an optimized Breadth-First Search traversal with regex matching
 */
export function bfsRegexTraversal(
    root: IndexNode,
    pattern: string | RegExp,
    maxResults: number = 10,
    config: RegexSearchConfig = {}
): RegexSearchResult[] {
    const {
        maxDepth = 50,
        timeoutMs = 5000,
        caseSensitive = false,
        wholeWord = false
    } = config;

    const regex = createRegexPattern(pattern, { caseSensitive, wholeWord });
    const results: RegexSearchResult[] = [];
    const queue: Array<{ 
        node: IndexNode; 
        matched: string; 
        depth: number;
        path: string[];
    }> = [];
    const visited = new Set<string>();
    const startTime = Date.now();

    queue.push({ 
        node: root, 
        matched: '', 
        depth: 0,
        path: []
    });

    while (queue.length > 0 && results.length < maxResults) {
        // Check timeout
        if (Date.now() - startTime > timeoutMs) {
            console.warn('BFS regex search timeout');
            break;
        }

        const current = queue.shift()!;
        const { node, matched, depth, path } = current;

        if (depth > maxDepth) continue;

        // Process matches
        if (regex.test(matched) && node.id && !visited.has(node.id)) {
            results.push({
                id: node.id,
                score: calculateRegexMatchScore(node, matched, regex),
                matched,
                path: [...path],
                positions: findMatchPositions(matched, regex)
            });
            visited.add(node.id);
        }

        // Add children to queue with breadth-first ordering
        for (const [char, childNode] of node.children.entries()) {
            queue.push({
                node: childNode,
                matched: matched + char,
                depth: depth + 1,
                path: [...path, char]
            });
        }
    }

    return results.sort((a, b) => b.score - a.score);
}

/**
 * Performs an optimized Depth-First Search traversal with regex matching
 */
export function dfsRegexTraversal(
    root: IndexNode,
    pattern: string | RegExp,
    maxResults: number = 10,
    config: RegexSearchConfig = {}
): RegexSearchResult[] {
    const {
        maxDepth = 50,
        timeoutMs = 5000,
        caseSensitive = false,
        wholeWord = false
    } = config;

    const regex = createRegexPattern(pattern, { caseSensitive, wholeWord });
    const results: RegexSearchResult[] = [];
    const visited = new Set<string>();
    const startTime = Date.now();

    function dfs(
        node: IndexNode, 
        matched: string, 
        depth: number,
        path: string[]
    ): void {
        // Early termination conditions
        if (results.length >= maxResults || 
            depth > maxDepth || 
            Date.now() - startTime > timeoutMs) {
            return;
        }

        // Process matches
        if (regex.test(matched) && node.id && !visited.has(node.id)) {
            results.push({
                id: node.id,
                score: calculateRegexMatchScore(node, matched, regex),
                matched,
                path: [...path],
                positions: findMatchPositions(matched, regex)
            });
            visited.add(node.id);
        }

        // Explore children depth-first
        for (const [char, childNode] of node.children.entries()) {
            dfs(
                childNode, 
                matched + char, 
                depth + 1,
                [...path, char]
            );
        }
    }

    dfs(root, '', 0, []);
    return results.sort((a, b) => b.score - a.score);
}

/**
 * Helper function to create a properly configured regex pattern
 */
function createRegexPattern(
    pattern: string | RegExp,
    options: { caseSensitive?: boolean; wholeWord?: boolean }
): RegExp {
    const { caseSensitive = false, wholeWord = false } = options;
    
    if (pattern instanceof RegExp) {
        const flags = `${caseSensitive ? '' : 'i'}${pattern.global ? 'g' : ''}`;
        return new RegExp(pattern.source, flags);
    }

    let source = pattern.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    if (wholeWord) {
        source = `\\b${source}\\b`;
    }

    return new RegExp(source, caseSensitive ? 'g' : 'ig');
}

/**
 * Calculate a score for regex matches based on various factors
 */
function calculateRegexMatchScore(
    node: IndexNode,
    matched: string,
    regex: RegExp
): number {
    const baseScore = node.score || 1;
    const matches = matched.match(regex) || [];
    const matchCount = matches.length;
    const matchQuality = matches.reduce((sum, match) => sum + match.length, 0) / matched.length;
    const depthPenalty = 1 / (node.depth || 1);

    return baseScore * matchCount * matchQuality * depthPenalty;
}

/**
 * Find all match positions in the text for highlighting
 */
function findMatchPositions(text: string, regex: RegExp): Array<[number, number]> {
    const positions: Array<[number, number]> = [];
    let match: RegExpExecArray | null;
    
    // Create a new regex with global flag for iteration
    const globalRegex = new RegExp(regex.source, regex.flags + (regex.global ? '' : 'g'));
    
    while ((match = globalRegex.exec(text)) !== null) {
        positions.push([match.index, match.index + match[0].length]);
    }
    
    return positions;
}

/**
 * Creates searchable fields from a document based on specified field paths
 */
export function createSearchableFields(
    document: SearchableDocument,
    fields: string[]
): Record<string, string> {
    if (!document?.content || !Array.isArray(fields)) {
        return {};
    }

    return fields.reduce((acc, field) => {
        try {
            const value = getNestedValue(document.content, field);
            if (value !== undefined) {
                acc[field] = normalizeFieldValue(value);
            }
        } catch (error) {
            console.warn(`Error processing field ${field}:`, error);
        }
        return acc;
    }, {} as Record<string, string>);
}

/**
 * Normalizes field values into searchable strings
 */
export function normalizeFieldValue(value: DocumentValue): string {
    if (value === null || value === undefined) {
        return '';
    }

    try {
        if (typeof value === 'string') {
            return value.toLowerCase().trim();
        }

        if (Array.isArray(value)) {
            return value
                .map(normalizeFieldValue)
                .filter(Boolean)
                .join(' ');
        }

        if (typeof value === 'object') {
            return Object.values(value)
                .map(normalizeFieldValue)
                .filter(Boolean)
                .join(' ');
        }

        return String(value).toLowerCase().trim();
    } catch (error) {
        console.warn('Error normalizing field value:', error);
        return '';
    }
}

/**
 * Retrieves a nested value from an object using dot notation path
 */
export function getNestedValue(
    obj: DocumentContent,
    path: string
): DocumentValue | undefined {
    if (!obj || !path) {
        return undefined;
    }

    try {
        return path.split('.').reduce((current: any, key) => {
            if (current === null || typeof current !== 'object') {
                return undefined;
            }
            
            if (Array.isArray(current)) {
                const index = parseInt(key, 10);
                return isNaN(index) ? undefined : current[index];
            }
            
            return current[key];
        }, obj);
    } catch (error) {
        console.warn(`Error getting nested value for path ${path}:`, error);
        return undefined;
    }
}

/**
 * Optimizes an array of indexable documents
 */
export function optimizeIndex<T extends IndexedDocument>(
    data: T[]
): OptimizationResult<T> {
    if (!Array.isArray(data)) {
        return {
            data: [],
            stats: { originalSize: 0, optimizedSize: 0, compressionRatio: 1 }
        };
    }

    try {
        const uniqueMap = new Map<string, T>();
        data.forEach(item => {
            const key = JSON.stringify(sortObjectKeys(item));
            uniqueMap.set(key, item);
        });

        const sorted = Array.from(uniqueMap.values())
            .sort((a, b) => generateSortKey(a).localeCompare(generateSortKey(b)));

        return {
            data: sorted,
            stats: {
                originalSize: data.length,
                optimizedSize: sorted.length,
                compressionRatio: data.length ? sorted.length / data.length : 1
            }
        };
    } catch (error) {
        console.warn('Error optimizing index:', error);
        return {
            data,
            stats: {
                originalSize: data.length,
                optimizedSize: data.length,
                compressionRatio: 1
            }
        };
    }
}

/**
 * Helper function to sort object keys recursively
 */
export function sortObjectKeys<T extends object>(obj: T): T {
    if (!obj || typeof obj !== 'object') {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map(sortObjectKeys) as unknown as T;
    }

    return Object.keys(obj)
        .sort()
        .reduce((sorted, key) => {
            (sorted as any)[key] = sortObjectKeys((obj as any)[key]);
            return sorted;
        }, {} as T);
}

/**
 * Helper function to generate consistent sort keys for documents
 */
export function generateSortKey(doc: IndexedDocument): string {
    if (!doc?.id || !doc.content) {
        return '';
    }

    try {
        return `${doc.id}:${Object.keys(doc.content).sort().join(',')}`;
    } catch {
        return doc.id;
    }
}

/**
 * Creates an indexed document
 */
export function createDocument({ 
    id, 
    fields, 
    metadata = {} 
}: { 
    id: string; 
    fields: Record<string, any>; 
    metadata?: Record<string, any> 
}) {
    return {
        id,
        fields,
        metadata: {
            indexed: Date.now(),
            lastModified: Date.now(),
            ...metadata
        }
    };
}

/**
 * Creates a searchable document
 */
export function createSearchableDocument({ 
    id, 
    content, 
    metadata = {} 
}: { 
    id: string; 
    content: Record<string, DocumentValue>; 
    metadata?: Record<string, DocumentValue> 
}) {
    return { id, content, metadata };
}