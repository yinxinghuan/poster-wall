# Technical

## 1. 技术栈

- React 18 + TypeScript + Vite，构建 `base: './'`，样式使用 Less。
- 渲染方式是 DOM/CSS：英文单语 Helvetica 地铁导视风海报展台、Stack / Grid 切换动画、生成等待页、完整海报详情页和评审页都由 HTML/CSS 组成。
- 平台能力使用 `@shared/runtime`：`callAigramAPI`、`openAigramProfile`、`useGenImage`、`useGameEvent`；存档使用 `@shared/save/useGameSave`。
- 运行时图像生成使用平台 `useGenImage.generate()`：有头像时传 `ref_url` 做头像参考；无头像时传 `public/img/style-ref/flat-poster-ref.png` 的公网绝对 URL 做格式参考，避免纯文本生成滑向墙面/相框/手机 mockup。

## 2. 目录结构

- `src/App.tsx`：非 Aigram 环境默认显示评审页；`?play=1` 或 Aigram iframe 显示真实游戏。
- `src/PosterWall/PosterWall.tsx`：真实游戏 UI，包含英文单语文案、Helvetica 导视标题、Stack / Grid 视图状态、同一批海报的布局切换、无打底海报的空墙状态、12 小时冷却状态、全屏生成等待页、单张完整海报详情页、点赞、留言和作者 profile 入口。
- `src/PosterWall/PosterWall.less`：真实游戏的深黑背景、地铁路线圆点、Helvetica 导视排版、海报叠放布局、整齐排列布局、680ms 布局切换动画、生成入口、空墙、等待页、详情页和社交区样式。
- `src/PosterWall/hooks/usePosterWall.ts`：用户资料、图像生成、本地 mirror 存档、12 小时生成冷却、公共墙拉取、点赞/留言聚合、留言通知、optimistic merge。
- `src/PosterWall/types.ts`：`PosterEntry`、`PosterSave`、`WallEntry`、舞台尺寸和评审页生成样张路径。
- `src/PosterWall/ReviewPage.tsx` / `ReviewPage.less`：评审页，展示最终首屏、详情页、生成目标样张和关键状态。
- `src/PosterWall/i18n/index.ts`：英文单语文案表，保留 `t()` 占位符替换但不再根据浏览器语言切换。
- `src/PosterWall/utils/sounds.ts`：Web Audio 合成点击、生成、成功、失败、打开详情音效。
- `src/shared/social/guestbook.ts`：共享留言模型和工具，提供 `GuestMessage`、`appendMessage()`、`messagesByTarget()`、`threadFor()`、`guestbookNotifyConfig()`、`timeAgo()`。
- `public/img/style-ref/flat-poster-ref.svg` / `.png`：无头像路径的纯平面 2:3 排版格式参考图，包含通用演出文字层级，只给生图接口作为 `ref_url` 使用，不显示在正式墙面。
- `public/img/review-generated/*.jpg`：评审页生成方向样张；正式墙面不使用这些图片打底。
- `public/poster.png` / `public/poster.svg`：当前占位封面；正式封面按最终 UI 风格确认后再生成替换。

## 3. 核心模块

- 状态管理：`usePosterWall()` 用 `useGameSave<PosterSave>('poster-wall')` 加本地 `mirror`，只在 `savedData` 首次加载后 seed 一次，后续所有写入都从 mirror 读改写，避免多次生成覆盖旧作品。`PosterSave` 包含 `posters`、`totalGenerated`、`messages`、`likes`、`lastGeneratedAt`。
- 生成逻辑：`generatePoster()` 先检查 `canCraft`，冷却由 `(lastGeneratedAt + 12h - Date.now())` 计算，不依赖平台日统计。有头像时把 `profile.head_url` 作为 `ref_url` 传给 `useGenImage.generate()`；无头像时把 `formatReferenceUrl()` 生成的公网绝对 URL 作为 `ref_url`，并把用户名作为主视觉身份来源。参考图用于约束平面海报和文字层级，不要求复制参考图具体文字。若当前页面是 localhost / 127.0.0.1，本地参考图不会传给后端，避免后端拉取本地地址失败。
- 模板池：`PROMPT_TEMPLATES` 定义 9 个海报模板，覆盖 `hex-zine-portrait`、`upstairs-handbill`、`tokyo-pulp-flyer`、`subway-showbill`、`swiss-type-system`、`color-block-program`、`fashion-week-roster`、`museum-comedy-label`、`xerox-photo-silhouette`。`buildPosterPrompt(mode,userName,seed)` 会按 `avatar/username` 模式筛选模板，使用 `seedScore()` 和 `pickForSeed()` 根据 `draftId + createdAt` 稳定抽取模板、色彩和字体策略，返回 `prompt`、`posterTone` 和 `templateId`，并写入 `PosterEntry.posterTemplate`。共享 `POSTER_PROMPT_BASE` 现在以 `FORMAT CONTRACT` 开头，明确整张画布就是海报 artwork，并把墙面、相框、手机、手、QR、摄影、外框、mockup 全部列入禁用项。
- 头像与用户名图形化：有头像时 `AVATAR_IDENTITY_RULE` 要求头像只作为二创参考，提取脸型轮廓、发型方向、表情气质、色彩温度、配饰暗示和 attitude，再转成成熟的演出海报人物、舞台符号或印刷肖像，禁止直接贴头像、复刻照片构图、照片感头像或儿童漫画化。无头像时 `USERNAME_IDENTITY_RULE` 要求用户名成为主视觉：大面积裁切字母、首字母、票据编码、场馆戳、手写 stage name、vertical fragments 或半可读标题，而不是普通署名。`nameGraphicLine(profile.name)` 在两种模式下都会把用户名作为可选图案素材注入 prompt，要求偏中间。
- 图像边界：生成 prompt 要求输出满版竖向矩形演出海报，主体居中，不能包含 app UI、手机 mockup、墙面背景、外框、胶带、留白、QR、手、滑板、轮子、通缉单套话、抗议标语牌或外部品牌 Logo；UI 只负责排列纯矩形海报，不再为生成结果补 mockup。
- 图片预载：`generatePoster()` 在 `useGenImage.generate()` 返回 URL 后进入 `saving` 阶段，调用 `preloadImage()` 用 `new Image()` 加载并在支持时调用 `image.decode()`；最长等待 16 秒。只有预载结束后才写入 mirror、`persist()` 并打开详情页，降低首次详情看到空白图片的概率。
- 公共墙：`refreshWall()` 调 `/note/aigram/ai/game/get/data/list`，flatten 每个用户存档里的全部 `posters`，按 `createdAt` 倒序截取 24 个，不只取最新一张。同一次 rows 会传给 `messagesByTarget()` 和 `likesByTarget()`，按作品 id 聚合互动，再解析相关用户 profile，为作者、留言者和点赞者补 `name/head_url`。非 Aigram / 空数据时不再注入 demo 海报，墙面显示 `.pw-wall-empty` 空状态。
- optimistic merge：真实墙面渲染前把 `mine` 中云端还没同步的作品合并到 `wall` 前面，用 `entry.id` 去重，解决保存同步造成的短暂空窗。
- 界面风格：`PosterWall.less` 使用深黑 `#151515`、奶白 `#eee7d5`、路线蓝 `#0039a6`、奶白标牌 `#f6f4ef`，辅助保留黄色 `#ffe100`、红色 `#f31313`、深绿 `#17664b` 和青色 `#4dcfe8`。根舞台使用 `Helvetica Neue / Helvetica / Arial`；顶部 `.pw-kicker` 带 24px 蓝色路线圆点 `A`，标题是 29px Helvetica Bold `Tonight`；右侧 `.pw-view-toggle` 是 168px × 46px 的简洁 `Stack / Grid` 切换条，`Stack` 带三张重叠矩形图标，`Grid` 带 2×2 网格图标，选中态为奶白底黑字。底部 `.pw-generator` 是 58px 起的悬浮操作条，左侧头像状态，右侧 138px 奶白矩形 `.pw-cta`，主文案为 `Make poster`，箭头使用路线蓝。
- 作品墙布局：`PosterWall.tsx` 用 `useState<'stack' | 'grid'>` 管理视图，首屏渲染 `game.wall.slice(0, 10)`。每张 `.pw-card--slot-*` 是同一个 DOM 元素，`.pw-wall--stack` 下用不同尺寸、位置、旋转和 z-index 压缩成一屏内的海报堆，重点展示层层叠加而不是完整铺开所有内容；`.pw-wall--grid` 下移动到 2 列、154px × 231px 的正常可滚动队列；`left/top/width/height/transform/filter` 以 680ms `cubic-bezier(0.2,0.9,0.18,1)` 过渡。
- 详情页：选中作品后渲染覆盖舞台的 `.pw-detail` 全屏状态，顶部透明细线 `Back` 按钮关闭详情，点击海报本身也关闭。主体展示 228px × 342px 完整海报，不显示“正面/反面”说明；详情背景继续使用深黑，底部 `.pw-detail__social` 是上边界线分隔的信息带，不再是厚重表单卡片，包含作者头像 + 名字、心形点赞按钮及内联计数、单个留言数文本、最近 3 条留言和 140 字输入框；输入框 placeholder 由 `commentPlaceholder` 接收作者名生成 `Leave a note for {n}`。长用户名使用 `min-width:0`、`text-overflow: ellipsis`、`white-space: nowrap` 防止撑破页面。
- 社交互动：`toggleLike(entry)` 把 `PosterLike` 存在当前玩家自己的 `PosterSave.likes`，同一玩家对同一作品只保留 1 个赞，再次点击取消；聚合时用 `fromUserId` 去重。`sendComment(entry,text)` 用 `newMessage()` 生成 `GuestMessage`，通过 `appendMessage()` 写入当前玩家自己的 `PosterSave.messages`，留言上限 140 字，本地立即回显；给非本人作品留言时触发 `poster_wall_note` 通知作者，`refUrl` 会把相对图片转成绝对 URL。
- 跨用户身份：公共墙会拉取作者的 `name/head_url`；详情作者 chip 和留言作者 chip 显示头像 + 名字。非本人作者在 Aigram 内点击时调用 `openAigramProfile(userId)`，滚动墙内作品打开详情使用 `onClick`。
- 响应式：真实游戏固定 `FIELD_W=390`、`FIELD_H=680`，根据 `visualViewport` 与 `#root` 实际尺寸计算 scale；`.pw-shell` 顶部对齐、`.pw-stage` 使用 `transform-origin: top center`，避免 mini App 外层导航栏压缩可用高度后游戏仍垂直居中造成顶部空隙。

## 4. 扩展点

- 改生成风格：编辑 `src/PosterWall/hooks/usePosterWall.ts` 的 `POSTER_PROMPT_BASE`、`PROMPT_TEMPLATES`、`AVATAR_IDENTITY_RULE`、`USERNAME_IDENTITY_RULE` 和 `nameGraphicLine()`；新增模板时设置 `id`、`mode`、`tone`、`concept`、`layout`、`palette`、`typography`、`identity`。
- 改制作频率：编辑 `CRAFT_COOLDOWN_MS`；当前为 12 小时。
- 改墙面布局：编辑 `src/PosterWall/PosterWall.less` 的 `.pw-wall`、`.pw-card`、`.pw-card__paper`，以及 `src/PosterWall/PosterWall.tsx` 的 `posterStyle()` 行列错位和旋转参数。
- 改详情页：编辑 `src/PosterWall/PosterWall.tsx` 的 `.pw-detail` 结构，以及 `PosterWall.less` 的 `.pw-detail*`、`.pw-author-card*`、`.pw-comment*` 样式。
- 改社交规则：编辑 `usePosterWall.ts` 的 `likesByTarget()`、`uniqueLikesFor()`、`toggleLike()`、`sendComment()`，以及 `src/shared/social/guestbook.ts` 的留言上限和通知配置。
- 改生产等待页：编辑 `PosterWall.tsx` 的 `productionStepKeys`、`productionProgress()`、`productionNoteKey()` 和 `.pw-production` 结构；文案在 `i18n/index.ts`。
- 改保存上限：编辑 `MAX_MINE` 和 `MAX_WALL`。
- 换无头像格式参考：编辑 `public/img/style-ref/flat-poster-ref.svg` 后用 `rsvg-convert -w 768 -h 1152` 重新导出同目录 `.png`；参考图应保留演出海报文字层级，但不能出现人脸、品牌文案、禁用提示词、墙面、手机、边框或胶带。
- 换评审样张：替换 `public/img/review-generated/*.jpg`；这些样张只用于评审页和设计说明，不进入正式墙面数据。
- 改封面：最终 UI 定稿后替换 `public/poster.png`，并同步到 `games/posters/poster-wall.png`。
