// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import { sidebar } from './src/sidebar.mjs';

// https://astro.build/config
export default defineConfig({
	// 2026-10-11 用户定：文档站域名换成 docs.lumen.ax（doc.lumen.ax 在 Cloudflare 上 301 过来）；site 同时让 sitemap 与 canonical 有绝对地址
	site: 'https://docs.lumen.ax',
	image: {
		responsiveStyles: true,
	},
	// 2026-09 目录重排后的旧地址：控制台侧栏「教程文档」、群公告和收藏夹里都还有这些链接
	redirects: {
		'/overview/introduction': '/start/about/',
		'/overview/panel': '/clients/connect/',
		// 2026-10-14「个人概览」页删除（只是在介绍控制台首页的卡片），播放线路的位置写在连接信息里
		'/panel/overview': '/clients/connect/',
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
				Pagination: './src/components/Pagination.astro',
			},
			sidebar,
			// 每页的分享图 og:image（src/og/）
			routeMiddleware: './src/routeData.ts',
		}),
	],
});
