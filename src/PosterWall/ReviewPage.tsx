import type { CSSProperties } from 'react';
import { REVIEW_POSTER_IMAGES } from './types';
import './ReviewPage.less';

const names = ['Maya', 'Jun', 'Rae', 'Noor', 'Ari', 'Lux', 'Theo', 'Iris', 'Sol'];

function posterStyle(index: number): CSSProperties {
  const row = Math.floor(index / 3);
  const rotate = [-2, 1.4, -0.7, 1.8, -1.2, 0.6][index % 6];
  return {
    '--x': `${row % 2 === 0 ? 0 : 36}px`,
    '--z': `${20 + row * 10 + index}`,
    '--rot': `${rotate}deg`,
    '--poster-img': `url(${new URL(REVIEW_POSTER_IMAGES[index % REVIEW_POSTER_IMAGES.length], document.baseURI).href})`,
  } as CSSProperties;
}

function MiniPoster({ index, large = false }: { index: number; large?: boolean }) {
  return (
    <span className={`pwr-poster ${large ? 'pwr-poster--large' : ''}`} style={posterStyle(index)}>
      <span className="pwr-poster__paper" />
      <span className="pwr-poster__tape pwr-poster__tape--a" />
      <span className="pwr-poster__tape pwr-poster__tape--b" />
    </span>
  );
}

function WallPreview({ count = 12 }: { count?: number }) {
  return (
    <div className="pwr-wall" aria-hidden>
      {Array.from({ length: count }, (_, index) => (
        <MiniPoster key={index} index={index} />
      ))}
    </div>
  );
}

function StateCard({
  title,
  caption,
  mode,
}: {
  title: string;
  caption: string;
  mode: 'avatar' | 'basic' | 'generating' | 'detail';
}) {
  return (
    <section className={`pwr-state pwr-state--${mode}`}>
      <header>
        <span>{title}</span>
        <strong>{mode === 'basic' ? 'BASIC' : mode === 'avatar' ? 'AVATAR' : mode === 'generating' ? 'PRINTING' : 'DETAIL'}</strong>
      </header>
      {mode === 'generating' ? (
        <div className="pwr-state__press">
          <span className="pwr-state__roller" />
          <span className="pwr-state__ink pwr-state__ink--one" />
          <span className="pwr-state__ink pwr-state__ink--two" />
        </div>
      ) : (
        <MiniPoster index={mode === 'basic' ? 2 : mode === 'detail' ? 5 : 0} large />
      )}
      <p>{caption}</p>
    </section>
  );
}

export default function ReviewPage() {
  return (
    <main className="pwr-page">
      <section className="pwr-hero">
        <div className="pwr-copy">
          <span className="pwr-kicker">Tonight wall review build</span>
          <h1>界面要像场馆门口，不像另一个滑板墙。</h1>
          <p>
            有头像时，头像只作为图像生成参考，被转译成地下演出海报里的艺人气质、色彩、标题和排版；
            无头像也能生成基础演出海报。真实生成图应是满版矩形图，外层纸张、胶带、墙面阴影由游戏样式完成。
          </p>
          <div className="pwr-legend">
            <span>头像 = 生成参考</span>
            <span>结果 = 满版海报图</span>
            <span>墙面 = 场馆外张贴层</span>
          </div>
          <div className="pwr-links">
            <a href="?play=1">查看真实游戏空环境</a>
            <a href="https://github.com/yinxinghuan/poster-wall/archive/refs/heads/master.zip">迁移工具 zip</a>
          </div>
        </div>

        <div className="pwr-phone" aria-label="Final game preview">
          <div className="pwr-final">
            <header>
              <span>墙上 12</span>
              <strong>TONIGHT</strong>
            </header>
            <WallPreview />
            <MiniPoster index={0} large />
            <div className="pwr-final__bar">
              <span>头像会被转译成海报图形</span>
              <button>开印今晚海报</button>
            </div>
          </div>
        </div>
      </section>

      <section className="pwr-detail-review">
        <div>
          <span className="pwr-kicker">Final detail</span>
          <h2>详情页只看完整海报和社交信息。</h2>
          <p>
            点击墙上海报进入全屏详情。图片本身可点击返回，作者头像和名字在底部展示；
            喜欢、留言和长用户名折叠都在这个页面里处理。
          </p>
          <div className="pwr-name-samples">
            {names.slice(0, 4).map(name => <span key={name}>{name}</span>)}
            <span>VeryLongPosterArtistName</span>
          </div>
        </div>
        <div className="pwr-detail-card">
          <button type="button">← 返回墙面</button>
          <MiniPoster index={4} large />
          <footer>
              <span className="pwr-avatar">G</span>
            <div>
              <small>头像高级演出海报</small>
              <strong>goldie_with_a_very_long_name</strong>
            </div>
            <em>♥ 8</em>
          </footer>
        </div>
      </section>

      <section className="pwr-generated-review">
        <header>
          <span className="pwr-kicker">Generation target</span>
          <h2>生成接口产物应该是满版矩形演出海报。</h2>
          <p>
            不要在生图里画手机界面、墙面、外框、胶带或留白，也不要把它做成普通头像写真。游戏会把矩形图贴到纸张容器里，
            所以主体要靠中间，边缘可以被轻微裁切。
          </p>
        </header>
        <div className="pwr-generated-grid">
          {REVIEW_POSTER_IMAGES.slice(0, 6).map((src, index) => (
            <figure key={src}>
              <img src={src} alt={`Generated poster sample ${index + 1}`} draggable={false} />
              <figcaption>{index % 3 === 0 ? 'BASIC' : 'AVATAR REF'}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="pwr-states">
        <StateCard
          title="01 / 有头像"
          caption="点击生成时用头像作为 ref_url，生成个性更强的演出海报，不直接贴原图。"
          mode="avatar"
        />
        <StateCard
          title="02 / 无头像"
          caption="仍可生成基础演出海报，同时提示建立头像可得到更好的效果。"
          mode="basic"
        />
        <StateCard
          title="03 / 生成中"
          caption="独立全屏印刷间承载等待过程，文案分阶段出现，隐藏图片预载时间。"
          mode="generating"
        />
        <StateCard
          title="04 / 完成详情"
          caption="完整海报、作者信息、喜欢和留言集中展示，不做正反面注解。"
          mode="detail"
        />
      </section>
    </main>
  );
}
