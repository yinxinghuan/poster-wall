# Technical

## 1. 技术栈

- React 18 + TypeScript + Vite，构建 `base: './'`，样式使用 Less。
- 渲染方式是 DOM/CSS：简约平面海报展台、叠放/排列切换动画、生成等待页、完整海报详情页和评审页都由 HTML/CSS 组成。
- 平台能力使用 `@shared/runtime`：`callAigramAPI`、`openAigramProfile`、`useGenImage`、`useGameEvent`；存档使用 `@shared/save/useGameSave`。
- 运行时图像生成使用平台 `useGenImage.generate()`：有头像时传 `ref_url` 做头像参考，无头像时只传文本 prompt 生成基础演出海报。

## 2. 目录结构

- `src/App.tsx`：非 Aigram 环境默认显示评审页；`?play=1` 或 Aigram iframe 显示真实游戏。
- `src/PosterWall/PosterWall.tsx`：真实游戏 UI，包含简约纯色展台、叠放/排列视图状态、同一批海报的布局切换、12 小时冷却状态、全屏印刷等待页、单张完整海报详情页、点赞、留言和作者 profile 入口。
- `src/PosterWall/PosterWall.less`：真实游戏的纯色背景、海报叠放布局、整齐排列布局、650ms 布局切换动画、简洁生成入口、印刷等待页、详情页和社交区样式。
- `src/PosterWall/hooks/usePosterWall.ts`：用户资料、图像生成、本地 mirror 存档、12 小时生成冷却、公共墙拉取、点赞/留言聚合、留言通知、optimistic merge。
- `src/PosterWall/types.ts`：`PosterEntry`、`PosterSave`、`WallEntry`、舞台尺寸和评审海报资产路径。
- `src/PosterWall/ReviewPage.tsx` / `ReviewPage.less`：评审页，展示最终首屏、详情页、生成目标样张和关键状态。
- `src/PosterWall/i18n/index.ts`：zh/en 轻量文案。
- `src/PosterWall/utils/sounds.ts`：Web Audio 合成点击、生成、成功、失败、打开详情音效。
- `src/shared/social/guestbook.ts`：共享留言模型和工具，提供 `GuestMessage`、`appendMessage()`、`messagesByTarget()`、`threadFor()`、`guestbookNotifyConfig()`、`timeAgo()`。
- `public/img/review-posters/poster-00.svg` 到 `poster-11.svg`：离线评审和 demo 使用的满版矩形海报样张。
- `public/poster.png` / `public/poster.svg`：当前占位封面；正式封面按最终 UI 风格确认后再生成替换。

## 3. 核心模块

- 状态管理：`usePosterWall()` 用 `useGameSave<PosterSave>('poster-wall')` 加本地 `mirror`，只在 `savedData` 首次加载后 seed 一次，后续所有写入都从 mirror 读改写，避免多次生成覆盖旧作品。`PosterSave` 包含 `posters`、`totalGenerated`、`messages`、`likes`、`lastGeneratedAt`。
- 生成逻辑：`generatePoster()` 先检查 `canCraft`，冷却由 `(lastGeneratedAt + 12h - Date.now())` 计算，不依赖平台日统计。有头像时把 `profile.head_url` 作为 `ref_url` 传给 `useGenImage.generate()`；无头像时只传基础演出海报 prompt。头像 prompt 明确头像只作为二创参考，只提取脸型轮廓、发型方向、表情气质、色彩温度、配饰暗示和 attitude，再转译为俱乐部夜场海报、乐队巡演海报、音乐节小舞台海报、实验现场 flyer 或地下场馆 bill，禁止直接贴头像、复刻照片构图、照片感头像或儿童漫画化。
- 用户名图形化：`nameGraphicLine(profile.name)` 会把用户名作为可选图案素材注入 prompt，允许转成艺名碎片、缩写、裁切字母、竖排/横排字形、贴纸碎片、票根编号、场馆代码或半可读演出标题，要求偏中间且不作为普通署名。
- 图像边界：生成 prompt 要求输出满版竖向矩形演出海报，主体居中，不能包含 app UI、手机 mockup、墙面背景、外框、胶带、留白、滑板、轮子、通缉单套话、抗议标语牌或外部品牌 Logo；纸张边缘、胶带和墙面阴影由 CSS 负责。
- 图片预载：`generatePoster()` 在 `useGenImage.generate()` 返回 URL 后进入 `saving` 阶段，调用 `preloadImage()` 用 `new Image()` 加载并在支持时调用 `image.decode()`；最长等待 16 秒。只有预载结束后才写入 mirror、`persist()` 并打开详情页，降低首次详情看到空白图片的概率。
- 公共墙：`refreshWall()` 调 `/note/aigram/ai/game/get/data/list`，flatten 每个用户存档里的全部 `posters`，按 `createdAt` 倒序截取 24 个，不只取最新一张。同一次 rows 会传给 `messagesByTarget()` 和 `likesByTarget()`，按作品 id 聚合互动，再解析相关用户 profile，为作者、留言者和点赞者补 `name/head_url`。
- optimistic merge：真实墙面渲染前把 `mine` 中云端还没同步的作品合并到 `wall` 前面，用 `entry.id` 去重，解决保存同步造成的短暂空窗。
- 界面风格：`PosterWall.less` 使用深黑 `#050505`、主文字 `#f4f0e8`、弱信息 `rgba(244,240,232,0.56)` 和细线 `rgba(244,240,232,0.16)`。顶部 `.pw-header__copy` 只显示小标签、标题和数量；右侧 `.pw-view-toggle` 是 124px × 36px 的简洁 segmented control；底部 `.pw-generator` 是 1px 顶部分隔线上的操作区，`.pw-cta` 是无圆角高对比按钮。
- 作品墙布局：`PosterWall.tsx` 用 `useState<'stack' | 'grid'>` 管理视图，首屏渲染 `game.wall.slice(0, 10)`。每张 `.pw-card--slot-*` 是同一个 DOM 元素，`.pw-wall--stack` 下用不同尺寸、位置、旋转和 z-index 形成凌乱叠放，`.pw-wall--grid` 下移动到 2 列整齐排列；`left/top/width/height/transform/filter` 以 680ms `cubic-bezier(0.2,0.9,0.18,1)` 过渡。
- 详情页：选中作品后渲染覆盖舞台的 `.pw-detail` 全屏状态，顶部 `返回` 按钮关闭详情，点击海报本身也关闭。主体展示 246px × 369px 完整海报，不显示“正面/反面”说明；详情背景继续使用深黑，底部 `.pw-detail__social` 是细线分隔的信息区，包含作者头像 + 名字、点赞/留言计数、点赞按钮、最近 3 条留言和 140 字输入框；长用户名使用 `min-width:0`、`text-overflow: ellipsis`、`white-space: nowrap` 防止撑破页面。
- 社交互动：`toggleLike(entry)` 把 `PosterLike` 存在当前玩家自己的 `PosterSave.likes`，同一玩家对同一作品只保留 1 个赞，再次点击取消；聚合时用 `fromUserId` 去重。`sendComment(entry,text)` 用 `newMessage()` 生成 `GuestMessage`，通过 `appendMessage()` 写入当前玩家自己的 `PosterSave.messages`，留言上限 140 字，本地立即回显；给非本人作品留言时触发 `poster_wall_note` 通知作者，`refUrl` 会把相对图片转成绝对 URL。
- 跨用户身份：公共墙会拉取作者的 `name/head_url`；详情作者 chip 和留言作者 chip 显示头像 + 名字。非本人作者在 Aigram 内点击时调用 `openAigramProfile(userId)`，滚动墙内作品打开详情使用 `onClick`。
- 响应式：真实游戏固定 `FIELD_W=390`、`FIELD_H=680`，根据 `visualViewport` 与 `#root` 实际尺寸计算 scale；`.pw-shell` 顶部对齐、`.pw-stage` 使用 `transform-origin: top center`，避免 mini App 外层导航栏压缩可用高度后游戏仍垂直居中造成顶部空隙。

## 4. 扩展点

- 改生成风格：编辑 `src/PosterWall/hooks/usePosterWall.ts` 的 `avatarPromptFor()`、`basicPromptFor()` 和 `nameGraphicLine()`。
- 改制作频率：编辑 `CRAFT_COOLDOWN_MS`；当前为 12 小时。
- 改墙面布局：编辑 `src/PosterWall/PosterWall.less` 的 `.pw-wall`、`.pw-card`、`.pw-card__paper`，以及 `src/PosterWall/PosterWall.tsx` 的 `posterStyle()` 行列错位和旋转参数。
- 改详情页：编辑 `src/PosterWall/PosterWall.tsx` 的 `.pw-detail` 结构，以及 `PosterWall.less` 的 `.pw-detail*`、`.pw-author-card*`、`.pw-comment*` 样式。
- 改社交规则：编辑 `usePosterWall.ts` 的 `likesByTarget()`、`uniqueLikesFor()`、`toggleLike()`、`sendComment()`，以及 `src/shared/social/guestbook.ts` 的留言上限和通知配置。
- 改生产等待页：编辑 `PosterWall.tsx` 的 `productionStepKeys`、`productionProgress()`、`productionNoteKey()` 和 `.pw-production` 结构；文案在 `i18n/index.ts`。
- 改保存上限：编辑 `MAX_MINE` 和 `MAX_WALL`。
- 换评审样张：替换 `public/img/review-posters/poster-00.svg` 到 `poster-11.svg`；样张必须保持满版矩形，不要自带墙面、手机、边框或胶带。
- 改封面：最终 UI 定稿后替换 `public/poster.png`，并同步到 `games/posters/poster-wall.png`。
