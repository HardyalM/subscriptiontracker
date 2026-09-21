import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node', // the tested code is framework-free (see calculations.js) — no DOM needed
    include: ['src/**/*.test.js'],
  },
})
