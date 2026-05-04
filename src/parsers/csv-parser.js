import { parse } from 'csv-parse/sync';

export function parseCsvRecords(content) {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true,
  });
}

export default { parseCsvRecords };
