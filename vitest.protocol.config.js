const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    name: 'protocol',
    environment: 'node',
    globals: true,
    include: ['tests/protocol/**/*.test.js']
  }
});
