import logger from './config/logger.js';
import { runAnalysis } from './analysis/index.js';

runAnalysis().catch((error) => {
  logger.error(`Falha na análise estatística: ${error.message}`);
  process.exit(1);
});
