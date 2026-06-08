import readline from 'readline/promises';
import chalk from 'chalk';
import { createChatSession } from './api.js';
import { renderMarkdown, printBanner, theme, printUserPrompt, printModelPrompt, printError, printSuccess } from './ui.js';

/**
 * Calculates the number of rows a string will occupy in the terminal.
 * @param {string} text - The input text.
 * @param {number} [columns] - Number of terminal columns.
 * @returns {number} The estimated number of rows.
 */
function getTerminalLines(text, columns) {
  if (!columns) return text.split('\n').length;
  let lines = 0;
  const splitText = text.split('\n');
  for (const paragraph of splitText) {
    // Math.max(1, ...) ensures empty lines still count as 1 row
    lines += Math.max(1, Math.ceil(paragraph.length / columns));
  }
  return lines;
}

/**
 * Starts the interactive chat session.
 * @param {object} options - CLI configurations and overrides.
 */
export async function startChat(options = {}) {
  printBanner();
  console.log(theme.info('Interactive Chat Mode Started.'));
  console.log(theme.dim('Type your prompt and press Enter.'));
  console.log(theme.dim('Available commands: /exit, /clear, /system, /history, /help\n'));

  let chatSession = createChatSession(options);
  let conversationCount = 0;
  let currentSystemInstruction = options.systemInstruction || '';

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    while (true) {
      printUserPrompt();
      const input = await rl.question('');
      const trimmedInput = input.trim();

      if (!trimmedInput) continue;

      // Handle Slash Commands
      if (trimmedInput.startsWith('/')) {
        const parts = trimmedInput.split(' ');
        const command = parts[0].toLowerCase();

        if (command === '/exit' || command === '/quit') {
          console.log(theme.info('\nGoodbye!'));
          break;
        } else if (command === '/clear') {
          console.clear();
          printBanner();
          chatSession = createChatSession({ ...options, systemInstruction: currentSystemInstruction });
          conversationCount = 0;
          console.log(theme.success('Chat history and terminal cleared. Fresh session started.'));
          continue;
        } else if (command === '/history') {
          console.log(theme.info(`\nConversation turns: ${conversationCount}`));
          continue;
        } else if (command === '/system') {
          const newInstruction = parts.slice(1).join(' ').trim();
          if (newInstruction) {
            currentSystemInstruction = newInstruction;
            chatSession = createChatSession({ ...options, systemInstruction: currentSystemInstruction });
            conversationCount = 0;
            printSuccess(`System instruction updated to: "${currentSystemInstruction}". Session reset.`);
          } else {
            console.log(theme.info(`\nCurrent System Instruction: ${currentSystemInstruction || '(none)'}`));
          }
          continue;
        } else if (command === '/help') {
          console.log(chalk.bold('\nAvailable Chat Commands:'));
          console.log(`  ${chalk.cyan('/exit')} or ${chalk.cyan('/quit')}   - Close the chat session`);
          console.log(`  ${chalk.cyan('/clear')}             - Reset session history and clear terminal`);
          console.log(`  ${chalk.cyan('/system [text]')}    - Get or set the active system instruction (resets session)`);
          console.log(`  ${chalk.cyan('/history')}           - View the current session message count`);
          console.log(`  ${chalk.cyan('/help')}              - Show this help menu`);
          continue;
        } else {
          printWarning(`Unknown command: ${command}. Type /help to see available commands.`);
          continue;
        }
      }

      // Generate response from Gemini
      printModelPrompt();
      let fullResponseText = '';
      
      try {
        const stream = await chatSession.sendMessageStream({ message: trimmedInput });
        
        // Print the stream dynamically in dim/grey style
        for await (const chunk of stream) {
          const textChunk = chunk.text || '';
          fullResponseText += textChunk;
          process.stdout.write(chalk.dim(textChunk));
        }

        // Snap render: Clear the plain stream text and print markdown formatted text
        const cols = process.stdout.columns;
        if (cols && fullResponseText.length > 0) {
          const linesToClear = getTerminalLines(fullResponseText, cols);
          // ANSI escape: move cursor up 'linesToClear' lines, then clear to end of screen
          process.stdout.write(`\r\x1b[${linesToClear}A\x1b[0J`);
        } else {
          process.stdout.write('\r');
        }

        // Print fully formatted markdown
        console.log(renderMarkdown(fullResponseText).trimEnd());
        conversationCount++;

      } catch (error) {
        console.log(); // Newline after aborted stream output
        printError(error.message);
      }
    }
  } catch (err) {
    printError(`Chat loop encountered an error: ${err.message}`);
  } finally {
    rl.close();
  }
}
