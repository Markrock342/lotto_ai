export type SortDir = "asc" | "desc";

export function toggleSortDir(current: SortDir): SortDir {
  return current === "asc" ? "desc" : "asc";
}

export function sortIndicator(active: boolean, dir: SortDir): string {
  if (!active) return "↕";
  return dir === "asc" ? "↑" : "↓";
}

export function compareStrings(a: string, b: string, dir: SortDir): number {
  const c = a.localeCompare(b, "th");
  return dir === "asc" ? c : -c;
}

export function compareNumbers(a: number, b: number, dir: SortDir): number {
  return dir === "asc" ? a - b : b - a;
}
