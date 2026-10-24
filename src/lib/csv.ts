export function escapeCsvCell(value: string | number | null | undefined) {
  let text = String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = "'" + text;
  return `"${text.replace(/"/g, '""')}"`;
}
