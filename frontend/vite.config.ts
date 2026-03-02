import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/auth': 'http://localhost:3000',
			'/api/setup': 'http://localhost:3000',
			'/api/generate': 'http://localhost:3000',
			'/api/stream': 'http://localhost:3000',
			'/api/quota': 'http://localhost:3000'
		}
	}
});
