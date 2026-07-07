import type { CSSProperties } from 'react';
import { REVIEW_POSTER_IMAGES } from './types';
import './ReviewPage.less';

const names = ['Maya', 'Jun', 'Rae', 'Noor', 'Ari', 'Lux'];

function posterStyle(index: number): CSSProperties {
  return {
    '--poster-img': `url(${new URL(REVIEW_POSTER_IMAGES[index % REVIEW_POSTER_IMAGES.length], document.baseURI).href})`,
  } as CSSProperties;
}

function MiniPoster({ index }: { index: number }) {
  return (
    <span className={`pwr-poster pwr-poster--slot-${index % 10}`} style={posterStyle(index)}>
      <span />
    </span>
  );
}

function ModePreview({ mode }: { mode: 'stack' | 'grid' }) {
  return (
    <div className={`pwr-mode pwr-mode--${mode}`}>
      <header>
        <div>
          <span>POSTER WALL</span>
          <strong>TONIGHT</strong>
          <small>墙上 / 我的  12 / 4</small>
        </div>
        <em>{mode === 'stack' ? '叠放' : '排列'}</em>
      </header>
      <div className="pwr-mode__deck" aria-hidden>
        {Array.from({ length: 10 }, (_, index) => <MiniPoster key={index} index={index} />)}
      </div>
      <footer>
        <span>头像会被转译成海报图形</span>
        <button>生成海报</button>
      </footer>
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
        <strong>{mode === 'basic' ? 'BASIC' : mode === 'avatar' ? 'AVATAR' : mode === 'generating' ? 'PROCESS' : 'DETAIL'}</strong>
      </header>
      {mode === 'generating' ? (
        <div className="pwr-state__press">
          <span className="pwr-state__bar" />
          <span className="pwr-state__block pwr-state__block--one" />
          <span className="pwr-state__block pwr-state__block--two" />
        </div>
      ) : (
        <MiniPoster index={mode === 'basic' ? 2 : mode === 'detail' ? 5 : 0} />
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
          <span className="pwr-kicker">Flat poster system</span>
          <h1>让海报成为主视觉，界面退到背景里。</h1>
          <p>
            这一版不模拟真实墙面。纯色背景承载高饱和海报，作品墙在“凌乱叠放”和“整齐排列”之间动画切换；
            UI 只保留标题、数量、视图切换、生成入口和社交信息。
          </p>
          <div className="pwr-legend">
            <span>纯色背景</span>
            <span>干净矩形海报</span>
            <span>布局切换动画</span>
            <span>克制功能区</span>
          </div>
          <div className="pwr-links">
            <a href="?play=1">查看真实游戏空环境</a>
            <a href="https://github.com/yinxinghuan/poster-wall/archive/refs/heads/master.zip">迁移工具 zip</a>
          </div>
        </div>

        <div className="pwr-previews">
          <ModePreview mode="stack" />
          <ModePreview mode="grid" />
        </div>
      </section>

      <section className="pwr-detail-review">
        <div>
          <span className="pwr-kicker">Final detail</span>
          <h2>详情页也保持展陈感。</h2>
          <p>
            完整海报占主视觉，作者、点赞、留言放在下方信息区。没有胶带、票根、墙面纹理，让社交功能清楚但不抢戏。
          </p>
          <div className="pwr-name-samples">
            {names.map(name => <span key={name}>{name}</span>)}
            <span>VeryLongPosterArtistName</span>
          </div>
        </div>
        <div className="pwr-detail-card">
          <button type="button">← 返回</button>
          <MiniPoster index={4} />
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
          <span className="pwr-kicker">Poster direction</span>
          <h2>生成图要更像平面设计海报。</h2>
          <p>
            后续 prompt 会重点强化大色块、粗黑字、编号、日期、演出信息、极简图形符号，以及用户名作为字形装饰。
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
          caption="头像只提供特征和气质，最后仍是一张原创平面海报。"
          mode="avatar"
        />
        <StateCard
          title="02 / 无头像"
          caption="仍可生成基础海报，同时提示建立头像获得更个人化结果。"
          mode="basic"
        />
        <StateCard
          title="03 / 生成中"
          caption="等待页简洁展示当前工序，隐藏图片生成和预载的空白时间。"
          mode="generating"
        />
        <StateCard
          title="04 / 完成详情"
          caption="完整海报、作者信息、喜欢和留言集中展示。"
          mode="detail"
        />
      </section>
    </main>
  );
}
