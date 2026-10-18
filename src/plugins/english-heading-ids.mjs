import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import GithubSlugger from 'github-slugger';
import { headingIds } from '../heading-ids.mjs';

const nonAscii = /[^\x00-\x7f]/;

// 给标题换英文 id 的 hast 插件（表在 src/heading-ids.mjs）。
// 必须排在 Starlight 自己的 heading-ids / autolink 之前：那两个只在标题还没有 id 时才拿原文生成，
// 已有的 id 会原样用进目录、锚点链接和右栏「本页内容」。
function englishHeadingIds() {
	const slugger = new GithubSlugger();
	// 换之前的中文 id 照原规则另算一份，挂在 data-legacy-id 上，
	// 让已经发出去的 /start/plans/#选择线路 这种旧链接还能跳到对的地方（见 astro.config.mjs 的 head 脚本）
	const legacySlugger = new GithubSlugger();
	return {
		name: 'english-heading-ids',
		element: {
			filter: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
			visit(node, ctx) {
				if (typeof node.properties?.id === 'string') return;
				const text = ctx.textContent(node).trim();
				const legacyId = legacySlugger.slug(text);
				// 没登记的中文标题这里不抛错：Starlight 的内容加载器会把渲染错误吞成一行 ERROR、构建照样 exit 0
				// （2026-10-19 弄坏复核实测）。照旧出中文 id，由 astro:build:done 的产物检查让构建失败。
				const id = slugger.slug(headingIds[text] ?? text);
				ctx.setProperty(node, 'id', id);
				if (legacyId !== id) ctx.setProperty(node, 'data-legacy-id', legacyId);
			},
		},
	};
}

/** 把插件插到 markdown 处理器的 hast 插件最前面（Starlight 在 astro:config:setup 里往后追加它自己的）。 */
export function englishHeadingIdsIntegration() {
	return {
		name: 'lumen-english-heading-ids',
		hooks: {
			'astro:config:setup': ({ config }) => {
				const processor = config.markdown?.processor;
				if (!processor?.options?.hastPlugins) {
					throw new Error(`markdown 处理器「${processor?.name}」不是 satteri，英文锚点插件挂不上`);
				}
				processor.options.hastPlugins.unshift(englishHeadingIds);
			},
			'astro:build:done': ({ dir }) => {
				const problems = checkAnchors(fileURLToPath(dir));
				if (problems.length) {
					throw new Error(`锚点检查没过（src/plugins/english-heading-ids.mjs）：\n${problems.join('\n')}`);
				}
			},
		},
	};
}

/**
 * 扫构建产物：标题 id 不许带中文（没登记进 src/heading-ids.mjs 的会漏成中文），
 * 站内 /path/#anchor 链接必须指到真实存在的 id（改了英文锚点名、正文链接没跟着改就会断）。
 */
function checkAnchors(root) {
	const pages = new Map();
	const walk = (dir) => {
		for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) walk(full);
			else if (entry.name === 'index.html') {
				const rel = path.relative(root, dir).split(path.sep).join('/');
				pages.set(rel ? `/${rel}/` : '/', fs.readFileSync(full, 'utf8'));
			}
		}
	};
	walk(root);
	const idsByPage = new Map(
		[...pages].map(([url, html]) => [url, new Set([...html.matchAll(/ id="([^"]+)"/g)].map((m) => m[1]))]),
	);
	const problems = [];
	for (const [url, html] of pages) {
		for (const [, tag, id] of html.matchAll(/<(h[1-6]) id="([^"]+)"/g)) {
			if (nonAscii.test(id)) problems.push(`${url} 的 <${tag}> 是中文锚点 #${id}：去 src/heading-ids.mjs 登记英文`);
		}
		for (const [, target, anchor] of html.matchAll(/href="(\/[^"#]*|)#([^"]+)"/g)) {
			const page = target || url;
			if (!idsByPage.has(page)) continue; // 重定向页、静态文件等不在产物页表里的不查
			if (!idsByPage.get(page).has(decodeURIComponent(anchor))) {
				problems.push(`${url} 链到 ${page}#${anchor}，那页没有这个锚点`);
			}
		}
	}
	return [...new Set(problems)];
}
