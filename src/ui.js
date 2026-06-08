import { marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import chalk from 'chalk';

// Configure marked with a custom styled terminal renderer for premium aesthetics
marked.use(
  markedTerminal({
    code: chalk.yellow,
    blockquote: chalk.gray.italic,
    html: chalk.gray,
    heading: chalk.bold.cyan,
    firstHeading: chalk.bold.magenta.underline,
    listitem: chalk.white,
    table: chalk.reset,
    tablerow: chalk.reset,
    strong: chalk.bold.white,
    em: chalk.italic,
    codespan: chalk.bgGray.yellow,
    href: chalk.blue.underline,
    del: chalk.dim.lineThrough,
  })
);

/**
 * Renders raw markdown text into a styled terminal string.
 * @param {string} text - The raw markdown content.
 * @returns {string} The formatted terminal string.
 */
export function renderMarkdown(text) {
  if (!text) return '';
  return marked.parse(text);
}

/**
 * Prints the main application banner.
 */
export function printBanner() {
  const line = '━'.repeat(50);
  console.log(chalk.cyan(line));
  console.log(chalk.bold.magenta('   GEMINI TERMINAL CLI  '));
  console.log(chalk.dim('   Your advanced AI companion in the shell'));
  console.log(chalk.cyan(line));
}

/**
 * Theme colors for chat roles and feedback.
 */
export const theme = {
  user: chalk.bold.cyan,
  model: chalk.bold.magenta,
  system: chalk.bold.yellow,
  error: chalk.bold.red,
  success: chalk.bold.green,
  info: chalk.bold.blue,
  dim: chalk.dim,
  bold: chalk.bold,
};

/**
 * Display helper for printing prompt labels.
 */
export function printUserPrompt() {
  process.stdout.write(theme.user('\nYou: '));
}

/**
 * Display helper for printing model labels.
 */
export function printModelPrompt() {
  process.stdout.write(theme.model('\nGemini: '));
}

/**
 * Helper to display error messages.
 * @param {string} msg - The error message.
 */
export function printError(msg) {
  console.error(`\n${theme.error('✖ Error:')} ${msg}`);
}

/**
 * Helper to display warning messages.
 * @param {string} msg - The warning message.
 */
export function printWarning(msg) {
  console.warn(`\n${theme.system('⚠ Warning:')} ${msg}`);
}

/**
 * Helper to display success messages.
 * @param {string} msg - The success message.
 */
export function printSuccess(msg) {
  console.log(`\n${theme.success('✔')} ${msg}`);
}
