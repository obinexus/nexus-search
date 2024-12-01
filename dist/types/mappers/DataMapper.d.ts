export declare class DataMapper {
    private dataMap;
    constructor();
    mapData(key: string, documentId: string): void;
    getDocuments(key: string): Set<string>;
    getAllKeys(): string[];
    clear(): void;
}
