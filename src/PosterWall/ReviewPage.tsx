import type { CSSProperties } from 'react';
import { REVIEW_POSTER_IMAGES } from './types';
import './ReviewPage.less';

const names = ['Maya', 'Jun', 'Rae', 'Noor', 'Ari', 'Lux'];

const candidates = [
  {
    id: 'gallery',
    label: 'A',
    title: 'Gallery Black',
    caption: 'Quiet black-box frame. UI behaves like museum labels and lets the poster stack carry the drama.',
    meta: 'Calmest / safest',
  },
  {
    id: 'pass',
    label: 'B',
    title: 'Backstage Pass',
    caption: 'A controlled ticket-and-pass language. Still has gig culture, but the frame stops competing with posters.',
    meta: 'Most cultural',
  },
  {
    id: 'signal',
    label: 'C',
    title: 'Night Signal',
    caption: 'A low-light venue-console feel. Small cyan signals guide interaction without turning the UI into a poster.',
    meta: 'Most digital',
  },
] as const;

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

function CandidatePhone({ candidate }: { candidate: typeof candidates[number] }) {
  return (
    <article className={`pwr-candidate pwr-candidate--${candidate.id}`}>
      <div className="pwr-candidate__phone">
        <header className="pwr-candidate__top">
          <div>
            <span>POSTER WALL</span>
            <strong>TONIGHT</strong>
            <small>WALL / MINE 12 / 4</small>
          </div>
          <nav aria-hidden>
            <b>STACK</b>
            <b>GRID</b>
          </nav>
        </header>
        <div className="pwr-candidate__deck" aria-hidden>
          {Array.from({ length: 10 }, (_, index) => <MiniPoster key={index} index={index} />)}
        </div>
        <footer className="pwr-candidate__bottom">
          <span className="pwr-candidate__avatar">?</span>
          <div>
            <strong>Basic poster</strong>
            <small>Avatar traits become poster language</small>
          </div>
          <button type="button">Make</button>
        </footer>
      </div>
      <div className="pwr-candidate__copy">
        <span>{candidate.label}</span>
        <div>
          <strong>{candidate.title}</strong>
          <small>{candidate.meta}</small>
        </div>
      </div>
      <p>{candidate.caption}</p>
    </article>
  );
}

function ModePreview({ mode }: { mode: 'stack' | 'grid' }) {
  return (
    <div className={`pwr-mode pwr-mode--${mode}`}>
      <header>
        <div className="pwr-mode-title">
          <span>POSTER WALL</span>
          <strong>TONIGHT</strong>
          <small>WALL / MINE  12 / 4</small>
        </div>
        <div className="pwr-mode-switch" aria-hidden>
          <span className={mode === 'stack' ? 'is-active' : ''}>
            <i className="pwr-mode-switch__icon pwr-mode-switch__icon--stack"><b /><b /><b /></i>
            <strong>STACK</strong>
            <small>Overlap</small>
          </span>
          <span className={mode === 'grid' ? 'is-active' : ''}>
            <i className="pwr-mode-switch__icon pwr-mode-switch__icon--grid"><b /><b /><b /><b /></i>
            <strong>GRID</strong>
            <small>Order</small>
          </span>
        </div>
      </header>
      <div className="pwr-mode__deck" aria-hidden>
        {Array.from({ length: 10 }, (_, index) => <MiniPoster key={index} index={index} />)}
      </div>
      <footer>
        <span>Avatar traits become poster language</span>
        <button>MAKE</button>
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
      <section className="pwr-choice">
        <div className="pwr-choice__intro">
          <span className="pwr-kicker">UI directions</span>
          <h1>Choose the frame, not the layout.</h1>
          <p>
            The poster wall layout stays the same. These three options only change how the surrounding interface
            carries hierarchy, controls, and the generate action.
          </p>
        </div>
        <div className="pwr-candidates">
          {candidates.map(candidate => <CandidatePhone key={candidate.id} candidate={candidate} />)}
        </div>
      </section>

      <section className="pwr-hero">
        <div className="pwr-copy">
          <span className="pwr-kicker">Flat poster system</span>
          <h1>Posters lead. Signage guides.</h1>
          <p>
            The wall has two real reading modes: a compressed one-screen stack for drama, and a quiet
            scrollable grid for browsing. The UI stays restrained so the poster work can be loud.
          </p>
          <div className="pwr-legend">
            <span>One-screen stack</span>
            <span>English only</span>
            <span>Animated Stack / Grid</span>
            <span>Flat poster prompts</span>
          </div>
          <div className="pwr-links">
            <a href="?play=1">Open live game view</a>
            <a href="https://github.com/yinxinghuan/poster-wall/archive/refs/heads/master.zip">Migration zip</a>
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
          <h2>Social actions stop shouting.</h2>
          <p>
            The poster owns the page. Likes and notes sit in one compact band: heart plus count, notes count,
            author identity, and a direct input that names who receives the note.
          </p>
          <div className="pwr-name-samples">
            {names.map(name => <span key={name}>{name}</span>)}
            <span>VeryLongPosterArtistName</span>
          </div>
        </div>
        <div className="pwr-detail-card">
          <button type="button">← BACK</button>
          <MiniPoster index={4} />
          <footer>
            <span className="pwr-avatar">G</span>
            <div>
              <small>Avatar poster</small>
              <strong>goldie_with_a_very_long_name</strong>
            </div>
            <em>♥ 8 · 2 notes</em>
          </footer>
        </div>
      </section>

      <section className="pwr-generated-review">
        <header>
          <span className="pwr-kicker">Poster direction</span>
          <h2>Generated posters should feel designed.</h2>
          <p>
            The prompt now pushes saturated color fields, huge condensed typography, cut-corner placards,
            edition codes, dates, venue labels, arrows, and names as graphic material.
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
          title="01 / Avatar"
          caption="The avatar supplies traits and attitude. The result is still original poster art."
          mode="avatar"
        />
        <StateCard
          title="02 / No avatar"
          caption="A basic poster can still be generated, with a prompt to create an avatar for a stronger result."
          mode="basic"
        />
        <StateCard
          title="03 / Making"
          caption="The waiting page stages the process while generation and image preload finish."
          mode="generating"
        />
        <StateCard
          title="04 / Detail"
          caption="Full poster, author, likes, and notes are shown together."
          mode="detail"
        />
      </section>
    </main>
  );
}
