# Technical

## 1. 技术栈

- React 18 + TypeScript + Vite，构建 `base: './'`，样式使用 Less。
- 渲染方式是 DOM/CSS：英文单语 Helvetica 地铁导视风海报展台、Stack / Grid 切换动画、生成等待页、完整海报详情页和评审页都由 HTML/CSS 组成。
- 平台能力使用 `@shared/runtime`：`callAigramAPI`、`openAigramProfile`、`useGenImage`、`useGameEvent`；存档使用 `@shared/save/useGameSave`。
- 运行时图像生成使用平台 `useGenImage.generate()`。有头像时最终生成发送 `{ prompt, ref_url: profile.head_url }`，让头像作为受控身份参考进入平面海报再创作；无头像时发送 `{ prompt }`。有头像时还会先用 `useRecognize()` 把头像读解成文字视觉线索，再把线索并入 prompt。

## 2. 目录结构

- `src/App.tsx`：非 Aigram 环境默认显示评审页；`?play=1` 或 Aigram iframe 显示真实游戏。
- `src/PosterWall/PosterWall.tsx`：真实游戏 UI，包含英文单语文案、Helvetica 导视标题、Stack / Grid 视图状态、同一批海报的布局切换、无打底海报的空墙状态、3 小时冷却状态、全屏生成等待页、单张完整海报详情页、本人作品双阶段删除、点赞、留言和作者 profile 入口。
- `src/PosterWall/PosterWall.less`：真实游戏的深黑背景、地铁路线圆点、Helvetica 导视排版、海报叠放布局、整齐排列布局、680ms 布局切换动画、生成入口、空墙、等待页、详情页和社交区样式。
- `src/PosterWall/hooks/usePosterWall.ts`：用户资料、图像生成、本地 mirror 存档、3 小时生成冷却、公共墙拉取、点赞/留言聚合、留言通知、optimistic merge。
- `src/PosterWall/types.ts`：`PosterEntry`、`PosterSave`、`WallEntry`、舞台尺寸和评审页生成样张路径。
- `src/PosterWall/ReviewPage.tsx` / `ReviewPage.less`：评审页，展示身份保真打样台、最终首屏、详情页、生成目标样张和关键状态；身份打样台用同一固定参考图对比 4 张 transit 真实输出，并记录身份、名字和比例问题。
- `public/review.html`：不依赖 React 的独立静态 HTML 评审页，使用相对路径展示固定参考头像、4 张真实回归海报、统计数字和下一轮问题；构建后可直接打开 `/poster-wall/review.html`。
- `src/PosterWall/i18n/index.ts`：英文单语文案表，保留 `t()` 占位符替换但不再根据浏览器语言切换。
- `src/PosterWall/utils/sounds.ts`：Web Audio 合成点击、生成、成功、失败、打开详情音效。
- `src/shared/social/guestbook.ts`：共享留言模型和工具，提供 `GuestMessage`、`appendMessage()`、`messagesByTarget()`、`threadFor()`、`guestbookNotifyConfig()`、`timeAgo()`。
- `public/img/review-generated/*.jpg`、`public/img/review-generated/templates/*.jpg` 与 `public/img/review-generated/identity-test/live-*.webp`：评审页生成方向样张和 2026-07-10 头像保真回归实测结果；正式墙面不使用这些图片打底。
- `public/img/review-generated/identity-test/reference-isaya.png` 与 `identity-test/*.webp`：固定角色参考图和 4 张 transit 身份保真测试输出，只进入评审页，不进入正式作品墙或玩家存档。
- 回归结论（2026-07-10）：平台用户头像是 1:1，当前墙面和详情页保持方形契约；评审夹具 `reference-isaya.png` 是 832×1248 的旧竖图，导致 4 张测试输出为 2:3，这只是夹具比例观察，不是生产 bug。四张输出均可辨认同一人物，其中 color-block 与 xerox 方向的身份/海报平衡最好；Swiss 方向仍需避免大标题穿过眼睛。
- `public/img/style-ref/fluoro-notice-ref.png` / `.svg`：`fluoro-notice-bill` 模板的彩色纸 + 单色油墨参考资产；只有部署到 HTTPS 后才会作为 `ref_url` 传给平台生图接口。
- `public/poster.png` / `public/poster.svg`：当前平台封面，发布时也需要同步到 `games/posters/poster-wall.png`。

## 3. 核心模块

- 状态管理：`usePosterWall()` 用 `useGameSave<PosterSave>('poster-wall')` 加本地 `mirror`，只在 `savedData` 首次加载后 seed 一次，后续所有写入都从 mirror 读改写，避免多次生成覆盖旧作品。`PosterSave` 包含 `posters`、`totalGenerated`、`messages`、`likes`、`lastGeneratedAt`。
- 生成逻辑：`generatePoster()` 先检查 `canCraft`，冷却由 `(lastGeneratedAt + 3h - Date.now())` 计算，不依赖平台日统计。有头像时先把 `profile.head_url` 交给 `useRecognize().recognize({ mode:'face' })`，把返回的 caption、labels、attributes、parts 过滤整理成补充文字线索；识别失败时不阻断生成，prompt 会明确继续以原始参考头像为权威身份来源，不虚构替代人物。随后 `buildPosterPrompt()` 把头像文字线索或用户名素材注入 prompt。有头像时最终调用 `useGenImage.generate({ prompt, ref_url: profile.head_url })`，用头像图作为身份参考；无头像时调用 `useGenImage.generate({ prompt })`。用户名缺失时 `nameGraphicLine()` 使用 `YOU` 作为兜底字形素材。
- 模板池：`PROMPT_TEMPLATES` 定义 10 个海报模板，覆盖 `hex-zine-portrait`、`upstairs-handbill`、`tokyo-pulp-flyer`、`fluoro-notice-bill`、`subway-showbill`、`swiss-type-system`、`color-block-program`、`fashion-week-roster`、`museum-comedy-label`、`xerox-photo-silhouette`。头像模式用 `avatarFidelity` 把模板分为 `portrait`、`silhouette`、`abstract`，`promptTemplateFor()` 通过稳定种子按 70% / 20% / 10% 选择身份保真层级，再从对应模板组内稳定抽取；用户名模式仍从兼容模板中均匀抽取。`buildPosterPrompt(mode,userName,seed,avatarCue,previousPoster,forcedTemplateId?)` 使用稳定种子抽取模板、色彩和字体策略，测试时可用 `forcedTemplateId` 走同一构建函数固定模板。2026-07-12 的 prompt 重构把原先约 5,700 字符的共享构图说明缩为只负责方形满版、背景触边和内容闭集的约束；实际试验请求缩到约 1,400–1,900 字符。巨大字、斜切线、网格、颗粒和色块不再由共享段规定，而是每个模板各自定义互斥的 `concept/layout/identity`。`identity` 使用正向 allowed-elements 白名单，避免把 QR、滑板等禁用对象作为视觉 token 激活。`fluoro-notice-bill` 的无头像路径仍可使用线上 HTTPS 风格参考，有头像时始终优先使用用户 `head_url`。
- 头像与用户名图形化：有头像时 `AVATAR_IDENTITY_RULE` 要求保留参考图的脸型、发型、表情和标志性配饰，并保持眼、鼻、嘴无遮挡；`avatarCueLine()` 只把识别结果压缩成短视觉线索，识别失败时仍以原始 `ref_url` 为身份权威。具体人物占比、描绘次数和印刷技法由各模板的 allowed-elements 白名单决定。无头像时 `USERNAME_IDENTITY_RULE` 要求当前用户名成为唯一大字身份锚点。`nameGraphicLine(profile.name, template.id)` 负责精确名字；Swiss 与 Xerox 模板分别把名字锁在左上信息标签和右上印章，其余模板允许名字成为主要字形。
- 图像边界：共享 prompt 用正向闭集表达输出边界：只展示模板允许的身份、字形、墨迹和图形元素，背景墨色必须触达四条画布边。逐项写出禁用对象会反向激活模型，因此 QR、滑板、外框等词不再进入生产 prompt；第二轮 8 张真实 transit 回归中这些对象为 0。UI 只负责排列纯方形海报，不为生成结果补 mockup。
- 图片预载：`generatePoster()` 在 `useGenImage.generate()` 返回 URL 后进入 `saving` 阶段，调用 `preloadImage()` 用 `new Image()` 加载并在支持时调用 `image.decode()`；最长等待 16 秒。只有预载结束后才写入 mirror、`persist()` 并打开详情页，降低首次详情看到空白图片的概率。
- 公共墙：`refreshWall()` 调 `/note/aigram/ai/game/get/data/list`，flatten 每个用户存档里的全部 `posters`，按 `createdAt` 倒序截取 24 个，不只取最新一张。同一次 rows 会传给 `messagesByTarget()` 和 `likesByTarget()`，按作品 id 聚合互动，再解析相关用户 profile，为作者、留言者和点赞者补 `name/head_url`。非 Aigram / 空数据时不再注入 demo 海报，墙面显示 `.pw-wall-empty` 空状态。
- optimistic merge：真实墙面渲染前把 `mine` 中云端还没同步的作品合并到 `wall` 前面，用 `entry.id` 去重，解决保存同步造成的短暂空窗。
- 本人删除：`mergedWall` 会把云端返回且 `entry.userId === myUserId` 的作品重新标记为 `isSelf`，保证刷新后自己的作品仍显示删除入口。`DetailSocial` 的删除按钮先进入 4 秒 `Delete now` 确认态；`deletePoster(id)` 只接受当前 mirror 中存在的作品 id，通过同一个 `setMirror(prev => next)` 删除作品及当前存档中指向它的点赞/留言，完整 spread 其他字段后调用 `persist(next)`，再关闭详情并从 wall state 移除。累计生成数和冷却时间戳不修改。
- 界面风格：`PosterWall.less` 使用深黑 `#151515`、奶白 `#eee7d5`、路线蓝 `#0039a6`、奶白标牌 `#f6f4ef`，辅助保留黄色 `#ffe100`、红色 `#f31313`、深绿 `#17664b` 和青色 `#4dcfe8`。根舞台使用 `Helvetica Neue / Helvetica / Arial`；顶部 `.pw-kicker` 带 28px 蓝色路线圆点 `A`，标题是 28px Helvetica Bold `Tonight`；右侧 `.pw-view-toggle` 是 168px × 46px 的简洁 `Stack / Grid` 切换条，`Stack` 带三张实心重叠矩形图标，`Grid` 带 2×2 实心网格图标，选中态为奶白底黑字。底部 `.pw-generator` 是 64px 起的悬浮操作条，左侧头像状态，右侧 142px 奶白矩形 `.pw-cta`，主文案为 `Make poster`，箭头使用 24px SVG。
- 作品墙布局：`PosterWall.tsx` 用 `useState<'stack' | 'grid'>` 管理视图，首屏渲染 `game.wall.slice(0, 10)`。每张 `.pw-card--slot-*` 是同一个 DOM 元素，`.pw-wall--stack` 下用 160px 到 266px 的 1:1 方形尺寸、位置、旋转和 z-index 压缩成一屏内的海报堆，重点展示层层叠加而不是完整铺开所有内容；`.pw-wall--grid` 下移动到 2 列、154px × 154px 的正常可滚动队列；`left/top/width/height/transform/filter` 以 680ms `cubic-bezier(0.2,0.9,0.18,1)` 过渡。
- 详情页：选中作品后渲染覆盖舞台的 `.pw-detail` 全屏状态，顶部透明细线 `Back` 按钮关闭详情，点击海报本身也关闭。主体展示 324px × 324px 完整方形海报，居中放在 top=80px，比列表页叠层主海报 266px × 266px 更大；详情背景继续使用深黑、72px 斜线网格、极淡 `POSTER` 背景字和路线蓝径向光，不显示“正面/反面”说明。`.pw-detail__side` 是 top=434px 的身份/操作轨，包含作者头像 + 名字、心形点赞按钮及内联计数、单个留言数文本；`.pw-detail__notes` 是 top=486px 到底部 18px 的留言区，最近留言压缩为单行预览，下面是 140 字输入框。输入框 placeholder 由 `commentPlaceholder` 接收作者名生成 `Leave a note for {n}`。长用户名使用 `min-width:0`、2 行 clamp 和 `overflow-wrap:anywhere` 防止撑破页面。
- 社交互动：`toggleLike(entry)` 把 `PosterLike` 存在当前玩家自己的 `PosterSave.likes`，同一玩家对同一作品只保留 1 个赞，再次点击取消；聚合时用 `fromUserId` 去重。`sendComment(entry,text)` 用 `newMessage()` 生成 `GuestMessage`，通过 `appendMessage()` 写入当前玩家自己的 `PosterSave.messages`，留言上限 140 字，本地立即回显；给非本人作品留言时触发 `poster_wall_note` 通知作者，`refUrl` 会把相对图片转成绝对 URL。
- 跨用户身份：公共墙会拉取作者的 `name/head_url`；详情作者 chip 和留言作者 chip 显示头像 + 名字。非本人作者在 Aigram 内点击时调用 `openAigramProfile(userId)`，滚动墙内作品打开详情使用 `onClick`。
- 响应式：真实游戏固定 `FIELD_W=390`、`FIELD_H=680`，根据 `visualViewport` 与 `#root` 实际尺寸计算 scale；`.pw-shell` 顶部对齐、`.pw-stage` 使用 `transform-origin: top center`，避免 mini App 外层导航栏压缩可用高度后游戏仍垂直居中造成顶部空隙。

## 4. 扩展点

- 改生成风格：编辑 `src/PosterWall/hooks/usePosterWall.ts` 的 `POSTER_PROMPT_BASE`、`PROMPT_TEMPLATES`、`AVATAR_IDENTITY_RULE`、`USERNAME_IDENTITY_RULE` 和 `nameGraphicLine()`；共享段只放跨模板格式契约，构图语言必须放进单个模板的 `concept/layout/identity`。每个模板的 `identity` 应列出唯一允许出现的元素、主体占比与文字位置，不要用一长串否定对象。新增头像模板时还要设置 `avatarFidelity: 'portrait' | 'silhouette' | 'abstract'`，当前选择权重固定为 70% / 20% / 10%。需要 img2img 风格锚定时额外设置 `refAsset`，并确保该资源部署后是公网 HTTPS 可访问。
- 改制作频率：编辑 `CRAFT_COOLDOWN_MS`；当前为 3 小时。
- 改墙面布局：编辑 `src/PosterWall/PosterWall.less` 的 `.pw-wall`、`.pw-card`、`.pw-card__paper` 和 `.pw-wall--stack/.pw-wall--grid` 规则。
- 改详情页：编辑 `src/PosterWall/PosterWall.tsx` 的 `.pw-detail` 结构，以及 `PosterWall.less` 的 `.pw-detail*`、`.pw-author-card*`、`.pw-comment*` 样式。
- 改社交规则：编辑 `usePosterWall.ts` 的 `likesByTarget()`、`uniqueLikesFor()`、`toggleLike()`、`sendComment()`，以及 `src/shared/social/guestbook.ts` 的留言上限和通知配置。
- 改删除规则：编辑 `usePosterWall.ts` 的 `deletePoster()`；确认态与按钮位于 `PosterWall.tsx` 的 `DetailSocial`，视觉样式是 `PosterWall.less` 的 `.pw-delete` / `.pw-delete--confirm`，英文文案在 `i18n/index.ts`。
- 改生产等待页：编辑 `PosterWall.tsx` 的 `productionStepKeys`、`productionProgress()`、`productionNoteKey()` 和 `.pw-production` 结构；文案在 `i18n/index.ts`。
- 改保存上限：编辑 `MAX_MINE` 和 `MAX_WALL`。
- 改头像读解：编辑 `src/PosterWall/hooks/usePosterWall.ts` 的 `avatarCueLine()` 和 `cueList()`；当前会过滤敏感人口属性，只保留适合转译成平面设计的视觉线索。
- 换评审样张：替换 `public/img/review-generated/*.jpg`；这些样张只用于评审页和设计说明，不进入正式墙面数据。
- 改封面：最终 UI 定稿后替换 `public/poster.png`，并同步到 `games/posters/poster-wall.png`。
