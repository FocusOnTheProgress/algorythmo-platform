/// <reference types="vitest" />
import { defineConfig } from 'vitest/config';
import path from 'path';
import vue from '@vitejs/plugin-vue';
import yaml from '@rollup/plugin-yaml';

export default defineConfig({
  plugins: [vue(), yaml()],
  css: {
    // Override postcss.config.js — pnpm strict mode doesn't hoist
    // postcss-import and its deps into the flat node_modules, so vitest
    // will crash trying to load postcss.config.js. For JS/Vue unit tests,
    // we don't need CSS processing at all.
    postcss: { plugins: [] },
  },
  resolve: {
    alias: {
      vue: 'vue/dist/vue.esm-bundler.js',
      components: path.resolve('./app/javascript/dashboard/components'),
      next: path.resolve('./app/javascript/dashboard/components-next'),
      v3: path.resolve('./app/javascript/v3'),
      dashboard: path.resolve('./app/javascript/dashboard'),
      helpers: path.resolve('./app/javascript/shared/helpers'),
      shared: path.resolve('./app/javascript/shared'),
      survey: path.resolve('./app/javascript/survey'),
      widget: path.resolve('./app/javascript/widget'),
      assets: path.resolve('./app/javascript/dashboard/assets'),
      engines: path.resolve('./engines'),
      '@algorythmo/styles': path.resolve(
        './engines/algorythmo/app/assets/stylesheets/algorythmo.scss'
      ),
      '@algorythmo': path.resolve(
        './app/javascript/dashboard/components-next/algorythmo'
      ),
    },
  },
  test: {
    environment: 'jsdom',
    include: [
      'app/javascript/dashboard/helper/algorythmo/**/*.spec.{js,ts}',
      'app/javascript/dashboard/composables/algorythmo/**/*.spec.{js,ts}',
      'app/javascript/dashboard/components-next/algorythmo/**/*.spec.{js,ts}',
      // algorythmo: PR7 — Copiloto (operator knowledge consultant) specs.
      'app/javascript/dashboard/modules/algorythmo/copilot/**/*.spec.{js,ts}',
      'engines/algorythmo/app/javascript/**/*.spec.{js,ts}',
    ],
    globals: true,
    setupFiles: ['./vitest.setup.js'],
  },
});
