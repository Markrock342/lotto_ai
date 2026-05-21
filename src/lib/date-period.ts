export type ReportPeriod = "today" | "week" | "month" | "all";

export function getPeriodRange(period: ReportPeriod): { from: Date | null; to: Date } {
  const to = new Date();
  if (period === "all") return { from: null, to };

  const from = new Date();
  from.setHours(0, 0, 0, 0);

  if (period === "week") {
    from.setDate(from.getDate() - 6);
  } else if (period === "month") {
    from.setDate(1);
  }

  return { from, to };
}

export function isInPeriod(date: Date, period: ReportPeriod): boolean {
  const { from, to } = getPeriodRange(period);
  if (!from) return true;
  return date >= from && date <= to;
}

export const PERIOD_LABELS: Record<ReportPeriod, string> = {
  today: "วันนี้",
  week: "7 วัน",
  month: "เดือนนี้",
  all: "ทั้งหมด",
};
