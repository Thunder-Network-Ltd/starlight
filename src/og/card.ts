// 文档站每页的分享图（1200×630），构建期用 satori 排版成 SVG、sharp 转 PNG，不加运行时服务。
// 版式跟面板首页 / 邀请链接的分享图同一套：黑底、白字，标题字重 500，说明白色 60%，
// 眉题用强调色 #0485f7；logo 就是文档站顶栏那份 lumen-white.svg（与面板 public/lumen-logo-dark.svg 逐字相同）。
// 背景是右上角放大的星球标水印加一团淡蓝光（2026-10-19 用户在纯黑 / 光晕 / 星球 / 控制台截图四版里选定）；
// 右上角原本的 docs.lumen.ax 用户觉得不合时宜，去掉了。
import { readFileSync } from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { cardChars } from './text.mjs';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;
// 改版式（下面的 layout）时加一，各页 og:image 地址里的 ?v= 跟着变，社交平台才会重新抓图
export const OG_LAYOUT_VERSION = 1;
const ACCENT = '#0485f7';
const PAD_X = 80;

// 构建时 cwd 是项目根目录；字体是 scripts/og-font.mjs 做的子集
const fontDir = path.join(process.cwd(), 'src/og/fonts');
const fonts = [
	{ name: 'Noto Sans SC', data: readFileSync(path.join(fontDir, 'NotoSansSC-Regular.otf')), weight: 400 as const, style: 'normal' as const },
	{ name: 'Noto Sans SC', data: readFileSync(path.join(fontDir, 'NotoSansSC-Medium.otf')), weight: 500 as const, style: 'normal' as const },
];
const covered = new Set(readFileSync(path.join(fontDir, 'chars.txt'), 'utf8').replace(/\n$/, ''));

export interface Card {
	slug: string;
	eyebrow: string;
	title: string;
	description: string;
}

/** 子集里没有的字 satori 会画成空白，宁可构建失败也不出缺字的图 */
export function assertCovered(card: Card) {
	const missing = [...new Set(cardChars(card).filter((c: string) => !covered.has(c)))];
	if (missing.length) {
		throw new Error(
			`分享图字体子集缺字（${card.slug}）：${missing.join('')}——跑 pnpm og:font <源字体目录> 重做子集后再构建`,
		);
	}
}

// logo 的路径直接从 lumen-white.svg 里取，不另存一份
const logoSvg = readFileSync(path.join(process.cwd(), 'src/assets/lumen-white.svg'), 'utf8');
const LOGO_VIEWBOX = logoSvg.match(/viewBox="([^"]+)"/)![1];
const [, , LOGO_W, LOGO_H] = LOGO_VIEWBOX.split(/\s+/).map(Number);
const LOGO_OUTER = logoSvg.match(/<svg[^>]*>\s*<g transform="([^"]+)">/)![1];
const LOGO_PARTS = [...logoSvg.matchAll(/<g transform="([^"]+)">\s*<path d="([^"]+)"/g)].map((m) => ({
	transform: m[1],
	d: m[2],
}));

type Node = { type: string; props: Record<string, unknown> };
const h = (type: string, props: Record<string, unknown>, ...children: unknown[]): Node => ({
	type,
	props: { ...props, children: children.length === 1 ? children[0] : children },
});

function logo(height: number) {
	const width = Math.round((LOGO_W / LOGO_H) * height);
	return h(
		'svg',
		{ width, height, viewBox: LOGO_VIEWBOX, fill: '#fff' },
		h('g', { transform: LOGO_OUTER }, ...LOGO_PARTS.map((p) => h('path', { d: p.d, transform: p.transform }))),
	);
}

// 粗估一行宽度（全角 1、半角 0.55 个字号），决定标题用大字还是小一号
function emWidth(text: string) {
	return [...text].reduce((w, c) => w + (c.codePointAt(0)! > 0x2e80 ? 1 : 0.55), 0);
}

// 最多两行。估计放得下两行时只用 balance 让两行等长（不让第二行只剩「容。」一两个字）；
// 放不下才截断加省略号——satori 0.35 里 balance 与 lineClamp 同用会把放得下的两行也截掉；
// 它的省略号是排完行再追加的，会伸出右边距，所以截断时少排一个字宽
function twoLines(text: string, fontSize: number, width: number) {
	return emWidth(text) * fontSize <= width * 2 * 0.92
		? { textWrap: 'balance' }
		: { lineClamp: 2, width: width - fontSize };
}

const abs = (style: Record<string, unknown>) => ({ position: 'absolute', display: 'flex', ...style });
const fullBleed = { left: 0, top: 0, width: OG_WIDTH, height: OG_HEIGHT };

// 星球标（logo 左边那颗带环的星球，在 logo 坐标里占 0–1246 × 0–670）单独画大，当水印
function planet(height: number, opacity: number) {
	const width = Math.round((1246 / 670) * height);
	return h(
		'svg',
		{ width, height, viewBox: '0 0 1246 670', fill: `rgba(255,255,255,${opacity})` },
		h('g', { transform: LOGO_OUTER }, h('path', { d: LOGO_PARTS[0].d, transform: LOGO_PARTS[0].transform })),
	);
}

function layout(card: Card) {
	const textWidth = OG_WIDTH - PAD_X * 2;
	const titleSize = emWidth(card.title) * 72 <= textWidth ? 72 : 60;
	return h(
		'div',
		{
			style: {
				width: OG_WIDTH,
				height: OG_HEIGHT,
				display: 'flex',
				position: 'relative',
				background: '#000',
				color: '#fff',
				fontFamily: '"Noto Sans SC"',
			},
		},
		h('div', {
			style: abs({
				...fullBleed,
				backgroundImage:
					'radial-gradient(ellipse 520px 420px at 1040px 200px, rgba(4,133,247,0.28), rgba(4,133,247,0.06) 60%, rgba(0,0,0,0) 100%)',
			}),
		}),
		// 星球的环尾落在标题右上方，不压字（长标题 iPhone · iPad · Mac · Apple TV 实看过）
		h('div', { style: abs({ left: 720, top: -30 }) }, planet(500, 0.09)),
		h(
			'div',
			{ style: abs({ ...fullBleed, flexDirection: 'column', padding: `76px ${PAD_X}px 84px` }) },
			logo(40),
			h('div', { style: { display: 'flex', flexGrow: 1 } }),
			card.eyebrow
				? h(
						'div',
						{ style: { display: 'flex', fontSize: 28, fontWeight: 500, color: ACCENT, marginBottom: 20 } },
						card.eyebrow,
					)
				: null,
			h(
				'div',
				{
					style: {
						display: 'block',
						width: textWidth,
						fontSize: titleSize,
						fontWeight: 500,
						lineHeight: 1.2,
						...twoLines(card.title, titleSize, textWidth),
					},
				},
				card.title,
			),
			card.description
				? h(
						'div',
						{
							style: {
								display: 'block',
								width: textWidth,
								marginTop: 28,
								fontSize: 28,
								lineHeight: 1.5,
								color: 'rgba(255,255,255,0.6)',
								...twoLines(card.description, 28, textWidth),
							},
						},
						card.description,
					)
				: null,
		),
	);
}

export async function renderCard(card: Card): Promise<Buffer> {
	assertCovered(card);
	// satori 的类型要 ReactNode，这里给的是同构的普通对象
	const svg = await satori(layout(card) as never, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
	return sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
}
