# Requirements

## 1. Overview

Gig Wall 是一个英文单语社交共创生成游戏：玩家用自己的头像或基础身份信息生成一张平面设计感演出海报，所有玩家的海报在 Helvetica 地铁导视风展台里以 Stack / Grid 两种方式展示，点开可查看完整海报、作者、点赞与留言。

## 2. Visual Design

- 主游戏为 390px × 680px 竖屏舞台，固定设计稿尺寸，通过 `visualViewport` 和容器尺寸缩放；整体为简洁的纽约地铁 Helvetica 导视风格。背景为深黑 `#151515`，主文字 `#eee7d5`，界面线条 `rgba(238,231,213,0.18)`，路线蓝 `#0039a6`，奶白标牌 `#f6f4ef`，辅助色为黄色 `#ffe100`、红色 `#f31313`、深绿 `#17664b`、青色 `#4dcfe8`。所有功能 UI 使用英文正常大小写，不再使用强制全大写或海报字体；海报作品内部仍可使用大写作为图形语言。
- 顶部信息区高度约 52px，左右各 22px，顶部 14px。左侧使用 28px 蓝色路线圆点 `A`、9px Helvetica `Poster Wall`、28px Helvetica Bold 标题 `Tonight`、9px `Wall / Mine {n}`；右侧是 168px × 46px 的简洁模式切换条，1px 细线边框，两个按钮分别是 `Stack` 与 `Grid`。`Stack` 按钮内置 3 张实心重叠矩形图标，`Grid` 按钮内置 2×2 实心网格图标；选中态为奶白底 `#eee7d5`、黑字 `#151515`。
- 列表页核心是同一批海报在“叠放 / 排列”两种布局之间动画切换。首屏渲染最近 10 张作品，数据仍保留公共墙最多 24 张。叠放模式是压缩在一屏内的海报堆，墙面区域 left/right=18px、top=84px、bottom=92px。最新海报尺寸 246px × 369px，在墙面区域内位置 x=54px、y=34px，旋转 -1deg，z-index 40；其余海报用 160px × 240px 到 216px × 324px 的尺寸从左右后方露出，旋转 -10deg 到 10deg，形成凌乱但有控制的重叠，不要求完整展示每一张。排列模式下同一批元素在 680ms 内移动到正常可滚动 2 列队列，每张 154px × 231px，旋转归零，列 x=12px/188px，行 y=10px/260px/510px/760px/1010px。
- 海报卡片不带特殊边缘样式，只是干净矩形图案，边框为 0，圆角 0，使用 `object-fit: cover` 的满版图。阴影只用于层级：叠放模式最新海报阴影 `0 30px 80px rgba(0,0,0,0.54)`，排列模式统一为 `0 12px 30px rgba(0,0,0,0.26)`。点击任意海报打开详情。
- 底部是 64px 起的悬浮生成入口，左右各 22px、底部 14px，1px 细线边框，黑色 78% 透明背景和 16px blur。入口使用两列布局：左侧头像状态区 `minmax(0,1fr)`，右侧 142px CTA。头像状态使用 34px 圆形头像和两行英文 9px 文案。主 CTA 高 48px，奶白矩形标牌背景 `#f6f4ef`，主文案为 14px Helvetica Bold `Make poster`，黑字 `#151515`，副文案黑字 8px Helvetica SemiBold，右侧为 24px Material-style 箭头 SVG。每位玩家每 12 小时最多制作 1 张海报；冷却期间按钮变为 `rgba(246,244,239,0.08)` 并显示剩余时间。
- 全屏生产页覆盖舞台内 inset=18px 的印刷等待面板，背景为深黑网格、左上蓝色路线圆点、奶白短横和黄色轨迹线。主标题区靠下放置：12px 青色 `Press room`、42px 到 64px Helvetica Bold `On press`、15px 单句状态说明。底部只显示 1 条当前工序提示，每 9 秒轮换一次；工序进度用 4 条 26px × 2px 横线表示，整体模拟进度最高停在 92%。等待页不展示旧式 mockup、手机、墙面或纸张照片，风格和空墙状态保持一致。
- 详情页是全屏海报展台，不是弹窗。顶部左侧为 30px 高透明细线 `Back` 按钮；主体区域展示 292px × 438px 完整海报，居中放在 top=54px，比列表页叠层主海报 246px × 369px 更大。背景继续使用 `#151515`、72px 斜向细线网格、极淡 `POSTER` 背景字和路线蓝径向光，只用 `0 30px 94px rgba(0,0,0,0.64)` 阴影托起海报。详情页不显示“正面/反面”说明文字。
- 详情底部是简洁作品信息带，不再是大表单卡片：top=530px 的身份/操作轨显示 38px 圆形头像或首字母 fallback、8px 类型标签、19px 用户名、心形点赞按钮及内联点赞数、单个留言数文本；top=578px 到底部 18px 是留言输入区，最近留言压缩为单行预览，140 字留言输入框始终在底部。留言输入框 placeholder 必须写明给谁留言，例如 `Leave a note for goldie`。用户名最多 2 行，连续长字符用 `overflow-wrap:anywhere` 折断。非本人作者和留言作者可点击打开 Aigram 主页。
- 演出海报 prompt 使用 10 个模板随机池，按“是否有头像 + 用户名 + 生成时间种子”选择 1 个模板，并在模板内再抽取色彩和字体策略。模板包括 `hex-zine-portrait`、`upstairs-handbill`、`tokyo-pulp-flyer`、`fluoro-notice-bill`、`subway-showbill`、`swiss-type-system`、`color-block-program`、`fashion-week-roster`、`museum-comedy-label`、`xerox-photo-silhouette`。其中 `fluoro-notice-bill` 是撞色墙专用模板：单张海报必须是一张纯色纸底 + 一种油墨印刷，禁止第三色、渐变、彩色插画和阴影，让视觉冲突来自多张不同纸色海报的重叠。所有模板共享正向格式约束：输出是一张 full-frame flat 2D vector typography artwork，像 Illustrator / SVG / risograph 导出的平面图形文件；画面只由色块、字形、符号、肖像标记、印刷颗粒和套印质感组成。字体版式必须成为主构图：至少 3 个文字尺度，最大裁切字块占据接近半个画面，中号信息块承载日期或场地，小号文字作为票据/目录/边栏信息；画面必须有可见英文演出信息，不能做无字抽象图。为避免模型把说明词印进画面，prompt 使用短英文 token 和动态用户名 token，不再使用固定示例姓名或百分比数值。排版张力来自超大标题字母出界裁切、竖向文字脊柱、斜切色块、压缩边栏标签、强尺度对比、文字与线条碰撞和非对称留白。
- 有头像演出海报 prompt：头像不上传给最终生图接口。系统先用视觉识别把头像读解成文字线索，只提取脸型轮廓、发型方向、表情气质、色彩温度、配饰暗示、形状节奏和 attitude；最终海报只走文生图。头像文字线索必须被转成成熟的演出海报人物、舞台符号、印刷肖像或场馆标识；不能直接贴原头像、不能做照片头像、不能低龄卡通化。头像必须被裁切、套印、被字母遮挡或简化成双色肖像符号，不能作为一张独立照片放在海报上。若有用户名，用户名作为装饰字形素材出现：超大裁切字母、缩写、横竖排、access code、edition number、箭头标签或半可读演出标题，重点在海报中区。
- 无头像演出海报 prompt：最终也走文生图；用户名成为主视觉身份来源，转成大面积裁切字母、首字母、票据编码、场馆戳、手写 stage name、vertical fragments 或半可读标题，而不是普通署名；若平台用户名缺失，使用 `YOU` 作为兜底字形素材。UI 提示“Create an avatar to unlock a more personal poster identity.”
- 正式墙面只显示真实生成并保存的玩家海报；没有真实作品时显示空墙状态，不用默认海报填充。评审页可展示 `public/img/review-generated/*.jpg` 作为生成方向样张，但这些样张不参与正式墙面数据。
- 资产清单：`public/img/review-generated/*.jpg` 和 `public/img/review-generated/templates/*.jpg` 是评审页生成方向样张；`public/img/style-ref/fluoro-notice-ref.png` 是 `fluoro-notice-bill` 模板在线上 HTTPS 环境可选传入的风格参考图；`public/poster.png` 是 1:1 平台封面；`public/img/aigram.svg` 是水印。

## 3. Game Mechanics

- 每位玩家本地最多保存 12 张海报作品，公共墙显示 24 张，按 `createdAt` 倒序；公共墙必须 flatten 最近用户存档中的全部 `posters`，不得只取 `posters[0]`。
- 制作冷却为 12 小时，时间戳保存在自己的 `PosterSave.lastGeneratedAt`，不依赖平台日统计。冷却中不能触发生成。
- 点击制作后创建一次生成任务。有头像时先调用头像识别，把 `head_url` 读成文字视觉线索；最终调用生图接口时只发送 `{ prompt }`，不发送 `ref_url`。无头像时直接用用户名构造 prompt 并文生图。prompt 要求输出完整竖向矩形英文平面海报图案，不能有外部墙面背景、App UI、相框、空白边框、QR、手机、手、滑板元素或过大黑边。
- 生成 URL 返回后进入 `saving` 阶段，先用 `Image` 预加载并尽量 `decode()`，单张图最长等待 16 秒；预载后再写入本地 mirror、`persist()` 并打开详情页，避免首次详情出现空白海报。
- 保存对象 `PosterEntry` 包含 `id`、`createdAt`、`mode`、`imageUrl`、`prompt`、`hasAvatar`、`userId`、`userName`、`userAvatarUrl`、`posterTone`、`posterTemplate`。
- 详情页点赞存在当前玩家自己的 `likes` 数组中，同一玩家对同一作品只保留 1 个赞；再次点击取消。留言存在当前玩家自己的 `messages` 数组中，按作品 id 聚合，最多保存 30 条，单条最多 140 字。给非本人作品留言时触发平台通知作者，点赞不发通知。
- 公共墙 optimistic merge 当前用户本地作品，用 `entry.id` 去重，避免云端防抖写入期间看不到刚生成的作品。

## 4. Controls

- 底部制作 CTA 使用 `onPointerDown`，只有 `profileLoaded && canCraft && !generating` 时可触发。
- 公共墙在“排列”模式下可纵向滚动，海报卡片使用 `onClick`，不得使用 `onPointerDown`，避免移动端滚动时误打开详情；“叠放 / 排列”切换按钮也使用 `onClick`。
- 详情页返回按钮、作者 chip、留言作者 chip、点赞按钮、留言发送按钮使用 `onClick`；作者 chip 内部调用 `stopPropagation()`，避免触发父级关闭详情。
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
