---
title: 开源组件与许可
description: Lumen 网页播放器使用的开源组件、各自的许可证，以及我们修改过的部分的对应源码下载。
---

最后更新：2026 年 10 月 1 日

Lumen 的网页播放器使用了下列开源组件。感谢这些项目的作者。

## 一、组件清单

| 组件 | 版本 | 许可证 | 源码 |
|---|---|---|---|
| libmedia（`@libmedia/avplayer` 及随附的 avcodec / avformat / avutil / avrender 等模块） | 1.3.1 | LGPL-3.0-or-later | [github.com/zhaohappy/libmedia](https://github.com/zhaohappy/libmedia/tree/v1.3.1)（标签 `v1.3.1`） |
| libmedia 随附的 WebAssembly 解码器（基于 FFmpeg） | 1.3.1 | 随 libmedia 发布，LGPL | 同上，标签 `v1.3.1` |
| cheap（libmedia 的依赖） | 1.3.1 | MIT | [github.com/zhaohappy/cheap](https://github.com/zhaohappy/cheap) |
| common（libmedia 的依赖） | 2.3.0 | MIT | [github.com/zhaohappy/common](https://github.com/zhaohappy/common) |
| libpgs（图形字幕渲染） | 0.9.0 | MIT | [github.com/Arcus92/libpgs-js](https://github.com/Arcus92/libpgs-js) |
| ASS.js（ASS 字幕渲染，随 libmedia 打包） | 0.1.10 | MIT | [github.com/weizhenye/ASS](https://github.com/weizhenye/ASS) |
| ass-compiler（ASS 字幕解析，随 libmedia 打包） | 0.1.16 | MIT | [github.com/weizhenye/ass-compiler](https://github.com/weizhenye/ass-compiler) |

## 二、我们对 libmedia 的修改

我们修改了 `@libmedia/avplayer` 1.3.1 发布包中的五个文件：

- `dist/esm/avplayer.js`
- `dist/esm/26.avplayer.js`
- `dist/esm/384.avplayer.js`
- `dist/esm/573.avplayer.js`
- `dist/esm/630.avplayer.js`

这些修改用于修复 Safari 上的杜比音轨播放、iOS 上的进度与缓冲、图形字幕渲染、音轨选择、字幕安全、纯文本字幕的样式标签、iPhone 上文字字幕不显示，拖动进度或中途打开字幕后当前这句字幕不显示，以及起播时字幕没有直接选中要看的那条、取流中途停住不会自动续传、取流被拒时反复重试，开流前多发一次探文件大小的请求、片尾最后两秒暂停再播放会出错并跳回片头、续播后画面被拽回片头一次，取流中途连接断开时不会从断点接着取，以及续播到片尾附近时画面不出来、拖动后取流被拒却不报错等问题。WebAssembly 解码器没有修改，与上游 `v1.3.1` 发布的文件一致。

修改以补丁文件的形式提供：

- **[下载补丁：libmedia-avplayer-1.3.1-lumen.patch](/downloads/libmedia-avplayer-1.3.1-lumen.patch)**
- SHA-256：`c1cbdaab37c5d60a7cbc24c1041173d8224cb462d234004b8aa115c7d49d5633`

上游 `v1.3.1` 的源码与发布包加上这份补丁，就是我们网页播放器所用 libmedia 的完整对应源码。复现方法：

1. 取 npm 上的 `@libmedia/avplayer@1.3.1` 发布包并解压；
2. 在解压出的 `package` 目录里执行 `patch -p1 < libmedia-avplayer-1.3.1-lumen.patch`。

## 三、您的权利

1. libmedia 以 GNU 宽通用公共许可证第 3 版或更新版本（LGPL-3.0-or-later）发布。许可证全文见 [GNU LGPL v3](https://www.gnu.org/licenses/lgpl-3.0.html)，以及它所引用的 [GNU GPL v3](https://www.gnu.org/licenses/gpl-3.0.html)。
2. 网页播放器以独立文件加载 libmedia 与解码器（`/libmedia/` 下的脚本与解码器），没有与我们自己的代码合并在一起。您可以依照 LGPL 修改这些库，并用修改后的版本替换使用。
3. 如果下载链接失效，可以通过客服联系我们索取对应源码。
