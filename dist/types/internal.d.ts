export interface IndexNode {
    id: string;
    value: any;
    score: number;
    children: Map<string, IndexNode>;
}
export interface TokenInfo {
    value: string;
    type: 'word' | 'operator' | 'modifier' | 'delimiter';
    position: number;
    length: number;
}
