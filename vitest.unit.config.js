const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    name: 'unit',
    environment: 'node',
    globals: true,
    include: ['tests/unit/**/*.test.js']
  }
});
