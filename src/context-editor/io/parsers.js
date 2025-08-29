// File parsers (CSV / XLSX / CXT) + normalizer used by uploads.

export function normalizeCell(v) {
  if (v == null) return false;
  const s = String(v).trim();
  if (s === "" || s === "." || s === "0" || /^false$/i.test(s) || /^no$/i.test(s)) return false;
  return true; // treat "X", "1", "true", "yes" as true
}

export async function parseCSVFile(file) {
  const text = await file.text();
  const rows = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .map(line => line.split(",").map(x => x.trim()));

  if (rows.length < 2) throw new Error("CSV must have a header row and at least one data row.");
  const attributes = rows[0].slice(1);
  const objects = rows.slice(1).map(r => r[0]);
  const matrix = rows.slice(1).map(r => r.slice(1).map(normalizeCell));
  return { objects, attributes, matrix };
}

export async function parseXLSXFile(file) {
  const data = await file.arrayBuffer();
  const wb = window.XLSX.read(data, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = window.XLSX.utils.sheet_to_json(sheet, { header: 1 }).map(r => (Array.isArray(r) ? r : []));
  if (rows.length < 2) throw new Error("XLSX must have a header row and at least one data row.");
  const attributes = (rows[0] || []).slice(1).map(c => (c ?? "").toString());
  const objects = rows.slice(1).map(r => (r[0] ?? "").toString());
  const matrix = rows.slice(1).map(r => attributes.map((_, j) => normalizeCell(r.slice(1)[j])));
  return { objects, attributes, matrix };
}

export async function parseCXTFile(file) {
  const text = await file.text();
  const lines = text.split(/\r?\n/).map(l => l.replace(/\r/g, "")); // keep empties
  let idx = 0;
  const _header = (lines[idx++] ?? "").trim(); // usually "B"
  const _contextName = (lines[idx++] ?? "");   // may be empty
  let objCount = parseInt((lines[idx++] ?? "").trim(), 10);
  let attrCount = parseInt((lines[idx++] ?? "").trim(), 10);
  if (isNaN(objCount) || isNaN(attrCount)) throw new Error("Invalid CXT header (object/attribute counts).");
  if (((lines[idx] ?? "").trim()) === "") idx++;  // optional blank

  const objects = [];
  for (let i = 0; i < objCount; i++) {
    let s = (lines[idx++] ?? "");
    while (s.trim() === "" && idx < lines.length) s = (lines[idx++] ?? "");
    objects.push(s.trim());
  }

  const attributes = [];
  for (let j = 0; j < attrCount; j++) {
    let s = (lines[idx++] ?? "");
    while (s.trim() === "" && idx < lines.length) s = (lines[idx++] ?? "");
    attributes.push(s.trim());
  }

  if (((lines[idx] ?? "").trim()) === "") idx++;  // optional blank

  const matrix = [];
  for (let r = 0; r < objCount; r++) {
    let row = (lines[idx++] ?? "");
    while (row.trim() === "" && idx < lines.length) row = (lines[idx++] ?? "");
    row = row.trim();
    if (row.length !== attrCount) throw new Error(`CXT row ${r} length ${row.length} != ${attrCount}`);
    matrix.push([...row].map(c => (c === "X" || c === "x" ? true : false)));
  }
  return { objects, attributes, matrix };
}
