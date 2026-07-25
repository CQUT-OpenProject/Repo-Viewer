/**
 * 将 HTMLTableElement 序列化为 TSV（制表符分隔），便于粘贴到表格软件。
 */
export function serializeTableToTsv(table: HTMLTableElement): string {
  const rows = Array.from(table.rows);

  return rows
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => normalizeCellText(cell.textContent ?? ""))
        .join("\t"),
    )
    .join("\n");
}

function normalizeCellText(text: string): string {
  return text
    .replace(/\r\n|\r|\n/g, " ")
    .replace(/\t/g, " ")
    .trim();
}
