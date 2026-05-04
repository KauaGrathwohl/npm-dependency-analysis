/**
 * Geração de Visualizações
 *
 * Script para gerar gráficos em formato HTML/SVG a partir dos dados de análise.
 * Produz visualizações de distribuições, correlações e padrões de manutenção.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parse } from 'csv-parse/sync';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../../data/output');
const ANALYSIS_DIR = path.join(DATA_DIR, 'analysis');

/**
 * Carrega análise descritiva
 */
function loadAnalysisData() {
  const filePath = path.join(ANALYSIS_DIR, 'analysis-cases.csv');
  const content = fs.readFileSync(filePath, 'utf-8');
  return parse(content, {
    columns: true,
    cast_func: (value, context) => {
      if (context.index === undefined) return value;
      const numericFields = [
        'stars',
        'direct_dependencies',
        'transitive_dependencies',
        'dep_update_commits',
        'total_dep_updates',
        'major_updates',
        'minor_updates',
        'patch_updates',
        'inc_man_ratio',
        'dep_pull_requests',
        'merged_dep_prs',
        'avg_merge_time_hours',
        'median_merge_time_hours',
        'dep_issues',
        'total_issues',
        'total_prs',
        'update_pressure',
        'maintenance_intensity',
        'merge_conversion_rate',
        'dependency_density',
      ];

      if (numericFields.includes(context.header)) {
        return value === '' || value === null ? undefined : parseFloat(value);
      }

      return value;
    },
  });
}

/**
 * Calcula distribuição de tipos de atualização
 */
function calculateUpdateTypeDistribution(data) {
  return data.reduce(
    (acc, row) => {
      const major = parseInt(row.major_updates) || 0;
      const minor = parseInt(row.minor_updates) || 0;
      const patch = parseInt(row.patch_updates) || 0;

      acc.major += major;
      acc.minor += minor;
      acc.patch += patch;

      return acc;
    },
    { major: 0, minor: 0, patch: 0 }
  );
}

/**
 * Gera gráfico de pizza em SVG
 */
function generatePieChart(data, title, width = 400, height = 400) {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1'];
  const labels = Object.keys(data);

  let startAngle = 0;
  let svgPaths = '';
  let legend = '';

  labels.forEach((label, idx) => {
    const value = data[label];
    const sliceAngle = (value / total) * 360;
    const percentage = ((value / total) * 100).toFixed(1);

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + sliceAngle) * Math.PI) / 180;

    const x1 = 200 + 100 * Math.cos(startRad);
    const y1 = 200 + 100 * Math.sin(startRad);
    const x2 = 200 + 100 * Math.cos(endRad);
    const y2 = 200 + 100 * Math.sin(endRad);

    const largeArc = sliceAngle > 180 ? 1 : 0;
    const pathData = `M 200 200 L ${x1} ${y1} A 100 100 0 ${largeArc} 1 ${x2} ${y2} Z`;

    svgPaths += `<path d="${pathData}" fill="${colors[idx]}" stroke="white" stroke-width="2"/>\n`;
    legend += `<div style="display:flex; align-items:center; margin:5px;"><span style="width:15px;height:15px;background:${colors[idx]};margin-right:8px;"></span>${label}: ${value} (${percentage}%)</div>`;

    startAngle += sliceAngle;
  });

  return `
    <div style="text-align:center; margin:20px;">
      <h3>${title}</h3>
      <svg width="${width}" height="${height}" viewBox="0 0 400 400">
        ${svgPaths}
      </svg>
      <div style="text-align:left; display:inline-block; margin-top:10px;">
        ${legend}
      </div>
    </div>
  `;
}

/**
 * Gera gráfico de barras horizontais em SVG
 */
function generateBarChart(data, title, topN = 10) {
  const sorted = data
    .sort((a, b) => (parseFloat(b.total_dep_updates) || 0) - (parseFloat(a.total_dep_updates) || 0))
    .slice(0, topN);

  const maxValue = Math.max(...sorted.map((d) => parseFloat(d.total_dep_updates) || 0));
  const barHeight = 20;
  const totalHeight = barHeight * sorted.length + 40;

  let bars = '';
  sorted.forEach((row, idx) => {
    const updates = parseFloat(row.total_dep_updates) || 0;
    const barWidth = (updates / maxValue) * 400;
    const y = 30 + idx * barHeight;

    bars += `
      <text x="5" y="${y + 15}" font-size="12">${row.repository.substring(0, 25)}</text>
      <rect x="220" y="${y}" width="${barWidth}" height="15" fill="#4ECDC4" stroke="#333" stroke-width="1"/>
      <text x="${225 + barWidth}" y="${y + 12}" font-size="11" fill="#333">${Math.round(updates)}</text>
    `;
  });

  return `
    <div style="text-align:center; margin:20px;">
      <h3>${title}</h3>
      <svg width="700" height="${totalHeight}" viewBox="0 0 700 ${totalHeight}">
        <text x="10" y="20" font-weight="bold" font-size="14">Repositório</text>
        <text x="450" y="20" font-weight="bold" font-size="14">Volume de Atualizações</text>
        ${bars}
      </svg>
    </div>
  `;
}

/**
 * Gera gráfico de dispersão
 */
function generateScatterChart(data, xField, yField, title) {
  const filtered = data.filter((d) => d[xField] && d[yField]);
  const xValues = filtered.map((d) => parseFloat(d[xField]) || 0);
  const yValues = filtered.map((d) => parseFloat(d[yField]) || 0);

  const maxX = Math.max(...xValues);
  const maxY = Math.max(...yValues);

  const scaleX = 500 / (maxX || 1);
  const scaleY = 300 / (maxY || 1);

  let points = '';
  filtered.forEach((row) => {
    const x = 50 + parseFloat(row[xField]) * scaleX;
    const y = 350 - parseFloat(row[yField]) * scaleY;
    points += `<circle cx="${x}" cy="${y}" r="4" fill="#FF6B6B" opacity="0.6" title="${row.repository}"/>`;
  });

  return `
    <div style="text-align:center; margin:20px;">
      <h3>${title}</h3>
      <svg width="600" height="400" viewBox="0 0 600 400" style="border:1px solid #ccc;">
        <line x1="50" y1="350" x2="550" y2="350" stroke="#333" stroke-width="2"/>
        <line x1="50" y1="50" x2="50" y2="350" stroke="#333" stroke-width="2"/>
        <text x="300" y="390" text-anchor="middle" font-size="12">${xField}</text>
        <text x="10" y="200" text-anchor="middle" font-size="12" transform="rotate(-90 10 200)">${yField}</text>
        ${points}
      </svg>
    </div>
  `;
}

/**
 * Gera sumário estatístico
 */
function generateStatisticsSummary(data) {
  const updateDist = calculateUpdateTypeDistribution(data);
  const avgIncManRatio =
    data.reduce((sum, row) => sum + (parseFloat(row.inc_man_ratio) || 0), 0) / data.length;
  const avgUpdatePressure =
    data.reduce((sum, row) => sum + (parseFloat(row.update_pressure) || 0), 0) / data.length;
  const avgMergeRate =
    data.reduce((sum, row) => sum + (parseFloat(row.merge_conversion_rate) || 0), 0) /
    data.filter((r) => r.merge_conversion_rate).length;

  return `
    <div style="background:#f5f5f5; padding:20px; border-radius:8px; margin:20px;">
      <h3>Sumário Estatístico</h3>
      <table style="width:100%; border-collapse:collapse;">
        <tr style="background:#e0e0e0;">
          <th style="border:1px solid #ccc; padding:8px; text-align:left;">Métrica</th>
          <th style="border:1px solid #ccc; padding:8px; text-align:right;">Valor</th>
        </tr>
        <tr>
          <td style="border:1px solid #ccc; padding:8px;">Total de Atualizações (50 repos)</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:right;">${updateDist.major + updateDist.minor + updateDist.patch}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="border:1px solid #ccc; padding:8px;">Atualizações Major</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:right;">${updateDist.major}</td>
        </tr>
        <tr>
          <td style="border:1px solid #ccc; padding:8px;">Atualizações Minor</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:right;">${updateDist.minor}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="border:1px solid #ccc; padding:8px;">Atualizações Patch</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:right;">${updateDist.patch}</td>
        </tr>
        <tr>
          <td style="border:1px solid #ccc; padding:8px;">Razão Incremental/Manutenção (média)</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:right;">${avgIncManRatio.toFixed(2)}</td>
        </tr>
        <tr style="background:#f9f9f9;">
          <td style="border:1px solid #ccc; padding:8px;">Pressão de Atualização (média)</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:right;">${avgUpdatePressure.toFixed(2)}</td>
        </tr>
        <tr>
          <td style="border:1px solid #ccc; padding:8px;">Taxa de Conversão de Merge (média)</td>
          <td style="border:1px solid #ccc; padding:8px; text-align:right;">${(avgMergeRate * 100).toFixed(1)}%</td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Gera HTML com todas as visualizações
 */
function generateHTML(data) {
  const updateDist = calculateUpdateTypeDistribution(data);

  const html = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Análise de Impacto de Atualizações de Dependências - NPM Ecosystem</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          margin: 0;
          padding: 20px;
          color: #333;
        }
        .container {
          max-width: 1400px;
          margin: 0 auto;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
          padding: 40px;
        }
        h1 {
          color: #667eea;
          text-align: center;
          margin-bottom: 10px;
        }
        .subtitle {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
          font-size: 14px;
        }
        .grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
          margin-bottom: 30px;
        }
        .grid-full {
          grid-column: 1 / -1;
        }
        .chart-container {
          background: #f9f9f9;
          border-radius: 8px;
          padding: 15px;
          border: 1px solid #e0e0e0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>Análise de Impacto de Atualizações de Dependências</h1>
        <div class="subtitle">Ecossistema NPM - 50 Repositórios Open-Source | Janela Temporal: 12 meses</div>

        <div class="grid">
          <div class="chart-container">
            ${generatePieChart(updateDist, 'Distribuição de Atualizações por Tipo')}
          </div>
          <div class="chart-container grid-full">
            ${generateStatisticsSummary(data)}
          </div>
        </div>

        <div class="grid">
          <div class="chart-container grid-full">
            ${generateBarChart(data, 'Top 10 Repositórios por Volume de Atualizações')}
          </div>
        </div>

        <div class="grid">
          <div class="chart-container">
            ${generateScatterChart(data, 'total_dep_updates', 'dep_pull_requests', 'Atualizações vs Pull Requests')}
          </div>
          <div class="chart-container">
            ${generateScatterChart(data, 'total_dep_updates', 'dep_issues', 'Atualizações vs Issues')}
          </div>
        </div>

        <div class="grid">
          <div class="chart-container">
            ${generateScatterChart(data, 'direct_dependencies', 'total_dep_updates', 'Dependências Diretas vs Atualizações')}
          </div>
          <div class="chart-container">
            ${generateScatterChart(data, 'update_pressure', 'maintenance_intensity', 'Pressão de Atualização vs Intensidade de Manutenção')}
          </div>
        </div>

        <footer style="text-align:center; margin-top:40px; padding-top:20px; border-top:1px solid #e0e0e0; color:#999; font-size:12px;">
          Gerado em: ${new Date().toLocaleString('pt-BR')}
        </footer>
      </div>
    </body>
    </html>
  `;

  return html;
}

/**
 * Executa geração de visualizações
 */
async function generateVisualizations() {
  logger.info('Gerando visualizações...\n');

  try {
    logger.info('Carregando dados de análise...');
    const data = loadAnalysisData();
    logger.info(`Carregados ${data.length} repositórios\n`);

    logger.info('Gerando gráficos e tabelas...');
    const html = generateHTML(data);

    logger.info('Salvando arquivo HTML...');
    const outputPath = path.join(ANALYSIS_DIR, 'visualizations.html');
    fs.writeFileSync(outputPath, html);

    logger.info('═══════════════════════════════════════════════════');
    logger.info('VISUALIZAÇÕES GERADAS COM SUCESSO');
    logger.info('═══════════════════════════════════════════════════');
    logger.info(`Arquivo gerado: ${outputPath}`);
    logger.info('Abra em um navegador para visualizar os gráficos interativos');
    logger.info('═══════════════════════════════════════════════════');
  } catch (error) {
    logger.error('Erro ao gerar visualizações:', error);
    throw error;
  }
}

export {
  generateVisualizations,
  generateHTML,
  generatePieChart,
  generateBarChart,
  generateScatterChart,
};
