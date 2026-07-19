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
				{ icon: 'telegram', label: 'Telegram', href: 'https://t.me/@Lumen_Media' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/Ry7yDf4ApF' },
			],
			components: {
				SiteTitle: './src/components/SiteTitle.astro',
			},
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
						{ label: '客户端总览', slug: 'application/summery' },
						{ label: 'Android', slug: 'application/android' },
						{ label: 'iOS', slug: 'application/ios' },
						{ label: 'Windows', slug: 'application/windows' },
						{ label: '设备访问', slug: 'access/clients' },
						{ label: '常见问题', slug: 'troubleshooting/faq' },
					],
				},
			],
		}),
	],
});
