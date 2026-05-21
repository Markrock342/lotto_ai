import type { BetEntry, ParseResult } from "./types";

const NUMBER_RE = /^\d{2,4}$/;
const AMOUNT_RE = /^\d+(?:\.\d+)?$/;
const META_LINE_RE =
  /ชุด|โอน|จ่าย|สต|เพจ|น้อง|แล้ว|ห้อง|ลาว|#\d/i;
const SET_COUNT_RE = /(?:^|[=\s#])(\d+)\s*ชุด/i;
const FOUR_DIGIT_RE = /\b(\d{4})\b/g;

function normalizeNumber(raw: string): string {
  return raw.padStart(4, "0");
}

function isNumberToken(token: string): boolean {
  return NUMBER_RE.test(token);
}

function isAmountToken(token: string): boolean {
  if (!AMOUNT_RE.test(token)) return false;
  // 5+ digits = ยอดเงิน
  if (token.length > 4) return true;
  return false;
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
      // คู่เลขติดกัน เช่น 1234 5678 → แต่ละเลขใช้ยอดเริ่มต้น
      entries.push({ number, amount, line: lineNo });
      i += 1;
      continue;
    } else if (next && AMOUNT_RE.test(next)) {
      // 2–4 หลักที่น่าจะเป็นยอด (เช่น 50, 100) เมื่อมีคู่บรรทัด
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
  if (META_LINE_RE.test(trimmed) && !/^\d/.test(trimmed)) return false;
  const digits = extractFourDigitsFromLine(trimmed);
  if (digits.length === 0) return false;
  const withoutDigits = trimmed.replace(FOUR_DIGIT_RE, "").replace(/\s+/g, "");
  return withoutDigits.length === 0 || /^[#=\s]+$/.test(withoutDigits);
}

function parseLineFormatBlock(
  lines: string[],
  defaultAmount: number,
): BetEntry[] {
  const entries: BetEntry[] = [];
  let declaredSets: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const setMatch = line.match(SET_COUNT_RE);
    if (setMatch) {
      declaredSets = parseInt(setMatch[1], 10);
      continue;
    }

    if (META_LINE_RE.test(line) && !isLineOnlyNumbers(line)) continue;

    if (isLineOnlyNumbers(line)) {
      for (const num of extractFourDigitsFromLine(line)) {
        entries.push({ number: num, amount: defaultAmount, line: i + 1 });
      }
      continue;
    }

    const result = parseLine(line, i + 1, defaultAmount);
    entries.push(...result.entries);
  }

  if (declaredSets !== null && entries.length > 0 && entries.length !== declaredSets) {
    // ไม่ error — แค่ใช้จำนวนจริงจากเลขที่ดึงได้
  }

  return entries;
}

export function parseSlipText(
  text: string,
  defaultAmount = 1,
): ParseResult {
  const lines = text.split(/\r?\n/);
  const lineFormatEntries = parseLineFormatBlock(lines, defaultAmount);

  if (lineFormatEntries.length > 0) {
    const hasClassic = lines.some(
      (l) =>
        l.trim() &&
        !isLineOnlyNumbers(l) &&
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

  for (let i = 0; i < lines.length; i++) {
    const lineNo = i + 1;
    const trimmed = lines[i].trim();
    if (!trimmed) continue;
    if (META_LINE_RE.test(trimmed) && !/\d{2,4}/.test(trimmed)) continue;

    if (isLineOnlyNumbers(trimmed)) {
      for (const num of extractFourDigitsFromLine(trimmed)) {
        entries.push({ number: num, amount: defaultAmount, line: lineNo });
      }
      continue;
    }

    const result = parseLine(lines[i], lineNo, defaultAmount);

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
