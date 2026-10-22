# MrUserPage

Windows 8 风格的静态个人主页。部署于 GitHub UserPage，全部个性化数据保存在浏览器本地，无后端。

## 设计模型

### 屏与格

- 每一「屏」的宽度以「格」计量，最小 4 格、最大 8 格（设置中可调，默认 6）
- 格为 1:1 正方形，格尺寸由密度档（宽松 / 适中 / 紧凑）决定；当可放格数不足 4 时自动缩小格尺寸，硬凑 4 格
- 可放格数按视口宽度计算（含格间距），据此推导横向可放几屏；放不下下一屏的空间留空，不横向滚动
- 宽屏多屏并列；宽度减少时后续屏按顺序落到下方，屏间距大于格间距；纵向空间不限，上下滚动

### 磁块

- 最小 1x1，最大 4x4。合法尺寸共 12 档：1x1、1x2、2x1、2x2、2x3、3x2、2x4、4x2、3x3、3x4、4x3、4x4
- 应用图标默认 1x1；编辑态下拖拽磁块右下角手柄可调整尺寸（实时预览、松手吸附到合法尺寸）
- 双维均不小于 2 格时，磁块左下角展示名称；小组件的动态内容同样要求双维 ≥ 2 格
- 磁块为直角矩形，背景取应用自定义色或主题色板（按 id 稳定取色）
- 内容优先级：`live` 动态内容 > `fullIcon` 全覆盖图 > `icon` 图标；后两者与 live 互斥
- 布局自由排列但不跨屏：任一磁块必须完整落在一屏的横向范围内；屏内采用 dense 流自动排布，空行自然消除

### 交互

- 长按桌面空白处进入编辑模式：磁块可拖拽（屏内调序、跨屏移动）、右下角手柄调尺寸、左上角徽标取消固定 / 移除小组件
- 无 Dock，所有内容都是磁块
- 应用库磁块（默认 1x1，唯一不可删除）点击打开全屏应用库：顶部「应用 / 小组件」Tab；应用按名称首字母分组（拉丁字母 A-Z，其余归 #），点击分组标题弹出 26 字母宫格跳转；列表行为 1 格方形图标 + 名称，点击打开，未固定的应用可「固定到屏幕」
- 小组件 Tab 展示内置小组件与 `Widgets.json` 网页小组件，可选尺寸后添加

## 预设文件

- `public/Apps.json`：预设应用。字段：`name`、`url`、`icon` 必填；`fullIcon`（全覆盖图）、`color`（磁块色）、`description`、`category` 可选
- `public/Widgets.json`：预设网页小组件。字段：`name`、`url` 必填；`icon`、`description` 可选

## 内置小组件

| 类型 | 说明 | 最小尺寸 |
| --- | --- | --- |
| clock | 数字时钟与中文日期 | 2x2 |
| search | 多引擎搜索框（Bing / 百度 / Google / DuckDuckGo），可选默认引擎 | 2x2 |
| calendar | 当月月历，高亮今日 | 2x2 |
| iframe | 以沙箱 iframe 加载网页，附「新窗口打开」出口 | 2x2 |

新增小组件：在 `src/features/widgets/` 增加组件，并在 `registry.ts` 登记类型、最小尺寸与默认尺寸。

## 壁纸

设置中提供四个来源：内置渐变（5 套，带明暗标记）、在线图片 URL、本地上传（压缩至最长边 1920 像素后存入本地）、动态光晕（用户自选 3 色与流速，流动动画）。文字与玻璃配色自动跟随壁纸明暗，也可在设置中强制亮色 / 暗色。

## 数据

- 配置存储于 localStorage（键 `mruserspage:config`），含版本号；设置中可导出 JSON、导入校验、两步确认恢复默认
- 导入会校验配置版本与必要字段，不兼容时给出明确错误

## 开发

```bash
npm install
npm run dev      # 开发预览
npm run build    # 类型检查 + 构建（产物在 dist/）
npm run preview  # 预览构建产物
```

## 部署

push 到 `main` 即由 GitHub Actions 自动构建并发布到 GitHub Pages。要求：

1. 远端仓库名为 `<用户名>.github.io`（UserPage）
2. 仓库 Settings → Pages → Source 选择 GitHub Actions
3. 域名 DNS 添加 CNAME：`m` → `<用户名>.github.io`（自定义域名已配置为 m.looly.top）

## 目录结构

```
src/
├── core/          # 框架无关内核：类型、模型、持久化、预设、布局计算、搜索引擎、取色
├── composables/   # useTheme（主题初始化）、useLayoutMetrics（格尺寸测量）等组合式函数
├── stores/        # Pinia 配置 store（唯一数据源）
├── features/
│   ├── desktop/   # DesktopView、ScreenGrid、Tile、编辑态、拖拽同步、添加面板
│   ├── library/   # AppLibrary（Win8 双 Tab + 字母宫格）、LetterJump
│   ├── widgets/   # 小组件注册表与四个内置小组件
│   ├── wallpaper/ # 壁纸层与动态光晕
│   └── settings/  # 设置面板（壁纸 / 布局 / 主题 / 数据）
public/
├── Apps.json / Widgets.json / CNAME
```
