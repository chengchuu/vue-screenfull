# vue-screenfull

[![npm version][npm-version-image]][npm-url]
[![license][license-image]][license-url]

[npm-version-image]: https://img.shields.io/npm/v/vue-screenfull.svg
[npm-url]: https://www.npmjs.com/package/vue-screenfull
[license-image]: https://img.shields.io/npm/l/vue-screenfull.svg
[license-url]: https://github.com/chengchuu/vue-screenfull/blob/main/LICENSE

专为 Vue 3 设计的响应式、强类型且支持 SSR 的全屏工具。
还提供可选的 CSS 伪全屏回退方案。

- [项目网站](https://chengchuu.github.io/vue-screenfull/)
- [在线演练场](https://chengchuu.github.io/vue-screenfull/playground/)
- [API 文档](https://chengchuu.github.io/vue-screenfull/api/)

## 功能特性

- 响应式 Composition API 状态，支持自动清理作用域。
- 检测标准 API。
- 检测带 WebKit、Mozilla、Microsoft 前缀的 API。
- 支持 Vue 模板引用、组件引用、元素和安全的 CSS 选择器。
- 返回结构化结果和可操作的错误，不会静默忽略 Promise 拒绝。
- 提供无渲染组件、指令、可选插件和轻量级框架控制器。
- 不依赖全屏包装器或其他运行时依赖；Vue 仍是对等依赖。
- 提供 CJS、ESM、浏览器 IIFE、源映射和类型声明。

## 安装

```bash
npm install vue-screenfull
```

浏览器包为 `lib/vue-screenfull.min.js`。它会暴露 `VUE_SCREENFULL`，并要求通过全局变量 `Vue` 访问 Vue。

## 浏览器支持

本项目在运行时检测功能。当前桌面版 Chrome、Edge、Firefox 和 Safari 通常会提供该 API。Android 上的 Chrome、Firefox 和 Samsung Internet 通常也会提供。iPadOS 上的 Safari 通常也支持该 API。iPhone Safari 和 Android/iOS WebView 可能限制任意元素全屏。受管理设备和嵌入式文档也可能存在限制。此策略描述目标平台，不保证支持每个操作系统或浏览器版本。

原生全屏可以隐藏更多浏览器界面，但浏览器和操作系统仍保留控制权。CSS 回退方案只会填满可视视口，不会声称能够隐藏系统或浏览器界面。

## 基本用法

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useScreenfull } from "vue-screenfull";

const target = useTemplateRef<HTMLElement>("target");
const { isEnabled, isFullscreen, error, toggle } = useScreenfull();
</script>

<template>
  <section ref="target">
    <p>Fullscreen content</p>
    <button type="button" :disabled="!isEnabled" @click="toggle(target)">
      {{ isFullscreen ? "Exit fullscreen" : "Enter fullscreen" }}
    </button>
    <p v-if="error" role="alert">{{ error.message }}</p>
  </section>
</template>
```

请在点击、键盘或触摸事件处理程序中直接调用 `request` 或 `toggle`。浏览器通常要求短暂的用户激活状态。即使 `isEnabled.value` 为 `true`，浏览器也可能拒绝请求。

## 将指定元素设为全屏

```vue
<script setup lang="ts">
import { useTemplateRef } from "vue";
import { useScreenfullTarget } from "vue-screenfull";
const panel = useTemplateRef<HTMLElement>("panel");
const { request, isFullscreen } = useScreenfullTarget(panel);
</script>
<template>
  <section ref="panel">
    <button type="button" @click="request()">Open panel</button>
    <span>Active: {{ isFullscreen }}</span>
  </section>
</template>
```

调用 `useScreenfull().request()` 时可以不传目标。此时会打开 `document.documentElement`。可以将 `"#player"` 等选择器传给 `request`。`document.querySelector` 会解析这些选择器。无效或未匹配的选择器会返回 `INVALID_TARGET`。

## 切换全屏状态

```ts
const result = await toggle(target, { navigationUI: "hide" });
if (!result.ok) console.warn(result.error.code, result.error.suggestion);
```

对于图片内容，请传入图片的模板引用。对于视频，请传入 `HTMLVideoElement` 引用。部分移动浏览器提供仅限视频的全屏功能，与任意元素全屏相互独立。

## 退出全屏

```vue
<button type="button" @click="exit">Exit fullscreen</button>
```

请始终提供可见的退出按钮，启用回退方案时尤其如此。Escape 键通常可以退出，但无法可靠地覆盖浏览器的 Escape 键行为。通过浏览器界面发起的退出操作会由原生变更事件反映。

## 检查支持情况

```ts
const { isEnabled, status } = useScreenfull();
// isEnabled.value: native API currently enabled
// status.value: idle | requesting | fullscreen | exiting | fallback | unsupported | error
```

在 Safari、iOS/iPadOS 和 WebView 中，功能检测比用户代理检查更可靠。

## 处理错误

```ts
const result = await request(target);
if (!result.ok) {
  console.error(
    result.error.code,
    result.error.message,
    result.error.suggestion,
  );
}
```

错误类型可以区分不支持的环境或 SSR 环境，以及无效或已分离的目标。它还能区分用户激活状态、权限和 iframe 策略。其他类型包括待处理的转换、原生请求或退出失败，以及回退失败。调用 `clearError()` 前，`error` 会保留最近一次错误。

## CSS 回退方案

```ts
const { request, exit, isFallback } = useScreenfull({
  fallback: "css",
  fallbackClass: "my-pseudo-fullscreen",
  lockScroll: true,
  restoreFocus: true,
});
```

CSS 回退方案会将 `HTMLElement` 固定到可视视口。它会保留自身修改的所有内联样式。对于元素目标，它会锁定背景页面的滚动，并在退出后恢复。整个页面作为目标时仍可滚动。它还会保留滚动位置并添加配置的类。它会尽可能响应 Escape 键退出并恢复焦点。Vue 作用域销毁时也会执行清理。

这是伪全屏模式，无法隐藏地址栏、浏览器控件、通知或操作系统界面。请在目标元素中保留易于访问的退出按钮:

```vue
<button type="button" @click="exit">Close full-page view</button>
```

自定义回退方案需要实现 `enter(context)` 和 `exit(context)`。该方案负责完成所有清理工作。

## 组件用法

```vue
<Screenfull
  target="#article"
  fallback="css"
  v-slot="screenfull"
  @error="report"
>
  <button type="button" @click="screenfull.toggle()">
    {{ screenfull.isFullscreen ? "Exit" : "Open article" }}
  </button>
  <button v-if="screenfull.isFullscreen" type="button" @click="screenfull.exit">Exit</button>
</Screenfull>
```

无渲染组件会触发 `change`、`enter`、`exit`、`error` 和 `fallback` 事件。其默认插槽接收组合式函数的所有引用和操作。组件不会施加任何视觉样式。

## 指令用法

```vue
<button v-screenfull>Fullscreen page</button>
<button v-screenfull="target">Toggle target</button>
<button v-screenfull:request="target">Enter target</button>
<button v-screenfull:exit>Exit</button>
<button
  v-screenfull="{ target, action: 'toggle', options: { navigationUI: 'hide' } }"
>Toggle</button>
```

仅支持 `request`、`exit` 和 `toggle` 参数，默认为 `toggle`。除非已安装插件，否则需要在本地注册指令:

```ts
const vScreenfull = importedDirective;
```

## 安装插件

```ts
import { createApp } from "vue";
import VueScreenfull from "vue-screenfull";
import App from "./App.vue";

createApp(App).use(VueScreenfull).mount("#app");
```

这会注册 `Screenfull` 和 `v-screenfull`。可以通过 `componentName` 和 `directiveName` 更改名称。具名导入组合式函数时无需安装插件，且仍可进行摇树优化。

## 高级用法

轻量级框架控制器适用于迁移和非组件集成:

```ts
import { createScreenfullController } from "vue-screenfull";

const controller = createScreenfullController({ restoreFocus: true });
const onChange = (state) => console.log(state.isFullscreen, state.element);
controller.on("change", onChange);
await controller.request(document.querySelector("#map"));
controller.off("change", onChange);
await controller.destroy();
```

`raw` 是检测到的浏览器属性或事件名称的只读诊断映射，也可能为 `null`。不建议将其作为 API 使用。每个组合式函数都会创建一个控制器，并随 Vue 作用域销毁。多个控制器通过同一文档的原生事件保持同步。导入此软件包不会注册监听器或访问 DOM。

响应式回调可以观察变更，无需重复连接组件:

```ts
useScreenfull({ onEnter: announce, onExit: announce, onError: report });
```

`restoreFocus: true` (默认值) 会在退出后尽可能恢复焦点。焦点会移回触发操作的元素。`exitOnRouteChange` 会监听浏览器的 `popstate`。对于路由器特有的导航，可以改为在应用自身的路由钩子中调用 `exit()`。

## iframe 用法

嵌入页面负责控制权限。典型的 iframe 如下:

```html
<iframe
  src="https://example.com/player"
  allow="fullscreen"
  allowfullscreen
></iframe>
```

Permissions Policy 或缺少 iframe 权限仍可能导致拒绝。如果拒绝与嵌入式文档有关，库会返回 `IFRAME_PERMISSION_REQUIRED`。库无法覆盖父页面的策略。

## 移动端注意事项

- 使用直接的用户手势，并保留可见且便于触控的退出控件。
- 使用功能检测，不要根据设备名称推断支持情况。
- iPhone Safari 和 WKWebView 可能受限，也可能仅支持视频全屏。
- 动态浏览器界面会改变视口高度；CSS 回退方案会在支持时使用 `100dvh`。
- 原生导航、切换标签页、切换应用和操作系统手势可能退出全屏。
- 原生功能和本库都无法保证浏览器或操作系统控件消失。

## SSR 和 Nuxt

在 Vite SSR、Nuxt 3、Node 测试和静态生成中可以安全导入。在浏览器外，`isEnabled` 为 `false`，状态为 `unsupported`。此时操作会返回 `NOT_IN_BROWSER`。

```vue
<script setup lang="ts">
import { useScreenfull } from "vue-screenfull";
const screenfull = useScreenfull(); // safe during Nuxt setup/SSR
</script>
<template>
  <ClientOnly>
    <button
      type="button"
      :disabled="!screenfull.isEnabled.value"
      @click="screenfull.toggle()"
    >
      Toggle page fullscreen
    </button>
  </ClientOnly>
</template>
```

在 `<script setup>` 中解构引用时，模板会自动解包。像上面的示例一样通过对象访问时，请在脚本表达式中使用 `.value`。

## 从 screenfull 迁移

`vue-screenfull` 是独立的 Vue 3 库。其设计灵感来自 screenfull 的公共 API 和兼容性目标。它不能作为直接替代品，也未获得 screenfull 维护者的认可。

| screenfull 概念                        | vue-screenfull 对应项            |
| -------------------------------------- | -------------------------------- |
| `screenfull.request(element, options)` | `request(element, options)`      |
| `screenfull.exit()`                    | `exit()`                         |
| `screenfull.toggle(element, options)`  | `toggle(element, options)`       |
| `screenfull.isEnabled`                 | 响应式 `isEnabled.value`         |
| `screenfull.isFullscreen`              | 响应式 `isFullscreen.value`      |
| `screenfull.element`                   | 响应式 `fullscreenElement.value` |
| `screenfull.on("change", fn)`          | 引用、回调、组件事件或控制器事件 |
| `screenfull.on("error", fn)`           | 响应式 `error`、回调或控制器事件 |

迁移前:

```ts
import screenfull from "screenfull";
if (screenfull.isEnabled) await screenfull.toggle(element);
```

迁移后:

```ts
import { useScreenfull } from "vue-screenfull";
const { isEnabled, toggle } = useScreenfull();
if (isEnabled.value) {
  const result = await toggle(element);
  if (!result.ok) console.error(result.error.message);
}
```

主要区别包括响应式引用、自动清理生命周期和支持 SSR 的安全导入。还包括结构化结果和错误、可选伪全屏，以及 Vue 组件和指令 API。控制器监听器接收带类型的状态或错误，而非原始 DOM 事件。项目未提供旧版 `onchange` 或 `onerror` 别名。插件为可选功能。

## API 参考

根导出如下:

- `useScreenfull(options?)`、`useScreenfullTarget(target, options?)`
- `Screenfull`、`vScreenfull` 和默认插件
- `createScreenfullController(options?)`
- `detectFullscreenApi(document)` 和 `resolveScreenfullTarget(target, document)`
- 所有公开的目标、选项、状态、结果、错误、事件、组件、指令、插件和原始映射类型

操作会解析为 `{ ok, mode, element, error }`。`mode` 为 `native`、`fallback` 或 `none`。生成的 TypeDoc 发布于 [API 文档网站](https://chengchuu.github.io/vue-screenfull/api/)。

## 在线演练场

已部署的版本位于 [vue-screenfull 在线演练场](https://chengchuu.github.io/vue-screenfull/playground/)。其中包含页面、元素、图片样式和视频目标。它还提供显式退出、诊断、无效目标反馈和事件历史记录。其他内容包括无障碍、iframe、移动端和迁移说明。使用以下命令在本地运行:

```bash
npm run dev
```

浏览器会强制要求用户激活，因此本项目不会将原生全屏自动化视为在所有环境中均可靠。

## 可安装的文档网站

项目网站是渐进式 Web 应用 (Progressive Web App，PWA)。其作用域为 `/vue-screenfull/`。首页、演练场和 API 文档共享生成的清单和 Google Workbox v7 Service Worker。文档、脚本和样式使用容量受限的网络优先缓存。它通常会优先使用最新文档，避免新 HTML 与旧软件包搭配使用。本地图片和字体使用容量受限的缓存优先存储。只有当网络和运行时缓存均无法提供请求的文档时，才会使用预缓存的离线页面。

如果浏览器支持，安装功能会使用原生 `beforeinstallprompt` 流程。网站不会自动打开该提示。不支持自定义提示的浏览器可以使用菜单；在 iOS/iPadOS Safari 上，可以使用 **共享 → 添加到主屏幕**。安装此网站与 Fullscreen API 相互独立，不会授予全屏功能。

Worker 更新仍由用户控制。有新版本等待更新时，选择 **立即更新** 即可激活版本，并重新加载当前页面一次。在演练场中，此显式操作是唯一会重新加载活动会话的更新方式。生成的 Worker 包含最终产物版本标记。它无需预缓存未进行版本控制的软件包，也能检测到可部署的网站变更。

## 开发

CI 使用 Node.js 22。

```bash
npm install
npm run typecheck
npm run lint
npm run format:check
npm run test
npm run build
npm run docs
npm run seo:validate
npm run pwa:validate
npm run preview
npm pack --dry-run
```

常规的 `npm run dev` 不会注册生产环境 Worker。若要在类似生产环境中测试 PWA，请运行 `npm run docs`。然后在 localhost 的 `/vue-screenfull/` 路径下提供生成的 `docs` 目录。

有关浏览器矩阵和真实浏览器测试策略，请参阅 [`guides/MANUAL_TESTING.md`](./guides/MANUAL_TESTING.md)。生产输出仍包含以下文件:

- `lib/index.cjs.js`
- `lib/index.esm.js`
- `lib/vue-screenfull.min.js`
- `lib/index.d.ts`
- `lib/typing.d.ts`
- `lib/global.d.ts`

原生 Node ESM 通过额外的条件入口 `lib/index.mjs` 解析。

## 许可证与致谢

本项目根据 MIT License 发布。[screenfull](https://github.com/sindresorhus/screenfull) (MIT) 的公共 API 和跨浏览器兼容性为本项目提供了灵感。`vue-fullscreen` (MIT) 是 Vue 生态系统参考。以上内容不表示相关项目对本项目的认可。
