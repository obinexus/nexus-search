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