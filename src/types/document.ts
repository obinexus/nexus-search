export interface DocumentLink {
  fromId: string;
  toId: string;
  weight: number;
}

export interface DocumentRank {
  id: string;
  rank: number;
  incomingLinks: number;
  outgoingLinks: number;
}

export interface DocumentData {
  content: string;
  metadata: Record<string, unknown>;
  [key: string]: unknown;
}

export interface IndexedDocument {
  id: string;
  fields: Record<string, string>;
  metadata?: Record<string, unknown>;
}
