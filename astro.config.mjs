// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	image: {
		responsiveStyles: true,
	},
	integrations: [
		starlight({
			title: 'Emby 文档',
			logo: {
				light: './src/assets/lumen-black.svg',
				dark: './src/assets/lumen-white.svg',
				alt: 'Lumen',
				replacesTitle: true,
			},
			favicon: '/favicon.svg',
			social: [
				{ icon: 'telegram', label: 'Telegram', href: 'https://t.me/LumenEmby' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/yKrXZctAm' },
			],
			sidebar: [
				{
					label: '开始使用',
					items: [
						{ label: '关于 Lumen', slug: 'overview/introduction' },
					],
				},
				{
					label: '使用教程',
					items: [
						{ label: 'Android', slug: 'application/android' },
						{ label: 'iOS', slug: 'application/ios' },
						{ label: '设备访问', slug: 'access/clients' },
						{ label: '常见问题', slug: 'troubleshooting/faq' },
					],
				},
			],
		}),
	],
});
