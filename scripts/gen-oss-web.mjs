#!/usr/bin/env node
/**
 * 从 Lumen 面板仓库的 apps/web 生成「网页与控制台」的开源组件清单。
 *
 * 用法：node scripts/gen-oss-web.mjs <lumen 仓库>/apps/web
 *   （先在那边 pnpm install，脚本只读 node_modules，不改那边任何文件）
 *
 * 产出两份：
 *   src/data/oss-web.json                       页面上列出的直接依赖（名称、版本、许可证、源码）
 *   public/downloads/third-party-notices-web.txt  生产依赖全树（含间接依赖）的许可证全文
 *
 * 为什么要全文：MIT / BSD / ISC 都要求随分发保留版权声明与许可文本，而 Next 打包压缩时会把
 * 文件头的许可证注释删掉，浏览器拿到的分块里没有这些声明，只能在这里补齐。
 * 手抄清单会随依赖升级漂掉，所以每次面板升级依赖后重跑一次。
 */
import fs from 'node:fs';
import path from 'node:path';

const webDir = path.resolve(process.argv[2] ?? '');
if (!fs.existsSync(path.join(webDir, 'package.json')) || !fs.existsSync(path.join(webDir, 'node_modules'))) {
	console.error('用法：node scripts/gen-oss-web.mjs <lumen 仓库>/apps/web（需先 pnpm install）');
	process.exit(1);
}
const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

// 页面清单不列：商业授权（HeroUI Pro 不是开源）、「网页播放器」一节已单列的组件（它们的许可证全文仍进全文文件）。
const EXCLUDE_DIRECT = new Set(['@heroui-pro/react', '@libmedia/avplayer', 'libpgs']);
// 全树不走：HeroUI Pro；以及 Next 只在服务端 / 构建时用、不进浏览器的原生包——sharp（服务端缩图）
// 与 @next/swc-*（编译器）。它们按平台装不同的二进制，留着的话在 Mac 和 Linux 上生成的清单会不一样。
const EXCLUDE_TREE = /^(@heroui-pro\/|sharp$|@img\/|@next\/swc-)/;

// 页面上只列主要项目，一个项目一行（2026-10-17 用户嫌页面太长）：同一项目的多个包（Tiptap 八个、React 与 react-dom…）
// 合成一行，版本取写在最前的那个包；值为 null 的是小工具，只进许可证全文、不上页面。
// 每项是 [项目名, 用途, 版权人]；版权人照该项目许可证里的 Copyright 行手写——自动取会取到 Apache 模板里的套话。
// 新增直接依赖没在这里登记时脚本会报出来，补一行即可。
const PROJECTS = {
	react: ['React', '界面框架', 'Meta Platforms, Inc.'],
	'react-dom': ['React', '界面框架', 'Meta Platforms, Inc.'],
	next: ['Next.js', '网页应用框架', 'Vercel, Inc.'],
	'@heroui/react': ['HeroUI', '界面组件库', 'HeroUI Inc.'],
	'@heroui/styles': ['HeroUI', '界面组件库', 'HeroUI Inc.'],
	'react-aria-components': ['React Aria', '无障碍交互组件', 'Adobe'],
	tailwindcss: ['Tailwind CSS', '样式框架', 'Tailwind Labs, Inc.'],
	'@fontsource-variable/inter': ['Inter', '字体', 'The Inter Project Authors'],
	'lucide-react': ['Lucide', '图标', 'Lucide Contributors'],
	motion: ['Motion', '动画', 'Motion B.V.'],
	'@tiptap/core': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	'@tiptap/react': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	'@tiptap/pm': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	'@tiptap/starter-kit': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	'@tiptap/extensions': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	'@tiptap/extension-link': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	'@tiptap/extension-underline': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	'@tiptap/suggestion': ['Tiptap', '富文本编辑器', 'Tiptap GmbH'],
	recharts: ['Recharts', '图表', 'Recharts Group'],
	'react-markdown': ['react-markdown', 'Markdown 渲染', 'Espen Hovlandsdal'],
	'remark-gfm': ['react-markdown', 'Markdown 渲染', 'Espen Hovlandsdal'],
	'remark-breaks': ['react-markdown', 'Markdown 渲染', 'Espen Hovlandsdal'],
	marked: ['marked', 'Markdown 解析', 'MarkedJS'],
	streamdown: ['Streamdown', 'Markdown 渲染', 'Vercel, Inc.'],
	shiki: ['Shiki', '代码高亮', 'Pine Wu, Anthony Fu'],
	'embla-carousel': ['Embla Carousel', '横滑轮播', 'David Jerleke'],
	'embla-carousel-react': ['Embla Carousel', '横滑轮播', 'David Jerleke'],
	swr: ['SWR', '数据请求', 'Vercel, Inc.'],
	'@simplewebauthn/browser': ['SimpleWebAuthn', '通行密钥登录', 'Matthew Miller'],
	'cap-widget': ['Cap', '人机验证', 'Tiago'],
	'@cap.js/wasm': ['Cap', '人机验证', 'Tiago'],
	'maplibre-gl': null,
	'@number-flow/react': null,
	'react-resizable-panels': null,
	'react-easy-crop': null,
	'qr-code-styling': null,
	clsx: null,
	'tailwind-merge': null,
	'tailwind-variants': null,
	'tw-animate-css': null,
};

// 写在 devDependencies 里、产物却打进浏览器 CSS 的（Tailwind 的基础样式与工具类、动画类），也要列。
const BUNDLED_DEV = ['tailwindcss', 'tw-animate-css'];

/** 从 fromDir 往上找 node_modules/<name>，与 Node 的解析规则一致（pnpm 的符号链接布局也适用）。 */
function resolvePkg(name, fromDir) {
	let dir = fromDir;
	for (;;) {
		const cand = path.join(dir, 'node_modules', name, 'package.json');
		if (fs.existsSync(cand)) return fs.realpathSync(path.dirname(cand));
		const parent = path.dirname(dir);
		if (parent === dir) return null;
		dir = parent;
	}
}

function licenseOf(pkg) {
	if (typeof pkg.license === 'string') return pkg.license;
	if (pkg.license?.type) return pkg.license.type;
	if (Array.isArray(pkg.licenses)) return pkg.licenses.map((l) => l.type ?? l).join(' OR ');
	return 'UNKNOWN';
}

function repoUrl(pkg) {
	let r = typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url;
	if (!r) return pkg.homepage ?? null;
	r = r.replace(/^git\+/, '').replace(/\.git$/, '').replace(/^git:\/\//, 'https://').replace(/^ssh:\/\/git@/, 'https://');
	if (/^github:/.test(r)) r = 'https://github.com/' + r.slice(7);
	if (/^[\w.-]+\/[\w.-]+$/.test(r)) r = 'https://github.com/' + r;
	return r;
}

const LICENSE_FILE = /^(licen[cs]e|copying|notice)(\.|-|$)/i;
function licenseTexts(dir) {
	return fs
		.readdirSync(dir)
		.filter((f) => LICENSE_FILE.test(f))
		.sort()
		.map((f) => fs.readFileSync(path.join(dir, f), 'utf8').trim());
}

const webPkg = JSON.parse(fs.readFileSync(path.join(webDir, 'package.json'), 'utf8'));
const direct = [...Object.keys(webPkg.dependencies ?? {}), ...BUNDLED_DEV.filter((n) => webPkg.devDependencies?.[n])];

// 生产依赖全树：只沿 dependencies 走（optional 装上了才算），devDependencies 不进浏览器。
const all = new Map(); // dir -> pkg
const queue = direct.filter((n) => !EXCLUDE_TREE.test(n)).map((n) => [n, webDir]);
const missing = [];
while (queue.length) {
	const [name, from] = queue.shift();
	const dir = resolvePkg(name, from);
	if (!dir) {
		missing.push(name);
		continue;
	}
	if (all.has(dir)) continue;
	const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
	all.set(dir, pkg);
	for (const dep of [...Object.keys(pkg.dependencies ?? {}), ...Object.keys(pkg.optionalDependencies ?? {})]) {
		if (!EXCLUDE_TREE.test(dep)) queue.push([dep, dir]);
	}
}
// 可选依赖（各平台的原生二进制）没装上是正常的，只把非可选的缺失报出来。
const hardMissing = missing.filter((n) => !/-(darwin|linux|win32|freebsd|android|wasm32)(-|$)/.test(n));
if (hardMissing.length) console.warn('解析不到的依赖：', [...new Set(hardMissing)].join(', '));

// 页面清单：直接依赖按项目合并
const groups = new Map();
const unknown = [];
// 按 PROJECTS 里的先后排（主框架在前），没登记的排最后
const ordered = [...Object.keys(PROJECTS).filter((n) => direct.includes(n)), ...direct.filter((n) => !(n in PROJECTS))];
for (const name of ordered) {
	if (EXCLUDE_DIRECT.has(name)) continue;
	if (!(name in PROJECTS)) unknown.push(name);
	const proj = PROJECTS[name];
	if (!proj || groups.has(proj[0])) continue;
	const dir = resolvePkg(name, webDir);
	const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
	groups.set(proj[0], { name: proj[0], role: proj[1], version: pkg.version, license: licenseOf(pkg), holder: proj[2], href: repoUrl(pkg) ?? undefined });
}
const items = [...groups.values()];
if (unknown.length) console.warn('这些直接依赖还没在 PROJECTS 登记：', unknown.join(', '));

// 全文：按名称排序，同一份许可证文本不去重（每个包的版权人不同）
const entries = [...all.values()]
	.filter((p) => !EXCLUDE_DIRECT.has(p.name))
	.sort((a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version));
const byLicense = {};
const noText = [];
const blocks = entries.map((p) => {
	const dir = [...all.entries()].find(([, v]) => v === p)[0];
	const lic = licenseOf(p);
	byLicense[lic] = (byLicense[lic] ?? 0) + 1;
	const texts = licenseTexts(dir);
	if (!texts.length) noText.push(`${p.name}@${p.version}（${lic}）`);
	const head = [`${p.name} ${p.version}`, `License: ${lic}`, repoUrl(p) ? `Source: ${repoUrl(p)}` : null].filter(Boolean).join('\n');
	const body = texts.length ? texts.join('\n\n') : `（该包未随附许可证文件，许可证为 ${lic}，见上方源码地址）`;
	return `${head}\n\n${body}`;
});

const today = new Date().toISOString().slice(0, 10);
const sep = '\n\n' + '='.repeat(78) + '\n\n';
const header = [
	'Lumen 网页与控制台 第三方开源组件许可声明',
	'Third-party open source notices for the Lumen web app and console',
	'',
	`生成日期 Generated: ${today}`,
	`共 ${entries.length} 个软件包 / ${entries.length} packages`,
	'',
	'网页播放器所用的 libmedia（LGPL-3.0-or-later）及其对应源码另见 https://docs.lumen.ax/legal/open-source/',
].join('\n');

fs.mkdirSync(path.join(root, 'src/data'), { recursive: true });
fs.writeFileSync(
	path.join(root, 'src/data/oss-web.json'),
	JSON.stringify({ generated: today, total: entries.length, licenses: byLicense, items }, null, '\t') + '\n',
);
// 开头带 UTF-8 BOM：静态服务回 text/plain 时多半不带 charset，没有 BOM 浏览器会把中文表头按 Latin-1 显示成乱码。
fs.writeFileSync(path.join(root, 'public/downloads/third-party-notices-web.txt'), '\uFEFF' + header + sep + blocks.join(sep) + '\n');

console.log(`页面列 ${items.length} 个项目，全树 ${entries.length} 个包`);
console.log('许可证分布：', byLicense);
if (noText.length) console.log(`没有随附许可证文件的 ${noText.length} 个：`, noText.join('、'));
