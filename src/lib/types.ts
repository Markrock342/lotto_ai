export type BetEntry = {
  number: string;
  amount: number;
  line: number;
};

export type NumberSummary = {
  number: string;
  sets: number;
  totalAmount: number;
};

export type ParseResult = {
  entries: BetEntry[];
  errors: string[];
  skippedLines: number;
};
