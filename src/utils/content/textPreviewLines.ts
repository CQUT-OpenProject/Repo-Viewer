export function normalizeContentLines(content: string): string[] {
  return content.replace(/\r\n/g, "\n").split("\n");
}

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function encodeLines(lines: string[]): string[] {
  return lines.map((line) => (line.length === 0 ? "\u00A0" : escapeHtml(line)));
}
