/* eslint-disable camelcase */
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	build: {
		rollupOptions: {
			output: {
				/* Package phaser in a chunk named phaser */
				manualChunks: {
					phaser: [ 'phaser' ],
				},
			},
		},
	},
	base: './', // Use relative paths in index.html, makes our app relocatable.
	define: {
		// eslint-disable-next-line no-undef
		__VERSION__: JSON.stringify(process.env.npm_package_version || '0.0.0'),
		__BUILD_DATE__: JSON.stringify(new Date().toDateString()),
	},
	plugins: [
		VitePWA({
			registerType: 'autoUpdate',
			// cache all the imports
			workbox: {
				globPatterns: [ '**/*' ],
				maximumFileSizeToCacheInBytes: 10000000,
			},
			// cache all the static assets in the public folder
			includeAssets: [
				'**/*',
			],
			manifest: {
				name: 'Triggies Attack!',
				short_name: 'triggies',

				// URL relative to manifest file
				start_url: './',

				display: 'standalone',
				background_color: '#42423b',
				theme_color: '#f33061',
				icons: [ {
					// relative to manifest file
					src: './logo192.png',
					sizes: '192x192',
					type: 'image/png',
				}, {
					// relative to manifest file
					src: './logo512.png',
					sizes: '512x512',
					type: 'image/png',
				} ],
			},
		}),
	],
});
