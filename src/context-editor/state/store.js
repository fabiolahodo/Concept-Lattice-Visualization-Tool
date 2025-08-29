// Minimal store for the context editor.
// Keeps the table state centralized and easy to test.

let _data = [];    // rows: [objectName, ...booleans]
let _columns = []; // ["Object", ...attributes]

export function init({ data = [], columns = [] } = {}) {
  _data = JSON.parse(JSON.stringify(data));
  _columns = JSON.parse(JSON.stringify(columns));
}

export function get() {
  return { data: JSON.parse(JSON.stringify(_data)), columns: JSON.parse(JSON.stringify(_columns)) };
}

export function set({ data, columns }) {
  if (Array.isArray(data)) _data = JSON.parse(JSON.stringify(data));
  if (Array.isArray(columns)) _columns = JSON.parse(JSON.stringify(columns));
}

export function asTable() {
  return { rows: JSON.parse(JSON.stringify(_data)), columns: JSON.parse(JSON.stringify(_columns)) };
}

// Row / column edits
export function addRow() {
  const newRow = ["New Object", ...Array(Math.max(0, _columns.length - 1)).fill(false)];
  _data.push(newRow);
}

export function addColumn() {
  const name = `New Attribute ${_columns.length}`;
  _columns.push(name);
  _data.forEach(r => r.push(false));
}

export function deleteRow(rowIndex) {
  if (rowIndex >= 0 && rowIndex < _data.length) _data.splice(rowIndex, 1);
}

export function deleteColumn(colIndex) {
  if (colIndex > 0 && colIndex < _columns.length) {
    _columns.splice(colIndex, 1);
    _data = _data.map(row => row.filter((_, i) => i !== colIndex));
  }
}

export function renameObject(rowIndex, newName) {
  if (_data[rowIndex]) _data[rowIndex][0] = newName;
}

export function renameAttribute(colIndex, newName) {
  if (_columns[colIndex]) _columns[colIndex] = newName;
}

export function toggleCell(rowIndex, colIndex, value) {
  if (_data[rowIndex] && colIndex > 0) _data[rowIndex][colIndex] = !!value;
}

export function currentContext() {
  const objects = _data.map(row => row[0]);
  const properties = _columns.slice(1);
  const contextMatrix = _data.map(row => row.slice(1));
  return { objects, properties, contextMatrix };
}
