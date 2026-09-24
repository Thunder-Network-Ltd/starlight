// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

// https://astro.build/config
export default defineConfig({
	image: {
		responsiveStyles: true,
	},
	// 2026-09 目录重排后的旧地址：控制台侧栏「教程文档」、群公告和收藏夹里都还有这些链接
	redirects: {
		'/overview/introduction': '/start/about/',
		'/overview/panel': '/panel/overview/',
		'/application/summery': '/clients/',
		'/application/ios': '/clients/apple/',
		'/application/android': '/clients/android/',
		'/application/windows': '/clients/windows/',
		'/troubleshooting/content': '/panel/feedback/',
	},
	integrations: [
		starlight({
			title: 'Lumen 文档',
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
				{ icon: 'telegram', label: 'Telegram', href: 'https://t.me/Lumen_Media' },
				{ icon: 'discord', label: 'Discord', href: 'https://discord.gg/Ry7yDf4ApF' },
			],
			components: {
				Hero: './src/components/Hero.astro',
				SiteTitle: './src/components/SiteTitle.astro',
				MarkdownContent: './src/components/MarkdownContent.astro',
			},
			sidebar: [
				{
					label: '开始使用',
					items: [
						{ label: '快速开始', slug: 'start/quickstart' },
						{ label: '套餐、线路与流量', slug: 'start/plans' },
						{ label: '关于 Lumen', slug: 'start/about' },
					],
				},
				{
					label: '客户端',
					items: [
						{ label: '客户端总览', slug: 'clients' },
						{ label: '连接信息', slug: 'clients/connect' },
						{ label: 'iPhone · iPad · Apple TV', slug: 'clients/apple' },
						{ label: 'Android 与电视', slug: 'clients/android' },
						{ label: 'Windows 与 Mac', slug: 'clients/windows' },
					],
				},
				{
					label: '附加功能',
					items: [
						{ label: '网页在线观影', slug: 'watch/web' },
						{ label: '一起看', slug: 'watch/together' },
						{ label: '我的媒体库', slug: 'watch/libraries' },
					],
				},
				{
					label: '控制台',
					items: [
						{ label: '个人概览', slug: 'panel/overview' },
						{ label: '订阅与续费', slug: 'panel/subscription' },
						{ label: '充值与兑换码', slug: 'panel/wallet' },
						{ label: '邀请返利', slug: 'panel/invite' },
						{ label: '片库反馈', slug: 'panel/feedback' },
						{ label: '账号与安全', slug: 'panel/account' },
					],
				},
				{
					label: '常见问题',
					items: [
						{ label: '账号与登录', slug: 'troubleshooting/account' },
						{ label: '播放问题', slug: 'troubleshooting/playback' },
						{ label: '线路与流量', slug: 'troubleshooting/network' },
						{ label: '订阅与余额', slug: 'troubleshooting/billing' },
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
