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

// 页面上每行的一句话用途；新增直接依赖没写用途时脚本会报出来，补一行即可。
const ROLES = {
	react: '界面框架',
	'react-dom': '界面框架的网页渲染',
	next: '网页应用框架',
	'@heroui/react': '界面组件库',
	'@heroui/styles': '界面组件库的样式',
	'react-aria-components': '无障碍交互组件',
	'@fontsource-variable/inter': 'Inter 字体',
	'lucide-react': '图标',
	motion: '动画',
	'@number-flow/react': '数字滚动动画',
	'embla-carousel': '横滑轮播',
	'embla-carousel-react': '横滑轮播的 React 封装',
	'react-resizable-panels': '可拖动分栏',
	'react-easy-crop': '头像裁剪',
	recharts: '图表',
	'maplibre-gl': '地图渲染',
	swr: '数据请求与缓存',
	clsx: '样式类名拼接',
	'tailwind-merge': '样式类名合并',
	'tailwind-variants': '样式变体',
	'@tiptap/core': '富文本编辑器',
	'@tiptap/react': '富文本编辑器的 React 封装',
	'@tiptap/pm': '富文本编辑器底层（ProseMirror）',
	'@tiptap/starter-kit': '富文本编辑器常用功能',
	'@tiptap/extensions': '富文本编辑器扩展',
	'@tiptap/extension-link': '富文本编辑器的链接',
	'@tiptap/extension-underline': '富文本编辑器的下划线',
	'@tiptap/suggestion': '富文本编辑器的输入提示',
	marked: 'Markdown 解析',
	'react-markdown': 'Markdown 渲染',
	'remark-gfm': 'Markdown 表格与删除线等扩展',
	'remark-breaks': 'Markdown 换行',
	streamdown: '流式 Markdown 渲染',
	shiki: '代码高亮',
	'qr-code-styling': '二维码生成',
	'@simplewebauthn/browser': '通行密钥登录',
	tailwindcss: '样式框架',
	'tw-animate-css': '样式动画',
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

// 页面清单：直接依赖
const items = [];
const noRole = [];
for (const name of direct.sort()) {
	if (EXCLUDE_DIRECT.has(name)) continue;
	const dir = resolvePkg(name, webDir);
	const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
	if (!ROLES[name]) noRole.push(name);
	items.push({ name, role: ROLES[name] ?? '', version: pkg.version, license: licenseOf(pkg), href: repoUrl(pkg) ?? undefined });
}
if (noRole.length) console.warn('这些直接依赖还没写用途，去 ROLES 补：', noRole.join(', '));

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

console.log(`直接依赖 ${items.length} 个，全树 ${entries.length} 个`);
console.log('许可证分布：', byLicense);
if (noText.length) console.log(`没有随附许可证文件的 ${noText.length} 个：`, noText.join('、'));
