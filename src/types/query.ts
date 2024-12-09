export type QueryToken = {
    type: 'term' | 'operator' | 'modifier';
    value: string;
  };