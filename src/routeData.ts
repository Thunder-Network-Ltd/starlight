// 给每页的 <head> 挂上自己的分享图（图由 src/pages/og/[...slug].png.ts 构建期生成）。
// Starlight 自己已经输出 og:title / og:description / og:url 与 twitter:card=summary_large_image，这里只补图。
import { createHash } from 'node:crypto';
import { defineRouteMiddleware } from '@astrojs/starlight/route-data';
import { OG_HEIGHT, OG_LAYOUT_VERSION, OG_WIDTH } from './og/card';
import { cardFor } from './og/text.mjs';

export const onRequest = defineRouteMiddleware((context) => {
	const route = context.locals.starlightRoute;
	const { id, data } = route.entry;
	// 404 页不在内容集合里，没有对应的图
	if (id === '404') return;

	const card = cardFor({ id, title: data.title, description: data.description });
	// Telegram、微信等按图片地址长期缓存；文字或版式一变，地址跟着变
	const version = createHash('sha256')
		.update(JSON.stringify([OG_LAYOUT_VERSION, card]))
		.digest('hex')
		.slice(0, 8);
	const image = new URL(`/og/${card.slug}.png?v=${version}`, context.site).href;

	route.head.push(
		{ tag: 'meta', attrs: { property: 'og:image', content: image } },
		{ tag: 'meta', attrs: { property: 'og:image:type', content: 'image/png' } },
		{ tag: 'meta', attrs: { property: 'og:image:width', content: String(OG_WIDTH) } },
		{ tag: 'meta', attrs: { property: 'og:image:height', content: String(OG_HEIGHT) } },
		{ tag: 'meta', attrs: { property: 'og:image:alt', content: data.title } },
	);
});
