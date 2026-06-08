import assert from 'assert';
import { loadConfig } from '../src/config.js';
import { renderMarkdown } from '../src/ui.js';

console.log('Running Gemini CLI Smoke Tests...\n');

// 1. Test Config Loader
try {
  const config = loadConfig();
  assert.ok(config, 'Config object should be loaded');
  assert.ok(config.defaultModel, 'Default model should be present');
  console.log('✔ loadConfig() test passed');
} catch (err) {
  console.error('✖ loadConfig() test failed:', err);
  process.exit(1);
}

// 2. Test Markdown Renderer
try {
  const markdown = '# Hello World\n**bold**';
  const rendered = renderMarkdown(markdown);
  assert.ok(rendered.includes('Hello World'), 'Rendered text should contain content');
  console.log('✔ renderMarkdown() test passed');
} catch (err) {
  console.error('✖ renderMarkdown() test failed:', err);
  process.exit(1);
}

console.log('\n✔ All smoke tests passed successfully!');
process.exit(0);
