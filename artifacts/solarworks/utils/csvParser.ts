export interface PriceRow {
  description: string;
  unit: string;
  unit_cost: number;
}

export function parseCSV(csvText: string): PriceRow[] {
  const lines = csvText
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  const rows: PriceRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVRow(lines[i]);
    if (cols.length >= 3) {
      const cost = parseFloat(cols[2].replace(/,/g, ""));
      if (!isNaN(cost)) {
        rows.push({
          description: cols[0].trim(),
          unit: cols[1].trim(),
          unit_cost: cost,
        });
      }
    }
  }

  return rows;
}

function splitCSVRow(row: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}
