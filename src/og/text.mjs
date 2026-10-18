// 分享图上的文字从哪来。构建（src/pages/og/）与字体子集脚本（scripts/og-font.mjs）共用这一份，
// 两边算出来的字必须一致：子集只收这里会用到的字，构建时缺字直接报错（见 card.ts 的 assertCovered）。
import { sidebar } from '../sidebar.mjs';

// 图上可能出现、却不在页面文字里的字：截断时的省略号
export const FIXED_TEXT = '…';

// 侧栏里的页面 → 所在分组名，当蓝色眉题
const groupBySlug = new Map();
for (const group of sidebar) {
	for (const item of group.items ?? []) {
		if (item.slug !== undefined) groupBySlug.set(item.slug, group.label);
	}
}

// 思源黑体里 U+00B7「·」是全角（advance 1000），「iPhone · iPad · Mac」在图上每个间隔近两个字宽；
// 换成半角中点 U+FF65（advance 500），网页上的标题不受影响
function halfwidthDot(text) {
	return text.replaceAll('·', '･');
}

/** 文档条目 id（首页是空串或 index）→ 分享图地址里的路径段 */
export function ogSlug(id) {
	return id === '' || id === 'index' ? 'index' : id;
}

/**
 * 一页分享图的三段文字。首页不在侧栏里，没有眉题；
 * 描述以标题开头（首页「Lumen 帮助中心：……」）时去掉这段，免得图上同一句写两遍。
 */
export function cardFor({ id, title: rawTitle, description = '' }) {
	const slug = ogSlug(id);
	const title = halfwidthDot(rawTitle);
	let desc = halfwidthDot(description.trim());
	for (const sep of ['：', ':']) {
		if (desc.startsWith(title + sep)) desc = desc.slice(title.length + sep.length).trim();
	}
	return {
		slug,
		eyebrow: groupBySlug.get(slug === 'index' ? '' : slug) ?? '',
		title,
		description: desc,
	};
}

/** 一张图用到的全部字符（不含空白） */
export function cardChars(card) {
	return [...(card.eyebrow + card.title + card.description + FIXED_TEXT)].filter((c) => !/\s/.test(c));
}
