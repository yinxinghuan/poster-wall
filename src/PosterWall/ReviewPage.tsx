import type { CSSProperties } from 'react';
import { REVIEW_POSTER_IMAGES } from './types';
import './ReviewPage.less';

const generatedSamples = [
  { src: './img/review-generated/avatar-hex.jpg', label: 'Avatar / zine' },
  { src: './img/review-generated/avatar-tokyo.jpg', label: 'Avatar / pulp flyer' },
  { src: './img/review-generated/avatar-swiss.jpg', label: 'Avatar / graphic mark' },
  { src: './img/review-generated/name-maya.jpg', label: 'Name / type system' },
];

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
        <div className="pwr-mode-title">
          <span>Poster Wall</span>
          <strong>Tonight</strong>
          <small>Wall 12 · Mine 4</small>
        </div>
        <div className="pwr-mode-switch" aria-hidden>
          <span className={mode === 'stack' ? 'is-active' : ''}>
            <i className="pwr-mode-switch__icon pwr-mode-switch__icon--stack"><b /><b /><b /></i>
            <strong>Stack</strong>
            <small>Overlap</small>
          </span>
          <span className={mode === 'grid' ? 'is-active' : ''}>
            <i className="pwr-mode-switch__icon pwr-mode-switch__icon--grid"><b /><b /><b /><b /></i>
            <strong>Grid</strong>
            <small>Order</small>
          </span>
        </div>
      </header>
      <div className="pwr-mode__deck" aria-hidden>
        {Array.from({ length: 10 }, (_, index) => <MiniPoster key={index} index={index} />)}
      </div>
      <footer>
        <span>{mode === 'stack' ? 'Latest poster sits in front' : 'Scrollable two-column wall'}</span>
        <button>{mode === 'stack' ? 'Stack' : 'Grid'}</button>
      </footer>
    </div>
  );
}

function RitualCard() {
  return (
    <section className="pwr-ritual-card">
      <div className="pwr-ritual-card__top">
        <span className="pwr-avatar">A</span>
        <div>
          <strong>Make poster</strong>
          <small>Avatar traits become poster language</small>
        </div>
      </div>
      <button type="button">Make poster <span>→</span></button>
      <div className="pwr-ritual-card__locked">
        <span>Next print window</span>
        <strong>11h 59m</strong>
        <small>One poster every 12 hours keeps the wall ceremonial.</small>
      </div>
    </section>
  );
}

function DetailReview() {
  return (
    <section className="pwr-detail-card">
      <button type="button">← Back</button>
      <MiniPoster index={4} />
      <footer>
        <div className="pwr-detail-card__author">
          <span className="pwr-avatar">G</span>
          <div>
            <small>Avatar poster</small>
            <strong>goldie_with_a_very_long_name</strong>
          </div>
        </div>
        <div className="pwr-detail-card__actions">
          <button type="button">♡ 8</button>
          <span>2 notes</span>
        </div>
        <p>No notes yet. Leave the first mark on this poster.</p>
        <label>
          <span>Leave a note for goldie</span>
          <em>Send</em>
        </label>
      </footer>
    </section>
  );
}

export default function ReviewPage() {
  return (
    <main className="pwr-page pwr-final">
      <section className="pwr-final-hero">
        <div className="pwr-final-copy">
          <span className="pwr-kicker">Final review</span>
          <h1>Poster Wall</h1>
          <p>
            A social poster game where each player turns their avatar, or their name when no avatar exists,
            into a flat gig-poster identity. The wall stays minimal; the posters do the shouting.
          </p>
          <div className="pwr-legend">
            <span>12h ritual lock</span>
            <span>Like + notes</span>
            <span>Avatar as identity source</span>
            <span>Pure poster artwork only</span>
          </div>
          <div className="pwr-links">
            <a href="?play=1">Open live game view</a>
            <a href="https://github.com/yinxinghuan/poster-wall/archive/refs/heads/master.zip">Migration zip</a>
          </div>
        </div>
        <div className="pwr-final-phone">
          <ModePreview mode="stack" />
        </div>
      </section>

      <section className="pwr-final-layout">
        <header>
          <span className="pwr-kicker">Wall modes</span>
          <h2>One wall, two readings.</h2>
          <p>
            Stack compresses the latest posters into a single ceremonial pile. Grid becomes a normal scrollable
            list for browsing, without changing the poster artwork.
          </p>
        </header>
        <div className="pwr-final-layout__modes">
          <ModePreview mode="stack" />
          <ModePreview mode="grid" />
        </div>
      </section>

      <section className="pwr-final-mechanics">
        <div>
          <span className="pwr-kicker">Ritual</span>
          <h2>Making has a pause.</h2>
          <p>
            After one poster is made, the button enters a 12-hour cooldown state. The lock is stored on the
            player save as `lastGeneratedAt`, not on platform daily stats, so it does not get trapped across days.
          </p>
        </div>
        <RitualCard />
      </section>

      <section className="pwr-final-social">
        <div>
          <span className="pwr-kicker">Social detail</span>
          <h2>Every poster can be liked or noted.</h2>
          <p>
            Detail keeps the poster full-size and puts the author, heart count, note count, recent notes,
            and composer in one compact band. The input always says who receives the note.
          </p>
        </div>
        <DetailReview />
      </section>

      <section className="pwr-final-generated">
        <header>
          <span className="pwr-kicker">Generated direction</span>
          <h2>Flat artwork, no mockups.</h2>
          <p>
            Runtime prompts now ban frames, borders, taped corners, walls, phones, hands, photographed paper,
            and product mockups. Avatar paths also include pure graphic-design templates; no-avatar paths
            use the name as the main visual identity and avoid high-risk mockup-prone ticket grids for now.
          </p>
        </header>
        <div className="pwr-final-generated__grid">
          {generatedSamples.map(sample => (
            <figure key={sample.src}>
              <img src={sample.src} alt={sample.label} draggable={false} />
              <figcaption>{sample.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
    </main>
  );
}
