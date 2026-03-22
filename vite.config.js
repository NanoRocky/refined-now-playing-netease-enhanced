import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js';
import path from 'path';

export default defineConfig(({ mode }) => {
    const isDev = mode === 'development';
    return {
        plugins: [
            react({
                jsxRuntime: 'classic',
            }),
            cssInjectedByJsPlugin(),
        ],
        // BetterNCM doesn't need HTML entry per se, but Vite conventionally uses index.html
        // We can configure lib mode for BetterNCM plugin script.
        define: {
            'process.env.NODE_ENV': JSON.stringify(isDev ? 'development' : 'production')
        },
        build: {
            lib: {
                entry: path.resolve(__dirname, 'src/main.tsx'), // the entry point
                name: 'RefinedNowPlayingEnhanced',
                formats: ['iife'],
                fileName: () => 'main.js',
            },
            rollupOptions: {
                external: ['react', 'react-dom'],
                output: {
                    globals: {
                        react: 'React',
                        'react-dom': 'ReactDOM'
                    }
                }
            },
            outDir: 'dist',
            minify: 'esbuild',
            watch: isDev ? {} : null,
        },
        resolve: {
            alias: {
                path: 'path-browserify',
            }
        }
    }
});
