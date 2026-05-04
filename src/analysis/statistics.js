import * as ss from 'simple-statistics';
import config from '../config/index.js';
import { parseNumber } from '../parsers/number-parser.js';

function averageRanks(values) {
  const indexed = values.map((value, index) => ({ value, index }));
  indexed.sort((a, b) => a.value - b.value);

  const ranks = new Array(values.length);
  let position = 0;

  while (position < indexed.length) {
    let end = position + 1;

    while (end < indexed.length && indexed[end].value === indexed[position].value) {
      end++;
    }

    const rank = (position + 1 + end) / 2;

    for (let i = position; i < end; i++) {
      ranks[indexed[i].index] = rank;
    }

    position = end;
  }

  return ranks;
}

export function spearmanCorrelation(xValues, yValues) {
  if (xValues.length !== yValues.length || xValues.length < 2) return null;

  const xRanks = averageRanks(xValues);
  const yRanks = averageRanks(yValues);

  return ss.sampleCorrelation(xRanks, yRanks);
}

export function describeCorrelation(rho) {
  if (rho === null) return 'insuficiente';

  const abs = Math.abs(rho);
  if (abs < 0.1) return 'muito fraca';
  if (abs < 0.3) return 'fraca';
  if (abs < 0.5) return 'moderada';
  if (abs < 0.7) return 'forte';
  return 'muito forte';
}

export function buildNumericStats(rows) {
  const stats = {};

  for (const field of config.analysis.numericFields) {
    const values = rows
      .map((row) => row[field])
      .map(parseNumber)
      .filter((value) => value !== null);
    const sortedValues = [...values].sort((a, b) => a - b);

    stats[field] = {
      count: values.length,
      mean: values.length === 0 ? null : ss.mean(values),
      median: values.length === 0 ? null : ss.median(values),
      min: values.length === 0 ? null : ss.min(values),
      max: values.length === 0 ? null : ss.max(values),
      stdDev: values.length < 2 ? null : ss.standardDeviation(values),
      q1: values.length === 0 ? null : ss.quantileSorted(sortedValues, 0.25),
      q3: values.length === 0 ? null : ss.quantileSorted(sortedValues, 0.75),
    };
  }

  return stats;
}

export function buildCorrelationRows(rows) {
  const correlations = [];

  for (const [xField, yField] of config.analysis.correlationPairs) {
    const pairs = [];

    for (const row of rows) {
      const x = parseNumber(row[xField]);
      const y = parseNumber(row[yField]);

      if (x === null || y === null) continue;
      pairs.push({ x, y });
    }

    const xValues = pairs.map((pair) => pair.x);
    const yValues = pairs.map((pair) => pair.y);
    const rho = spearmanCorrelation(xValues, yValues);

    correlations.push({
      xField,
      yField,
      n: pairs.length,
      rho,
      strength: describeCorrelation(rho),
    });
  }

  return correlations;
}

export default {
  spearmanCorrelation,
  describeCorrelation,
  buildNumericStats,
  buildCorrelationRows,
};
