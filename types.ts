
export interface GroundingChunk {
  web: {
    uri: string;
    title: string;
  };
}

export interface LiveUpdate {
  title: string;
  summary: string;
}

export interface KeywordData {
  name: string;
  count: number;
}
