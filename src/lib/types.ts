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

export type SlipSection = {
  customerName: string | null;
  entries: BetEntry[];
};

export type ParseResult = {
  entries: BetEntry[];
  sections: SlipSection[];
  errors: string[];
  skippedLines: number;
};
