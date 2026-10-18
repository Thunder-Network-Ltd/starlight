// 每页一张分享图：/og/<页面路径>.png，首页是 /og/index.png。构建期静态生成。
import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import { renderCard, type Card } from '../../og/card';
import { cardFor } from '../../og/text.mjs';

export const getStaticPaths = (async () => {
	const entries = await getCollection('docs');
	return entries.map((entry) => {
		const card: Card = cardFor({ id: entry.id, title: entry.data.title, description: entry.data.description });
		return { params: { slug: card.slug }, props: { card } };
	});
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
	const png = await renderCard(props.card as Card);
	return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
