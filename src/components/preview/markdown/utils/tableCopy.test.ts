import { describe, expect, it } from "vitest";
import { serializeTableToTsv } from "./tableCopy";

function cell(text: string): HTMLTableCellElement {
  return { textContent: text } as HTMLTableCellElement;
}

function row(...texts: string[]): HTMLTableRowElement {
  const cells = texts.map(cell);
  return { cells } as unknown as HTMLTableRowElement;
}

function table(...rows: HTMLTableRowElement[]): HTMLTableElement {
  return { rows } as unknown as HTMLTableElement;
}

describe("serializeTableToTsv", () => {
  it("serializes header and body rows as TSV", () => {
    const el = table(row("A", "B"), row("1", "2"), row("3", "4"));
    expect(serializeTableToTsv(el)).toBe("A\tB\n1\t2\n3\t4");
  });

  it("flattens newlines and tabs inside cells", () => {
    const el = table(row("hello\nworld", "a\tb"));
    expect(serializeTableToTsv(el)).toBe("hello world\ta b");
  });
});
