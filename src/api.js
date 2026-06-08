import { GoogleGenAI } from '@google/genai';
import { loadConfig } from './config.js';
import { printError } from './ui.js';

let aiInstance = null;

/**
 * Initializes and returns the GoogleGenAI client instance.
 * @param {string} [overrideKey] - Optional API key override.
 * @returns {GoogleGenAI} The initialized Gemini API client.
 */
export function getApiClient(overrideKey) {
  if (aiInstance && !overrideKey) {
    return aiInstance;
  }

  const config = loadConfig();
  const apiKey = overrideKey || config.apiKey;

  if (!apiKey) {
    printError(
      'Gemini API Key is missing.\n' +
      'Please run ' + getBoldCmd('gemini config') + ' to set it up, or set the ' + getBoldCmd('GEMINI_API_KEY') + ' environment variable.'
    );
    process.exit(1);
  }

  aiInstance = new GoogleGenAI({ apiKey });
  return aiInstance;
}

function getBoldCmd(text) {
  return `\x1b[1m${text}\x1b[22m`;
}

/**
 * Generates content using a streaming API call.
 * @param {string|Array} contents - The input prompt(s) or multimodal content.
 * @param {object} [options] - Generation configurations (model, systemInstruction, temperature).
 * @param {function} onChunk - Callback executed for each chunk of text returned.
 * @returns {Promise<string>} The complete combined text response.
 */
export async function generateContentStream(contents, options = {}, onChunk = () => {}) {
  const config = loadConfig();
  const client = getApiClient(options.apiKey);

  const model = options.model || config.defaultModel || 'gemini-2.5-flash';
  const systemInstruction = options.systemInstruction !== undefined ? options.systemInstruction : config.systemInstruction;
  const temperature = options.temperature !== undefined ? parseFloat(options.temperature) : parseFloat(config.temperature);

  const apiConfig = {
    model,
    contents,
    config: {}
  };

  // Add optional systemInstruction and generationConfig if provided
  if (systemInstruction) {
    apiConfig.config.systemInstruction = systemInstruction;
  }

  if (!isNaN(temperature)) {
    apiConfig.config.generationConfig = {
      temperature: temperature
    };
  }

  try {
    const stream = await client.models.generateContentStream(apiConfig);
    let fullText = '';
    
    for await (const chunk of stream) {
      const chunkText = chunk.text || '';
      fullText += chunkText;
      onChunk(chunkText);
    }
    
    return fullText;
  } catch (error) {
    throw new Error(`Gemini API Error: ${error.message}`);
  }
}

/**
 * Creates and returns a stateful multi-turn chat session.
 * @param {object} [options] - Chat configuration.
 * @returns {object} The chat session object.
 */
export function createChatSession(options = {}) {
  const config = loadConfig();
  const client = getApiClient(options.apiKey);

  const model = options.model || config.defaultModel || 'gemini-2.5-flash';
  const systemInstruction = options.systemInstruction !== undefined ? options.systemInstruction : config.systemInstruction;
  const temperature = options.temperature !== undefined ? parseFloat(options.temperature) : parseFloat(config.temperature);

  const chatConfig = {
    model,
    config: {}
  };

  if (systemInstruction) {
    chatConfig.config.systemInstruction = systemInstruction;
  }

  if (!isNaN(temperature)) {
    chatConfig.config.generationConfig = {
      temperature: temperature
    };
  }

  try {
    return client.chats.create(chatConfig);
  } catch (error) {
    throw new Error(`Failed to initialize Gemini chat: ${error.message}`);
  }
}
