// 给分享图做 Noto Sans SC 子集：只收各页标题、描述、分组名里用到的字，外加空格与全部可见 ASCII。
// 完整字体每个字重 8 MB，不进仓库，也不在构建时去网上拉；新增页面或改标题后构建报「缺字」时跑一次：
//
//   pnpm og:font <源字体目录>
//
// 源字体目录里要有 NotoSansSC-Regular.otf 与 NotoSansSC-Medium.otf（notofonts/noto-cjk 的 Sans/SubsetOTF/SC，
// SIL OFL 1.1）。输出写到 src/og/fonts/，连同 chars.txt（子集收了哪些字，构建时据此查缺字）。
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cardFor, cardChars } from '../src/og/text.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = process.argv[2];
if (!srcDir) {
	console.error('用法：pnpm og:font <源字体目录>（目录里要有 NotoSansSC-Regular.otf 与 NotoSansSC-Medium.otf）');
	process.exit(1);
}

function walk(dir) {
	return readdirSync(dir).flatMap((name) => {
		const p = path.join(dir, name);
		return statSync(p).isDirectory() ? walk(p) : /\.mdx?$/.test(name) ? [p] : [];
	});
}

// 只认顶层的 title / description 两行；解析不对时构建会报缺字，不会悄悄出错图
function frontmatter(file) {
	const m = readFileSync(file, 'utf8').match(/^---\n([\s\S]*?)\n---/);
	const data = {};
	for (const line of (m?.[1] ?? '').split('\n')) {
		const kv = line.match(/^(title|description):\s*(.*)$/);
		if (!kv) continue;
		let v = kv[2].trim();
		if ((v.startsWith("'") && v.endsWith("'")) || (v.startsWith('"') && v.endsWith('"'))) v = v.slice(1, -1);
		data[kv[1]] = v;
	}
	return data;
}

const docsDir = path.join(root, 'src/content/docs');
const chars = new Set();
for (let c = 0x20; c <= 0x7e; c++) chars.add(String.fromCodePoint(c));
for (const file of walk(docsDir)) {
	const id = path
		.relative(docsDir, file)
		.replace(/\.mdx?$/, '')
		.replace(/(^|\/)index$/, '');
	const { title = '', description = '' } = frontmatter(file);
	for (const c of cardChars(cardFor({ id, title, description }))) chars.add(c);
}
const sorted = [...chars].sort((a, b) => a.codePointAt(0) - b.codePointAt(0));

const hb = (await WebAssembly.instantiate(readFileSync(path.join(root, 'node_modules/harfbuzzjs/dist/harfbuzz-subset.wasm'))))
	.instance.exports;

function subset(font) {
	const ptr = hb.malloc(font.byteLength);
	new Uint8Array(hb.memory.buffer).set(font, ptr);
	const blob = hb.hb_blob_create(ptr, font.byteLength, 2 /* HB_MEMORY_MODE_WRITABLE */, 0, 0);
	const face = hb.hb_face_create(blob, 0);
	hb.hb_blob_destroy(blob);
	const input = hb.hb_subset_input_create_or_fail();
	const unicodes = hb.hb_subset_input_unicode_set(input);
	for (const c of sorted) hb.hb_set_add(unicodes, c.codePointAt(0));
	const out = hb.hb_subset_or_fail(face, input);
	hb.hb_subset_input_destroy(input);
	if (!out) throw new Error('harfbuzz 子集失败');
	const outBlob = hb.hb_face_reference_blob(out);
	const offset = hb.hb_blob_get_data(outBlob, 0);
	const length = hb.hb_blob_get_length(outBlob);
	// 子集过程中 wasm 内存可能扩容，要在取结果时重新拿 buffer
	const bytes = new Uint8Array(hb.memory.buffer).slice(offset, offset + length);
	hb.hb_blob_destroy(outBlob);
	hb.hb_face_destroy(out);
	hb.hb_face_destroy(face);
	hb.free(ptr);
	return bytes;
}

const outDir = path.join(root, 'src/og/fonts');
for (const weight of ['Regular', 'Medium']) {
	const src = readFileSync(path.join(srcDir, `NotoSansSC-${weight}.otf`));
	const bytes = subset(src);
	writeFileSync(path.join(outDir, `NotoSansSC-${weight}.otf`), bytes);
	console.log(`NotoSansSC-${weight}.otf：${(src.byteLength / 1048576).toFixed(1)} MB → ${(bytes.byteLength / 1024).toFixed(0)} KB`);
}
writeFileSync(path.join(outDir, 'chars.txt'), sorted.join('') + '\n');
console.log(`收字 ${sorted.length} 个，写入 src/og/fonts/`);
