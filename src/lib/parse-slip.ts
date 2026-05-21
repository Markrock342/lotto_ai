import type { BetEntry, ParseResult } from "./types";

const NUMBER_RE = /^\d{2,4}$/;
const AMOUNT_RE = /^\d+(?:\.\d+)?$/;
const META_LINE_RE =
  /ชุด|โอน|จ่าย|สต|เพจ|น้อง|แล้ว|ห้อง|ลาว|#\d/i;
const SET_COUNT_RE = /(?:^|[=\s#])(\d+)\s*ชุด/i;
const FOUR_DIGIT_RE = /\b(\d{4})\b/g;
/** 2355=1ชุด หรือ 2355=1 */
const NUMBER_SETS_LINE_RE = /^(\d{2,4})\s*=\s*(\d+)\s*(?:ชุด)?\s*$/i;

function normalizeNumber(raw: string): string {
  return raw.padStart(4, "0");
}

function isNumberToken(token: string): boolean {
  return NUMBER_RE.test(token);
}

function isAmountToken(token: string): boolean {
  if (!AMOUNT_RE.test(token)) return false;
  if (token.length > 4) return true;
  return false;
}

function expandSets(
  entry: Omit<BetEntry, "line"> & { line: number },
  sets: number,
  pricePerSet: number,
): BetEntry[] {
  const n = Math.max(1, Math.floor(sets));
  return Array.from({ length: n }, () => ({
    number: entry.number,
    amount: pricePerSet,
    line: entry.line,
  }));
}

function parseNumberSetsLine(
  line: string,
  lineNo: number,
  pricePerSet: number,
): BetEntry[] | null {
  const m = line.trim().match(NUMBER_SETS_LINE_RE);
  if (!m) return null;
  const number = normalizeNumber(m[1]);
  const sets = parseInt(m[2], 10);
  if (sets <= 0 || Number.isNaN(sets)) return [];
  return expandSets({ number, amount: pricePerSet, line: lineNo }, sets, pricePerSet);
}

function tokenizeLine(line: string): string[] {
  return line
    .replace(/[=\-xX*]/g, " ")
    .replace(/[,，]/g, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

function parseLine(
  line: string,
  lineNo: number,
  defaultAmount: number,
): { entries: BetEntry[]; error?: string } {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    return { entries: [] };
  }

  const setsLine = parseNumberSetsLine(trimmed, lineNo, defaultAmount);
  if (setsLine !== null) return { entries: setsLine };

  const tokens = tokenizeLine(trimmed);
  if (tokens.length === 0) return { entries: [] };

  const entries: BetEntry[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    if (!isNumberToken(token)) {
      i += 1;
      continue;
    }

    const number = normalizeNumber(token);
    let amount = defaultAmount;
    const next = tokens[i + 1];

    if (next && isAmountToken(next)) {
      amount = parseFloat(next);
      i += 2;
    } else if (next && isNumberToken(next)) {
      entries.push({ number, amount, line: lineNo });
      i += 1;
      continue;
    } else if (next && AMOUNT_RE.test(next)) {
      const asAmount = parseFloat(next);
      const pairMode =
        tokens.length === 2 ||
        (tokens.length % 2 === 0 && i % 2 === 0) ||
        i + 2 < tokens.length;

      if (pairMode && asAmount > 0) {
        amount = asAmount;
        i += 2;
      } else {
        entries.push({ number, amount, line: lineNo });
        i += 1;
        continue;
      }
    } else {
      i += 1;
    }

    if (amount <= 0 || Number.isNaN(amount)) {
      return {
        entries: [],
        error: `บรรทัด ${lineNo}: ยอดเงินไม่ถูกต้อง`,
      };
    }

    entries.push({ number, amount, line: lineNo });
  }

  return { entries };
}

function extractFourDigitsFromLine(line: string): string[] {
  const matches = line.match(FOUR_DIGIT_RE);
  if (!matches) return [];
  return matches.map((m) => normalizeNumber(m));
}

function isLineOnlyNumbers(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (NUMBER_SETS_LINE_RE.test(trimmed)) return false;
  if (META_LINE_RE.test(trimmed) && !/^\d/.test(trimmed)) return false;
  const digits = extractFourDigitsFromLine(trimmed);
  if (digits.length === 0) return false;
  const withoutDigits = trimmed.replace(FOUR_DIGIT_RE, "").replace(/\s+/g, "");
  return withoutDigits.length === 0 || /^[#=\s]+$/.test(withoutDigits);
}

function applyDeclaredSets(
  entries: BetEntry[],
  declaredSets: number,
  pricePerSet: number,
): BetEntry[] {
  const expanded: BetEntry[] = [];
  for (const e of entries) {
    expanded.push(...expandSets(e, declaredSets, pricePerSet));
  }
  return expanded;
}

function parseLineFormatBlock(
  lines: string[],
  pricePerSet: number,
): BetEntry[] {
  const entries: BetEntry[] = [];
  let declaredSets: number | null = null;
  const numberLines: { nums: string[]; lineNo: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const setMatch = line.match(SET_COUNT_RE);
    if (setMatch && !NUMBER_SETS_LINE_RE.test(line)) {
      declaredSets = parseInt(setMatch[1], 10);
      continue;
    }

    const setsLine = parseNumberSetsLine(line, i + 1, pricePerSet);
    if (setsLine !== null) {
      entries.push(...setsLine);
      continue;
    }

    if (META_LINE_RE.test(line) && !isLineOnlyNumbers(line)) continue;

    if (isLineOnlyNumbers(line)) {
      numberLines.push({
        nums: extractFourDigitsFromLine(line),
        lineNo: i + 1,
      });
      continue;
    }

    const result = parseLine(line, i + 1, pricePerSet);
    entries.push(...result.entries);
  }

  for (const { nums, lineNo } of numberLines) {
    const sets = declaredSets ?? 1;
    for (const num of nums) {
      entries.push(
        ...expandSets({ number: num, amount: pricePerSet, line: lineNo }, sets, pricePerSet),
      );
    }
  }

  return entries;
}

export function parseSlipText(
  text: string,
  pricePerSet = 1,
): ParseResult {
  const lines = text.split(/\r?\n/);
  const lineFormatEntries = parseLineFormatBlock(lines, pricePerSet);

  if (lineFormatEntries.length > 0) {
    const hasClassic = lines.some(
      (l) =>
        l.trim() &&
        !isLineOnlyNumbers(l) &&
        !NUMBER_SETS_LINE_RE.test(l.trim()) &&
        !META_LINE_RE.test(l) &&
        /\d{2,4}\s*[=xX*\/\-]?\s*\d+/.test(l),
    );
    if (!hasClassic) {
      return { entries: lineFormatEntries, errors: [], skippedLines: 0 };
    }
  }

  const entries: BetEntry[] = [];
  const errors: string[] = [];
  let skippedLines = 0;
  let declaredSets: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const trimmed = lines[i].trim();
    if (!trimmed) continue;

    const setMatch = trimmed.match(SET_COUNT_RE);
    if (setMatch && !NUMBER_SETS_LINE_RE.test(trimmed)) {
      declaredSets = parseInt(setMatch[1], 10);
      continue;
    }

    if (META_LINE_RE.test(trimmed) && !/\d{2,4}/.test(trimmed)) continue;

    const setsLine = parseNumberSetsLine(trimmed, lineNo, pricePerSet);
    if (setsLine !== null) {
      entries.push(...setsLine);
      continue;
    }

    if (isLineOnlyNumbers(trimmed)) {
      const sets = declaredSets ?? 1;
      for (const num of extractFourDigitsFromLine(trimmed)) {
        entries.push(
          ...expandSets({ number: num, amount: pricePerSet, line: lineNo }, sets, pricePerSet),
        );
      }
      continue;
    }

    const result = parseLine(lines[i], lineNo, pricePerSet);

    if (result.error) {
      errors.push(result.error);
      skippedLines += 1;
      continue;
    }

    if (result.entries.length === 0) {
      skippedLines += 1;
    }

    entries.push(...result.entries);
  }

  return { entries, errors, skippedLines };
}
