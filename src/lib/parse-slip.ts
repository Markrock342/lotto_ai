import type { BetEntry, ParseResult, SlipSection } from "./types";

const NUMBER_RE = /^\d{2,4}$/;
const AMOUNT_RE = /^\d+(?:\.\d+)?$/;
const META_LINE_RE =
  /ชุด|โอน|จ่าย|สต|เพจ|น้อง|แล้ว|ห้อง|ลาว|#\d/i;
const SET_COUNT_RE = /^[=\*xX]\s*(\d+)\s*(?:ชุด)?$/i;
const DIGIT_RE = /\b(\d{2,4})\b/g;
/** 2355=1ชุด หรือ 2355x1 หรือ 2355 * 1 */
const NUMBER_SETS_LINE_RE = /^(\d{2,4})\s*(?:[=\*xX]\s*(\d+)|[\-\/]\s*(\d{1,2}))\s*(?:ชุด)?\s*$/i;

function normalizeNumber(raw: string): string {
  return raw;
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
  const sets = parseInt(m[2] || m[3], 10);
  if (sets <= 0 || Number.isNaN(sets)) return [];
  return expandSets({ number, amount: pricePerSet, line: lineNo }, sets, pricePerSet);
}

function tokenizeLine(line: string): string[] {
  return line
    .replace(/[=\-xX*/]/g, " ")
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

function extractDigitsFromLine(line: string): string[] {
  const matches = line.match(DIGIT_RE);
  if (!matches) return [];
  return matches.map((m) => normalizeNumber(m));
}

function isLineOnlyNumbers(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) return false;
  if (NUMBER_SETS_LINE_RE.test(trimmed)) return false;
  if (META_LINE_RE.test(trimmed) && !/^\d/.test(trimmed)) return false;
  const digits = extractDigitsFromLine(trimmed);
  if (digits.length === 0) return false;
  const withoutDigits = trimmed.replace(DIGIT_RE, "").replace(/\s+/g, "");
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
  lines: { text: string; lineNo: number }[],
  pricePerSet: number,
): BetEntry[] {
  const entries: BetEntry[] = [];
  let declaredSets: number | null = null;
  const numberLines: { nums: string[]; lineNo: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].text.trim();
    const lineNo = lines[i].lineNo;
    if (!line) continue;

    const setMatch = line.match(SET_COUNT_RE);
    if (setMatch && !NUMBER_SETS_LINE_RE.test(line)) {
      declaredSets = parseInt(setMatch[1], 10);
      continue;
    }

    const setsLine = parseNumberSetsLine(line, lineNo, pricePerSet);
    if (setsLine !== null) {
      entries.push(...setsLine);
      continue;
    }

    if (META_LINE_RE.test(line) && !isLineOnlyNumbers(line)) continue;

    if (isLineOnlyNumbers(line)) {
      numberLines.push({
        nums: extractDigitsFromLine(line),
        lineNo: lineNo,
      });
      continue;
    }

    const result = parseLine(line, lineNo, pricePerSet);
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

/** บรรทัดหัวข้อชื่อลูกค้า — ใช้แยกบิล (ไม่รวมบรรทัดเลข/ยอด) */
export function parseCustomerHeader(line: string): string | null {
  const t = line.trim();
  if (!t) return null;
  if (NUMBER_SETS_LINE_RE.test(t)) return null;
  if (isLineOnlyNumbers(t)) return null;

  const hash = t.match(/^#{1,3}\s*(.+)$/);
  if (hash) return hash[1].trim();

  const eq = t.match(/^={2,}\s*(.+?)\s*={2,}$/);
  if (eq) return eq[1].trim();

  const labeled = t.match(/^(?:ลูกค้า|ชื่อ|บิล|ลูก|คุณ|แม่|พ่อ)\s*[:：]\s*(.+)$/i);
  if (labeled) return labeled[1].trim();

  const billPrefix = t.match(/^(?:บิล|ลูก|ลูกค้า|คุณ|แม่|พ่อ)\s*(\d+.*)$/i);
  if (billPrefix) return t;

  if (/\d{2,4}/.test(t)) return null;
  if (/ชุด|โอน|จ่าย|สต|เพจ|ห้อง|ลาว/i.test(t) && !/น้อง|คุณ|พี่|แม่|พ่อ/i.test(t)) {
    return null;
  }

  if (t.length <= 48 && /[\u0E00-\u0E7Fa-zA-Z]/.test(t)) return t;
  return null;
}

function splitLinesByCustomer(lines: { text: string; lineNo: number }[]): { name: string | null; lines: { text: string; lineNo: number }[] }[] {
  const out: { name: string | null; lines: { text: string; lineNo: number }[] }[] = [];
  let name: string | null = null;
  let buf: { text: string; lineNo: number }[] = [];

  function flush() {
    if (buf.some((l) => l.text.trim())) out.push({ name, lines: [...buf] });
    buf = [];
  }

  for (const line of lines) {
    const header = parseCustomerHeader(line.text);
    if (header) {
      flush();
      name = header;
      continue;
    }
    buf.push(line);
  }
  flush();
  return out.length > 0 ? out : [{ name: null, lines }];
}

function buildParseResult(
  sections: SlipSection[],
  errors: string[],
  skippedLines: number,
): ParseResult {
  const nonEmpty = sections.filter((s) => s.entries.length > 0);
  const final =
    nonEmpty.length > 0 ? nonEmpty : [{ customerName: null, entries: [] as BetEntry[] }];
  return {
    entries: final.flatMap((s) => s.entries),
    sections: final,
    errors,
    skippedLines,
  };
}

function parseClassicLines(
  lines: { text: string; lineNo: number }[],
  pricePerSet: number,
): {
  entries: BetEntry[];
  errors: string[];
  skippedLines: number;
} {
  const entries: BetEntry[] = [];
  const errors: string[] = [];
  let skippedLines = 0;
  let declaredSets: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const lineNo = lines[i].lineNo;
    const trimmed = lines[i].text.trim();
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
      for (const num of extractDigitsFromLine(trimmed)) {
        entries.push(
          ...expandSets({ number: num, amount: pricePerSet, line: lineNo }, sets, pricePerSet),
        );
      }
      continue;
    }

    const result = parseLine(lines[i].text, lineNo, pricePerSet);

    if (result.error) {
      errors.push(result.error);
      skippedLines += 1;
      continue;
    }

    if (result.entries.length === 0) skippedLines += 1;
    entries.push(...result.entries);
  }

  return { entries, errors, skippedLines };
}

export function parseSlipText(
  text: string,
  pricePerSet = 1,
): ParseResult {
  const rawLines = text.split(/\r?\n/);
  const lines = rawLines.map((text, i) => ({ text, lineNo: i + 1 }));
  const lineFormatEntries = parseLineFormatBlock(lines, pricePerSet);

  if (lineFormatEntries.length > 0) {
    const hasClassic = lines.some(
      (l) =>
        l.text.trim() &&
        !isLineOnlyNumbers(l.text) &&
        !NUMBER_SETS_LINE_RE.test(l.text.trim()) &&
        !META_LINE_RE.test(l.text) &&
        /\d{2,4}\s*[=xX*\/\-]?\s*\d+/.test(l.text),
    );
    if (!hasClassic) {
      const chunks = splitLinesByCustomer(lines);
      const multi = chunks.filter((c) => c.name).length > 1;
      const sections: SlipSection[] = multi
        ? chunks.map((c) => ({
            customerName: c.name,
            entries: parseLineFormatBlock(c.lines, pricePerSet),
          }))
        : [{ customerName: chunks[0]?.name ?? null, entries: lineFormatEntries }];
      return buildParseResult(sections, [], 0);
    }
  }

  const chunks = splitLinesByCustomer(lines);
  const multi = chunks.filter((c) => c.name).length > 1;
  if (multi) {
    const sections: SlipSection[] = [];
    const errors: string[] = [];
    let skippedLines = 0;
    for (const chunk of chunks) {
      const part = parseClassicLines(chunk.lines, pricePerSet);
      errors.push(...part.errors);
      skippedLines += part.skippedLines;
      if (part.entries.length > 0) {
        sections.push({ customerName: chunk.name, entries: part.entries });
      }
    }
    return buildParseResult(sections, errors, skippedLines);
  }

  const single = parseClassicLines(lines, pricePerSet);
  return buildParseResult(
    [{ customerName: chunks[0]?.name ?? null, entries: single.entries }],
    single.errors,
    single.skippedLines,
  );
}
