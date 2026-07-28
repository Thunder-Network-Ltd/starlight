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
			locales: {
				root: { label: '简体中文', lang: 'zh-CN' },
			},
			logo: {
				light: './src/assets/lumen-black.svg',
				dark: './src/assets/lumen-white.svg',
				alt: 'Lumen',
				replacesTitle: true,
			},
			favicon: '/favicon.svg',
			customCss: ['./src/styles/custom.css'],
			social: [
				{ icon: 'telegram', label: 'Telegram', href: 'https://t.me/@Lumen_Media' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/Ry7yDf4ApF' },
			],
			components: {
				SiteTitle: './src/components/SiteTitle.astro',
				MarkdownContent: './src/components/MarkdownContent.astro',
			},
			sidebar: [
				{
					label: '开始使用',
					items: [
						{ label: '关于 Lumen', slug: 'overview/introduction' },
						{ label: '面板使用教程', slug: 'overview/panel' },
					],
				},
				{
					label: '使用教程',
					items: [
						{ label: '客户端总览', slug: 'application/summery' },
						{ label: 'Android', slug: 'application/android' },
						{ label: 'iOS', slug: 'application/ios' },
						{ label: 'Windows', slug: 'application/windows' },
					],
				},
				{
					label: '常见问题',
					items: [
						{ label: '账号与登录', slug: 'troubleshooting/account' },
						{ label: '播放问题排查', slug: 'troubleshooting/playback' },
						{ label: '订阅与余额', slug: 'troubleshooting/billing' },
						{ label: '求片与报错', slug: 'troubleshooting/content' },
					],
				},
				{
					label: '条款与声明',
					items: [
						{ label: '服务条款', slug: 'legal/terms' },
						{ label: '隐私政策', slug: 'legal/privacy' },
						{ label: '内容与版权声明', slug: 'legal/copyright' },
					],
				},
			],
		}),
	],
});
