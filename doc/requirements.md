# Requirements

## 1. Overview

Gig Wall 是一个英文单语社交共创生成游戏：玩家用自己的头像或基础身份信息生成一张平面设计感演出海报，所有玩家的海报在 Helvetica 地铁导视风展台里以 Stack / Grid 两种方式展示，点开可查看完整海报、作者、点赞与留言。

## 2. Visual Design

- 主游戏为 390px × 680px 竖屏舞台，固定设计稿尺寸，通过 `visualViewport` 和容器尺寸缩放；整体为简洁的纽约地铁 Helvetica 导视风格。背景为深黑 `#151515`，主文字 `#eee7d5`，界面线条 `rgba(238,231,213,0.18)`，路线蓝 `#0039a6`，奶白标牌 `#f6f4ef`，辅助色为黄色 `#ffe100`、红色 `#f31313`、深绿 `#17664b`、青色 `#4dcfe8`。所有功能 UI 使用英文正常大小写，不再使用强制全大写或海报字体；海报作品内部仍可使用大写作为图形语言。
- 顶部信息区高度约 52px，左右各 22px，顶部 14px。左侧使用 28px 蓝色路线圆点 `A`、9px Helvetica `Poster Wall`、28px Helvetica Bold 标题 `Tonight`、9px `Wall / Mine {n}`；右侧是 168px × 46px 的简洁模式切换条，1px 细线边框，两个按钮分别是 `Stack` 与 `Grid`。`Stack` 按钮内置 3 张实心重叠矩形图标，`Grid` 按钮内置 2×2 实心网格图标；选中态为奶白底 `#eee7d5`、黑字 `#151515`。
- 列表页核心是同一批 1:1 方形演出海报在“叠放 / 排列”两种布局之间动画切换。首屏渲染最近 10 张作品，数据仍保留公共墙最多 24 张。叠放模式是压缩在一屏内的海报堆，墙面区域 left/right=18px、top=84px、bottom=92px。最新海报尺寸 266px × 266px，在墙面区域内位置 x=44px、y=46px，旋转 -1deg，z-index 40；其余海报用 160px × 160px 到 220px × 220px 的方形尺寸从左右后方露出，旋转 -10deg 到 10deg，形成凌乱但有控制的重叠，不要求完整展示每一张。排列模式下同一批元素在 680ms 内移动到正常可滚动 2 列队列，每张 154px × 154px，旋转归零，列 x=12px/188px，行 y=10px/184px/358px/532px/706px。
- 海报卡片不带特殊边缘样式，只是干净 1:1 方形图案，边框为 0，圆角 0，使用满版背景图展示，不再把平台 1:1 生图裁成 2:3，避免用户名和头像主视觉被截掉。阴影只用于层级：叠放模式最新海报阴影 `0 30px 80px rgba(0,0,0,0.54)`，排列模式统一为 `0 12px 30px rgba(0,0,0,0.26)`。点击任意海报打开详情。
- 底部是 64px 起的悬浮生成入口，左右各 22px、底部 14px，1px 细线边框，黑色 78% 透明背景和 16px blur。入口使用两列布局：左侧头像状态区 `minmax(0,1fr)`，右侧 142px CTA。头像状态使用 34px 圆形头像和两行英文 9px 文案。主 CTA 高 48px，奶白矩形标牌背景 `#f6f4ef`，主文案为 14px Helvetica Bold `Make poster`，黑字 `#151515`，副文案黑字 8px Helvetica SemiBold，右侧为 24px Material-style 箭头 SVG。每位玩家每 3 小时最多制作 1 张海报；冷却期间按钮变为 `rgba(246,244,239,0.08)` 并显示剩余时间。
- 全屏生产页覆盖舞台内 inset=18px 的印刷等待面板，背景为深黑网格、左上蓝色路线圆点、奶白短横和黄色轨迹线。主标题区靠下放置：12px 青色 `Press room`、42px 到 64px Helvetica Bold `On press`、15px 单句状态说明。底部只显示 1 条当前工序提示，每 9 秒轮换一次；工序进度用 4 条 26px × 2px 横线表示，整体模拟进度最高停在 92%。等待页不展示旧式 mockup、手机、墙面或纸张照片，风格和空墙状态保持一致。
- 详情页是全屏海报展台，不是弹窗。顶部左侧为 30px 高透明细线 `Back` 按钮；主体区域展示 324px × 324px 完整方形海报，居中放在 top=80px，比列表页叠层主海报 266px × 266px 更大。背景继续使用 `#151515`、72px 斜向细线网格、极淡 `POSTER` 背景字和路线蓝径向光，只用 `0 30px 94px rgba(0,0,0,0.64)` 阴影托起海报。详情页不显示“正面/反面”说明文字。
- 详情底部是简洁作品信息带，不再是大表单卡片：top=434px 的身份/操作轨显示 38px 圆形头像或首字母 fallback、8px 类型标签、19px 用户名、心形点赞按钮及内联点赞数、单个留言数文本；top=486px 到底部 18px 是留言输入区，最近留言压缩为单行预览，140 字留言输入框始终在底部。留言输入框 placeholder 必须写明给谁留言，例如 `Leave a note for goldie`。用户名最多 2 行，连续长字符用 `overflow-wrap:anywhere` 折断。非本人作者和留言作者可点击打开 Aigram 主页。
- 本人作品的详情身份轨额外显示 32px 高透明红色细线 `Delete` 按钮；第一次点击只切换为红底 `Delete now`，第二次点击才永久删除。切换后若 4 秒内未确认，按钮自动恢复；查看他人作品时不显示删除按钮。
- 演出海报 prompt 使用 10 个模板随机池，按“是否有头像 + 用户名 + 生成时间种子”选择 1 个模板，并在模板内再抽取色彩和字体策略。模板包括 `hex-zine-portrait`、`upstairs-handbill`、`tokyo-pulp-flyer`、`fluoro-notice-bill`、`subway-showbill`、`swiss-type-system`、`color-block-program`、`fashion-week-roster`、`museum-comedy-label`、`xerox-photo-silhouette`。共享 prompt 只保留 1:1 满版平面作品、当前用户名、身份保真和内容闭集边界，完整请求目标长度为 1400–1900 个英文字符；巨大裁切字、斜切色块、竖排文字、网格、颗粒等构图语言不得写进共享段。每个模板必须拥有独立且互斥的构图骨架，并用正向元素白名单限定内容：例如 `tokyo-pulp-flyer` 使用密集包装插画，`upstairs-handbill` 使用松散手绘单色传单，`swiss-type-system` 使用克制留白网格，`xerox-photo-silhouette` 使用双色复印肖像。`fluoro-notice-bill` 仍严格限制为一张纯色纸底 + 一种油墨。模板差异必须在 160×160 缩略图下仍可一眼辨认，不能只靠换颜色区分。
- 有头像演出海报 prompt：头像账号会把头像公网 `head_url` 作为 `ref_url` 传给最终生图接口，同时系统也先用视觉识别把头像读解成补充文字线索，提取脸型轮廓、发型方向、眉眼与表情、色彩温度、标志性配饰和 attitude。身份保真优先于模板风格：生成结果必须让熟人第一眼认出是同一个人，至少保留脸型、发型、眉眼或表情、标志性配饰中的 3 类特征。70% 的头像模板以占画面约 35%–60% 的正面或三分之四侧面脸部/半身肖像为主视觉，20% 使用仍可辨认的双色剪影或丝网印刷肖像，最多 10% 才允许把人物进一步抽象成个人徽记。模板只提供印刷语言，不能把人物降级成通用几何或字母符号。不能直接贴原头像、不能出现圆形头像框或照片 mockup、不能低龄卡通化；允许丝网印刷、risograph、linocut、halftone 和双色套印，但眼睛、鼻子、嘴部的主要识别区不得被大块文字完全遮挡。用户名是强制素材：必须至少有一次完整、可读、准确的用户名或 18 字符内截断用户名出现在画面中，作为 performer name、show title 或 vertical title spine；缩写只能作为辅助装饰，不能替代完整用户名。名字可以贴合、环绕或局部穿插人物外轮廓，但不能牺牲面部识别度。
- 无头像演出海报 prompt：最终走文生图；用户名成为主视觉身份来源，必须至少有一次完整、可读、准确的用户名或 18 字符内截断用户名出现在画面中，并转成大面积裁切字母、票据编码、场馆戳、手写 stage name、vertical fragments 或半可读标题，而不是普通署名；缩写只能作为辅助装饰，不能替代完整用户名。若平台用户名缺失，使用 `YOU` 作为兜底字形素材。UI 提示“Create an avatar to unlock a more personal poster identity.”
- 正式墙面只显示真实生成并保存的玩家海报；没有真实作品时显示空墙状态，不用默认海报填充。评审页可展示 `public/img/review-generated/*.jpg` 作为生成方向样张，但这些样张不参与正式墙面数据。
- 评审页首段增加身份保真打样台：左侧展示 1 张固定参考角色，右侧并列展示 4 张由同一参考图生成的真实输出，覆盖 2 张 `portrait`、1 张 `silhouette`、1 张 `abstract`。每张样张显示模板档位、身份判断和已知问题；顶部汇总 4/4 身份通过、2/4 精确名字通过、0/4 方形比例通过，明确呈现“身份改善成功、拼字和参考图比例仍需处理”的结论。桌面端使用 4 列样张，移动端降为 1 列，图片保持完整比例展示而不裁切。
- 资产清单：`public/img/review-generated/*.jpg` 和 `public/img/review-generated/templates/*.jpg` 是旧评审方向样张；`public/img/review-generated/identity-test/reference-isaya.png` 是固定测试参考角色，`identity-test/*.webp` 是同一角色经 transit 生图接口生成的 4 张身份保真测试结果；`public/img/style-ref/fluoro-notice-ref.png` 是 `fluoro-notice-bill` 模板在线上 HTTPS 环境可选传入的风格参考图；`public/poster.png` 是 1:1 平台封面；`public/img/aigram.svg` 是水印。
- 当前项目记录：平台用户头像契约为 1:1，正式海报继续采用 1:1 方形墙卡、叠放布局和详情页。2026-07-10 的 4 张身份回归图使用了一个旧的 832×1248 评审夹具，因此输出保留 2:3 仅作为测试记录，不代表平台头像或线上产品比例；正式问题只保留“文字偶尔穿过眼睛”的提示词约束。

## 3. Game Mechanics

- 每位玩家本地最多保存 12 张海报作品，公共墙显示 24 张，按 `createdAt` 倒序；公共墙必须 flatten 最近用户存档中的全部 `posters`，不得只取 `posters[0]`。
- 制作冷却为 3 小时，时间戳保存在自己的 `PosterSave.lastGeneratedAt`，不依赖平台日统计。冷却中不能触发生成。
- 点击制作后创建一次生成任务。有头像时先调用头像识别，把 `head_url` 读成文字视觉线索；最终调用生图接口时发送 `{ prompt, ref_url: profile.head_url }`，让头像作为受控身份参考进入平面海报再创作。无头像时直接用用户名构造 prompt 并文生图。两种路径都必须把完整可读用户名或 18 字符内截断用户名至少印入画面一次，并让它成为裁切字母、竖排字形、票据编码、场馆戳、stage-title fragment 或 access-code 标签；缩写不能替代完整用户名。下一张海报会避开上一张保存作品的 `posterTemplate`，并要求至少改变模板结构、背景色、标题裁切、肖像/符号形状、文字轴线和留白节奏中的 4 项。prompt 要求输出完整 1:1 方形英文平面海报图案，不能有外部墙面背景、App UI、相框、空白边框、QR、手机、手、滑板元素或过大黑边。
- 生成 URL 返回后进入 `saving` 阶段，先用 `Image` 预加载并尽量 `decode()`，单张图最长等待 16 秒；预载后再写入本地 mirror、`persist()` 并打开详情页，避免首次详情出现空白海报。
- 保存对象 `PosterEntry` 包含 `id`、`createdAt`、`mode`、`imageUrl`、`prompt`、`hasAvatar`、`userId`、`userName`、`userAvatarUrl`、`posterTone`、`posterTemplate`。
- 详情页点赞存在当前玩家自己的 `likes` 数组中，同一玩家对同一作品只保留 1 个赞；再次点击取消。留言存在当前玩家自己的 `messages` 数组中，按作品 id 聚合，最多保存 30 条，单条最多 140 字。给非本人作品留言时触发平台通知作者，点赞不发通知。
- 公共墙 optimistic merge 当前用户本地作品，用 `entry.id` 去重，避免云端防抖写入期间看不到刚生成的作品。
- 删除只允许作用于当前玩家自己的作品 id。确认后从自己的 `posters` 中移除对应作品，同时清理当前存档中指向该作品的本人点赞和本人留言；`totalGenerated` 与 `lastGeneratedAt` 保持不变，因此删除不会回退累计生成数或绕过 3 小时制作冷却。删除写入本地 mirror 与云端存档后立即关闭详情，并从 optimistic wall 消失。
- prompt 改造的发布门槛：先选择 4 个结构差异最大的模板，各生成至少 2 张真实 transit 输出，且同时覆盖无头像文生图和固定头像 img2img。8 张样例中不得出现跨模板复用的同一“大黑字 + 四宫格色块 + 白色斜撕裂线 + 底部信息表”骨架；二维码、滑板、外框和 UI 的出现数必须为 0；至少 3/4 模板在 160×160 缩略图下可不看标签直接区分。通过后才扩展剩余 6 个模板并发布。

## 4. Controls

- 底部制作 CTA 使用 `onPointerDown`，只有 `profileLoaded && canCraft && !generating` 时可触发。
- 公共墙在“排列”模式下可纵向滚动，海报卡片使用 `onClick`，不得使用 `onPointerDown`，避免移动端滚动时误打开详情；“叠放 / 排列”切换按钮也使用 `onClick`。
- 详情页返回按钮、作者 chip、留言作者 chip、点赞按钮、留言发送按钮使用 `onClick`；作者 chip 内部调用 `stopPropagation()`，避免触发父级关闭详情。
- 本人作品的删除按钮使用 `onClick`：第一次进入 4 秒确认态，第二次确认执行删除；详情弹层内部继续阻止事件冒泡，删除点击不会触发海报关闭按钮。
- 键盘 Enter 或 Space 在真实游戏页触发制作 CTA；Esc 关闭详情页。
- 触控交互统一使用 `touch-action: manipulation`，舞台根节点不禁用浏览器滚动。

## 5. Win / Lose Conditions

- 本游戏没有传统失败条件，目标是生成并上墙一张个人海报。
- 完成条件：生成接口返回图片 URL、图片预载完成、作品保存成功；完成后打开详情页并在公共墙 optimistic merge 中立即可见。
- 失败条件：生成接口报错、无 URL 或保存异常；失败时底部显示 10px 错误文字，并允许冷却未消耗时重试。
- 历史结果用存档中的 `totalGenerated` 表示累计成功上墙次数；列表页顶部显示墙上数量和我的数量。

## 6. Sound Effects

- 点击按钮：620Hz → 420Hz triangle 波，0.05s，gain 0.055。
- 开始生成：180Hz/360Hz/720Hz sawtooth 三音上行，0.18s，gain 0.04。
- 海报生成成功：440Hz、554Hz、659Hz、880Hz sine 四音 arpeggio，间隔 0.045s，每音 0.16s，gain 0.055。
- 生成失败：150Hz → 90Hz square 波下降，0.16s，gain 0.045。
- 打开详情：300Hz → 520Hz sine 波，0.08s，gain 0.04。
- 生产页每 12 秒最多播放一次轻微印刷噪声：white-noise band-pass 900Hz，0.09s，gain 0.018。
