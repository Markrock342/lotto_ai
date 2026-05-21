export type BillRow = {
  number: string;
  sets: number;
  totalAmount: number;
};

export type BillData = {
  houseName: string;
  drawLabel: string;
  customerName?: string | null;
  pricePerSet: number;
  result4?: string | null;
  rows: BillRow[];
  totalSets: number;
  totalReceived: number;
  printedAt: string;
};

export function formatBillText(data: BillData): string {
  const lines = [
    data.houseName,
    data.drawLabel,
    data.customerName ? `ลูกค้า: ${data.customerName}` : "",
    data.result4 ? `ผลออก ${data.result4}` : "",
    `พิมพ์ ${data.printedAt}`,
    "—".repeat(24),
    ...data.rows.map(
      (r) => `${r.number}\t${r.sets} ชุด\t${r.totalAmount.toLocaleString()} บาท`,
    ),
    "—".repeat(24),
    `รวม ${data.totalSets} ชุด · ${data.totalReceived.toLocaleString()} บาท`,
  ].filter(Boolean);
  return lines.join("\n");
}

export function billToCsvRows(
  bets: {
    at: Date;
    drawLabel: string;
    number: string;
    amount: number;
    by: string;
    status: string;
  }[],
): string[][] {
  return [
    ["วันที่", "เวลา", "งวด", "เลข", "ยอด", "ผู้คีย์", "สถานะ"],
    ...bets.map((b) => {
      const d = new Date(b.at);
      return [
        d.toLocaleDateString("th-TH"),
        d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" }),
        b.drawLabel,
        b.number,
        String(b.amount),
        b.by,
        b.status === "active" ? "ปกติ" : "ยกเลิก",
      ];
    }),
  ];
}

export function csvEscape(cell: string): string {
  if (/[",\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

export function rowsToCsv(rows: string[][]): string {
  const bom = "\uFEFF";
  return (
    bom +
    rows.map((r) => r.map((c) => csvEscape(c)).join(",")).join("\n")
  );
}
