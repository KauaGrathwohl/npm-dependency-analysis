import { Command } from 'commander';
import { validateConfig } from './config/index.js';
import logger from './config/logger.js';
import {
  runFullPipeline,
  runPhaseSelect,
  runPhaseCollect,
  runPhaseExport,
} from './pipeline/index.js';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import config from './config/index.js';

async function onCollect() {
  try {
    validateConfig();

    await runFullPipeline();
  } catch (error) {
    logger.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
}

async function onSelect() {
  try {
    validateConfig();

    await runPhaseSelect();
  } catch (error) {
    logger.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
}

async function onResume(options) {
  try {
    validateConfig();

    const filePath = resolve(config.paths.root, options.file);
    const repos = JSON.parse(readFileSync(filePath, 'utf-8'));

    logger.info(`Retomando coleta com ${repos.length} repositórios de ${filePath}`);

    const collected = await runPhaseCollect(repos);

    await runPhaseExport(collected);
  } catch (error) {
    logger.error(`Erro fatal: ${error.message}`);
    process.exit(1);
  }
}


async function onValidate() {
  try {
    validateConfig();

    const { getRateLimit } = await import('./services/github-client.js');

    const rate = await getRateLimit();

    logger.info('Configuração válida.');
    logger.info(`Rate limit: ${rate.remaining}/${rate.limit}`);
    logger.info(`Reset em: ${new Date(rate.reset * 1000).toISOString()}`);
  } catch (error) {
    logger.error(`Validação falhou: ${error.message}`);
    process.exit(1);
  }
}

const program = new Command();

program
  .name('npm-dep-analysis')
  .description(
    'Coleta de dados para análise do impacto das atualizações de dependências ' +
    'no esforço de manutenção em projetos open-source do ecossistema NPM'
  )
  .version('1.0.0');

program
  .command('collect')
  .description('Executa o pipeline completo de coleta de dados')
  .action(onCollect);

program
  .command('select')
  .description('Executa apenas a fase de seleção de repositórios')
  .action(onSelect);

program
  .command('resume')
  .description('Retoma a coleta a partir de repositórios já selecionados')
  .option(
    '-f, --file <path>',
    'Arquivo JSON com repositórios selecionados',
    'data/output/selected-repositories.json'
  )
  .action(onResume);

program
  .command('validate')
  .description('Valida a configuração e conectividade com GitHub API')
  .action(onValidate);

program.parse();
