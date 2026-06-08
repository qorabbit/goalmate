#!/usr/bin/env node

import { Command } from 'commander';
import fs from 'fs';
import path from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { generateContentStream } from '../src/api.js';
import { setupWizard } from '../src/config.js';
import { startChat } from '../src/chat.js';
import { printError, renderMarkdown, theme } from '../src/ui.js';

const program = new Command();

/**
 * Calculates the number of rows a string will occupy in the terminal.
 * @param {string} text - The input text.
 * @param {number} [columns] - Number of terminal columns.
 * @param {number} [prefixLength] - Offset length for the first line.
 * @returns {number} The estimated number of rows.
 */
function getTerminalLines(text, columns, prefixLength = 0) {
  if (!columns) return text.split('\n').length;
  let lines = 0;
  const splitText = text.split('\n');
  
  for (let i = 0; i < splitText.length; i++) {
    const lineTextLength = splitText[i].length + (i === 0 ? prefixLength : 0);
    lines += Math.max(1, Math.ceil(lineTextLength / columns));
  }
  return lines;
}

/**
 * Helper to read standard input stream.
 * @returns {Promise<string|null>} The piped text or null if TTY.
 */
async function readStdin() {
  if (process.stdin.isTTY) {
    return null;
  }
  let data = '';
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data;
}

program
  .name('gemini')
  .description('A feature-rich, high-performance Node.js CLI tool to interact with the Gemini API.')
  .version('1.0.0')
  .argument('[prompt...]', 'Prompt text to send to the Gemini model')
  .option('-m, --model <name>', 'Override default Gemini model')
  .option('-t, --temperature <value>', 'Override default temperature (0.0 to 2.0)')
  .option('-s, --system <instruction>', 'Override default system instruction')
  .option('-f, --file <path>', 'Include text file contents in the prompt context')
  .action(async (promptParts, options) => {
    const promptText = promptParts.join(' ');
    const pipedData = await readStdin();

    // Default action if no prompt, no file context, and no piped data is to start interactive chat
    if (!promptText && !pipedData && !options.file) {
      await startChat({
        model: options.model,
        temperature: options.temperature,
        systemInstruction: options.system,
      });
      return;
    }

    // Process file context if provided
    let fileContext = '';
    if (options.file) {
      try {
        const filePath = path.resolve(options.file);
        if (!fs.existsSync(filePath)) {
          printError(`File not found: ${options.file}`);
          process.exit(1);
        }
        const stats = fs.statSync(filePath);
        if (!stats.isFile()) {
          printError(`Path is not a file: ${options.file}`);
          process.exit(1);
        }
        const fileContent = fs.readFileSync(filePath, 'utf8');
        const filename = path.basename(filePath);
        fileContext = `\n\n--- Attached File: ${filename} ---\n${fileContent}\n`;
      } catch (error) {
        printError(`Could not read file ${options.file}: ${error.message}`);
        process.exit(1);
      }
    }

    // Assemble the final prompt
    let finalPrompt = '';
    if (promptText) {
      finalPrompt += promptText;
    }
    if (pipedData) {
      finalPrompt += (finalPrompt ? '\n\n' : '') + `--- Piped Standard Input ---\n${pipedData}\n`;
    }
    if (fileContext) {
      finalPrompt += fileContext;
    }

    // Call Gemini API and stream response
    const spinner = ora('Thinking...').start();
    let fullResponse = '';

    try {
      spinner.stop();
      process.stdout.write(theme.model('Gemini: '));

      await generateContentStream(
        finalPrompt,
        {
          model: options.model,
          temperature: options.temperature,
          systemInstruction: options.system,
        },
        (chunk) => {
          process.stdout.write(chalk.dim(chunk));
          fullResponse += chunk;
        }
      );

      // Newline after stream finishes
      console.log();

      // Render Markdown beautifully and overwrite the raw text stream
      const cols = process.stdout.columns;
      if (cols && fullResponse.length > 0) {
        const linesToClear = getTerminalLines(fullResponse, cols, 8); // 'Gemini: ' prefix is 8 chars
        process.stdout.write(`\r\x1b[${linesToClear}A\x1b[0J`);
        process.stdout.write(theme.model('Gemini:\n'));
        console.log(renderMarkdown(fullResponse).trimEnd());
      }
    } catch (error) {
      if (spinner.isSpinning) spinner.fail('Failed');
      printError(error.message);
      process.exit(1);
    }
  });

program
  .command('chat')
  .description('Start an interactive multi-turn chat session')
  .option('-m, --model <name>', 'Override default Gemini model')
  .option('-t, --temperature <value>', 'Override default temperature (0.0 to 2.0)')
  .option('-s, --system <instruction>', 'Override default system instruction')
  .action(async (chatOptions) => {
    await startChat({
      model: chatOptions.model,
      temperature: chatOptions.temperature,
      systemInstruction: chatOptions.system,
    });
  });

program
  .command('config')
  .description('Run configuration wizard to set API Key, default model, and preferences')
  .action(async () => {
    await setupWizard();
  });

// Handle uncaught options/arguments
program.parseAsync(process.argv).catch((error) => {
  printError(error.message);
  process.exit(1);
});
