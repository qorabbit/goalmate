import fs from 'fs';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';
import chalk from 'chalk';

const CONFIG_FILE = path.join(os.homedir(), '.gemini-cli-config.json');

const DEFAULT_CONFIG = {
  apiKey: '',
  defaultModel: 'gemini-2.5-flash',
  systemInstruction: '',
  temperature: 1.0,
};

/**
 * Loads the configuration from the config file, merging with defaults.
 * Falls back to process.env.GEMINI_API_KEY if no key is stored.
 * @returns {object} The configuration object.
 */
export function loadConfig() {
  let fileConfig = {};
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const content = fs.readFileSync(CONFIG_FILE, 'utf8');
      fileConfig = JSON.parse(content);
    } catch (error) {
      console.warn(chalk.yellow(`Warning: Could not parse config file. Using defaults. Error: ${error.message}`));
    }
  }

  const merged = { ...DEFAULT_CONFIG, ...fileConfig };

  // Fallback to environment variable if apiKey is empty
  if (!merged.apiKey && process.env.GEMINI_API_KEY) {
    merged.apiKey = process.env.GEMINI_API_KEY;
  }

  return merged;
}

/**
 * Saves the configuration object to the config file.
 * @param {object} config - The configuration object to save.
 */
export function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error(chalk.red(`Error: Could not save config file to ${CONFIG_FILE}: ${error.message}`));
    return false;
  }
}

/**
 * Runs the interactive configuration wizard.
 */
export async function setupWizard() {
  const currentConfig = loadConfig();

  console.log(chalk.bold.magenta('\n--- Gemini CLI Configuration Setup ---\n'));
  console.log(chalk.gray(`Config file path: ${CONFIG_FILE}\n`));

  const questions = [
    {
      type: 'password',
      name: 'apiKey',
      message: 'Enter your Gemini API Key:',
      mask: '*',
      default: currentConfig.apiKey,
      validate: (input) => {
        if (!input && !process.env.GEMINI_API_KEY) {
          return 'API Key is required unless GEMINI_API_KEY environment variable is set.';
        }
        return true;
      },
    },
    {
      type: 'list',
      name: 'defaultModel',
      message: 'Select your default Gemini model:',
      choices: [
        { name: 'gemini-2.5-flash (Fast, efficient, multimodal)', value: 'gemini-2.5-flash' },
        { name: 'gemini-2.5-pro (Highly creative, complex tasks, coding)', value: 'gemini-2.5-pro' },
      ],
      default: currentConfig.defaultModel,
    },
    {
      type: 'input',
      name: 'systemInstruction',
      message: 'Default system instruction (optional, e.g., "You are a helpful coding assistant"):',
      default: currentConfig.systemInstruction,
    },
    {
      type: 'input',
      name: 'temperature',
      message: 'Default temperature (0.0 to 2.0):',
      default: currentConfig.temperature.toString(),
      validate: (input) => {
        const val = parseFloat(input);
        if (isNaN(val) || val < 0.0 || val > 2.0) {
          return 'Temperature must be a number between 0.0 and 2.0';
        }
        return true;
      },
      filter: (input) => parseFloat(input),
    },
  ];

  try {
    const answers = await inquirer.prompt(questions);
    
    // If the API key is entered as masked (dots) but wasn't changed, preserve the existing key
    if (answers.apiKey === currentConfig.apiKey && currentConfig.apiKey) {
      // Keep existing
    }

    const newConfig = {
      apiKey: answers.apiKey,
      defaultModel: answers.defaultModel,
      systemInstruction: answers.systemInstruction,
      temperature: answers.temperature,
    };

    if (saveConfig(newConfig)) {
      console.log(chalk.green.bold('\n✔ Configuration saved successfully!\n'));
      console.log(chalk.dim('Stored configuration:'));
      console.log(chalk.dim(`  Model: ${newConfig.defaultModel}`));
      console.log(chalk.dim(`  Temperature: ${newConfig.temperature}`));
      console.log(chalk.dim(`  System Instruction: ${newConfig.systemInstruction || '(none)'}`));
      console.log(chalk.dim(`  API Key: ${newConfig.apiKey ? '••••••••' + newConfig.apiKey.slice(-4) : '(not set)'}\n`));
    }
  } catch (error) {
    console.error(chalk.red(`Setup wizard failed: ${error.message}`));
  }
}
