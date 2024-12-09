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


export type PrimitiveValue = string | number | boolean | null;
export type ArrayValue = PrimitiveValue[];
export type ComplexValue = Record<string, PrimitiveValue | ArrayValue>;
export type DocumentValue = PrimitiveValue | ArrayValue | ComplexValue;
export type DocumentMetadata = Record<string, DocumentValue>;

export interface IndexableDocument {
    id: string;
    content: Record<string, DocumentValue>;
    metadata?: DocumentMetadata;
}