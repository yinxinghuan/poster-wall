import { useEffect, type CSSProperties, type ReactNode } from 'react';
import { REVIEW_POSTER_IMAGES } from './types';
import './ReviewPage.less';

const samples = [
  { src: './img/review-generated/avatar-hex.jpg', label: 'Avatar / zine portrait' },
  { src: './img/review-generated/avatar-tokyo.jpg', label: 'Avatar / street flyer' },
  { src: './img/review-generated/avatar-swiss.jpg', label: 'Avatar / graphic mark' },
  { src: './img/review-generated/username-flat-ref.jpg', label: 'Name / type system' },
];

const featuredTemplate = {
  id: 'fluoro-notice-bill',
  mode: 'duotone / username',
  src: './img/review-generated/templates/fluoro-notice-bill.jpg',
  ref: './img/style-ref/fluoro-notice-ref.png',
};

const templateSamples = [
  { id: 'hex-zine-portrait', mode: 'username', src: './img/review-generated/templates/hex-zine-portrait.jpg' },
  { id: 'upstairs-handbill', mode: 'username', src: './img/review-generated/templates/upstairs-handbill.jpg' },
  { id: 'tokyo-pulp-flyer', mode: 'username', src: './img/review-generated/templates/tokyo-pulp-flyer.jpg' },
  featuredTemplate,
  { id: 'subway-showbill', mode: 'avatar cue', src: './img/review-generated/templates/subway-showbill.jpg' },
  { id: 'swiss-type-system', mode: 'avatar cue', src: './img/review-generated/templates/swiss-type-system.jpg' },
  { id: 'color-block-program', mode: 'avatar cue', src: './img/review-generated/templates/color-block-program.jpg' },
  { id: 'fashion-week-roster', mode: 'username', src: './img/review-generated/templates/fashion-week-roster.jpg' },
  { id: 'museum-comedy-label', mode: 'username', src: './img/review-generated/templates/museum-comedy-label.jpg' },
  { id: 'xerox-photo-silhouette', mode: 'avatar cue', src: './img/review-generated/templates/xerox-photo-silhouette.jpg' },
];

const identityTests = [
  {
    id: 'portrait-hazard',
    tier: 'Portrait / hazard',
    src: './img/review-generated/identity-test/live-portrait.webp',
    verdict: 'Identity pass',
    note: 'Face, hair, eyes, headphones, and hoodie hold. The result is clearly the same person; generated lettering is noisy and the tall 2:3 output is not square.',
    status: 'warn',
  },
  {
    id: 'portrait-pulp',
    tier: 'Portrait / pulp',
    src: './img/review-generated/identity-test/live-xerox.webp',
    verdict: 'Strongest identity',
    note: 'Most legible face and strongest screenprint feel. ISAYA is fragmented and the image follows the reference portrait ratio.',
    status: 'warn',
  },
  {
    id: 'silhouette-swiss',
    tier: 'Silhouette / Swiss',
    src: './img/review-generated/identity-test/live-silhouette.webp',
    verdict: 'Identity pass',
    note: 'The face and headphones remain unmistakable, but the large ISAYA word crosses the eyes. Keep type around the face in the next prompt.',
    status: 'warn',
  },
  {
    id: 'abstract-colorblock',
    tier: 'Abstract / color block',
    src: './img/review-generated/identity-test/live-abstract.webp',
    verdict: 'Best balance',
    note: 'Color blocks stay experimental while the face, hair, headphones, hoodie, and expression remain readable. Name repeats, but does not cover the face.',
    status: 'pass',
  },
] as const;

function posterStyle(index: number): CSSProperties {
  return {
    '--poster-img': `url(${new URL(REVIEW_POSTER_IMAGES[index % REVIEW_POSTER_IMAGES.length], document.baseURI).href})`,
  } as CSSProperties;
}

function StackIcon() {
  return (
    <i className="pwr-audit-toggle__icon pwr-audit-toggle__icon--stack" aria-hidden>
      <b />
      <b />
      <b />
    </i>
  );
}

function GridIcon() {
  return (
    <i className="pwr-audit-toggle__icon pwr-audit-toggle__icon--grid" aria-hidden>
      <b />
      <b />
      <b />
      <b />
    </i>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M14 18l-1.4-1.4 3.6-3.6H4v-2h12.2l-3.6-3.6L14 6l6 6-6 6z" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden focusable="false">
      <path d="M12 22a9.77 9.77 0 0 1-3.9-.79 10.1 10.1 0 0 1-3.18-2.13 10.1 10.1 0 0 1-2.13-3.18A9.77 9.77 0 0 1 2 12a9.77 9.77 0 0 1 .79-3.9 10.1 10.1 0 0 1 2.13-3.18A10.1 10.1 0 0 1 8.1 2.79 9.77 9.77 0 0 1 12 2a9.77 9.77 0 0 1 3.9.79 10.1 10.1 0 0 1 3.18 2.13 10.1 10.1 0 0 1 2.13 3.18A9.77 9.77 0 0 1 22 12a9.77 9.77 0 0 1-.79 3.9 10.1 10.1 0 0 1-2.13 3.18 10.1 10.1 0 0 1-3.18 2.13A9.77 9.77 0 0 1 12 22Zm0-2a7.72 7.72 0 0 0 5.66-2.34A7.72 7.72 0 0 0 20 12a7.72 7.72 0 0 0-2.34-5.66A7.72 7.72 0 0 0 12 4a7.72 7.72 0 0 0-5.66 2.34A7.72 7.72 0 0 0 4 12a7.72 7.72 0 0 0 2.34 5.66A7.72 7.72 0 0 0 12 20Zm3.2-4.2L11 12.6V7h2v4.6l3.4 2.55-1.2 1.65Z" />
    </svg>
  );
}

function Poster({ index, className = '' }: { index: number; className?: string }) {
  return (
    <span className={`pwr-audit-poster pwr-audit-poster--${index % 10} ${className}`} style={posterStyle(index)}>
      <span />
    </span>
  );
}

function PhoneHeader({ mine = '2 / 2', mode = 'stack' }: { mine?: string; mode?: 'stack' | 'grid' }) {
  return (
    <header className="pwr-audit-phone__header">
      <div className="pwr-audit-title">
        <span>Poster Wall</span>
        <strong>Tonight</strong>
        <small>Wall / Mine {mine}</small>
      </div>
      <div className="pwr-audit-toggle" aria-label="Wall view">
        <span className={mode === 'stack' ? 'is-active' : ''}>
          <StackIcon />
          <strong>Stack</strong>
        </span>
        <span className={mode === 'grid' ? 'is-active' : ''}>
          <GridIcon />
          <strong>Grid</strong>
        </span>
      </div>
    </header>
  );
}

function GeneratorBar({ state }: { state: 'ready' | 'cooldown' | 'avatar' }) {
  const ready = state !== 'cooldown';
  return (
    <section className="pwr-audit-generator">
      <div className="pwr-audit-generator__status">
        <span className={`pwr-audit-avatar ${state === 'avatar' ? 'is-ready' : ''}`}>{state === 'avatar' ? 'G' : '?'}</span>
        <div>
          <strong>{state === 'avatar' ? 'Avatar poster' : 'Basic poster'}</strong>
          <p>{state === 'avatar' ? 'Avatar becomes poster language.' : 'Create an avatar to unlock a more personal poster identity.'}</p>
        </div>
      </div>
      <button className={`pwr-audit-cta ${!ready ? 'pwr-audit-cta--cooldown' : ''}`} type="button">
        <span>{ready ? 'Make poster' : 'Print room closed'}</span>
        <small>{ready ? 'Make a basic poster now; add an avatar later' : 'Next poster opens in 3h 00m'}</small>
        <i>{ready ? <ArrowIcon /> : <ClockIcon />}</i>
      </button>
      <p className="pwr-audit-preview-note">Standalone preview · profile data arrives inside Aigram.</p>
    </section>
  );
}

function WallFrame({ mode, generator = 'cooldown' }: { mode: 'stack' | 'grid'; generator?: 'ready' | 'cooldown' | 'avatar' }) {
  return (
    <div className={`pwr-audit-phone pwr-audit-phone--wall pwr-audit-phone--${mode}`}>
      <PhoneHeader mode={mode} />
      <section className="pwr-audit-wall">
        <div className="pwr-audit-wall__deck">
          {Array.from({ length: 8 }, (_, index) => <Poster key={index} index={index} />)}
        </div>
      </section>
      <GeneratorBar state={generator} />
    </div>
  );
}

function EmptyFrame() {
  return (
    <div className="pwr-audit-phone pwr-audit-phone--empty">
      <PhoneHeader mine="0 / 0" mode="stack" />
      <section className="pwr-audit-empty-wall">
        <span>No posters yet</span>
        <strong>Make the first real poster.</strong>
        <p>This wall only shows generated posters from players. No filler cards.</p>
      </section>
      <GeneratorBar state="ready" />
    </div>
  );
}

function ProductionFrame() {
  return (
    <div className="pwr-audit-phone pwr-audit-phone--production">
      <section className="pwr-audit-production">
        <div className="pwr-audit-production__bench" aria-hidden>
          <span className="pwr-audit-production__bar" />
          <span className="pwr-audit-production__dot" />
          <span className="pwr-audit-production__trace" />
        </div>
        <div className="pwr-audit-production__top">
          <span>Press room</span>
          <strong>On press</strong>
          <p>Setting name, date, and room codes.</p>
        </div>
        <div className="pwr-audit-production__cue">
          <span>Writing</span>
          <strong>Setting type. Pulling the sheet.</strong>
          <div><i /><i /><i /><i /></div>
        </div>
        <em />
      </section>
    </div>
  );
}

function DetailFrame({ variant }: { variant: 'comment' | 'empty' }) {
  return (
    <div className="pwr-audit-phone pwr-audit-phone--detail">
      <button className="pwr-audit-back" type="button"><span>←</span> Back</button>
      <section className="pwr-audit-detail">
        <aside className="pwr-audit-detail__side">
          <div className="pwr-audit-detail__identity-preview">
            <span className="pwr-audit-avatar is-large">Y</span>
            <span>
              <small>Avatar poster</small>
              <strong>You</strong>
            </span>
          </div>
          <div className="pwr-audit-detail__actions-preview">
            <button type="button">♡ {variant === 'comment' ? '1' : 'Like'}</button>
            <p>{variant === 'comment' ? '1 notes' : '0 notes'}</p>
          </div>
        </aside>
        <Poster index={0} className="pwr-audit-detail__poster" />
        <footer className="pwr-audit-detail__notes">
          {variant === 'comment' ? (
            <article>
              <span className="pwr-audit-avatar">M</span>
              <strong>Mina with an extremely long display name</strong>
              <p>This poster feels like a late show taped to a station wall.</p>
              <time>3m</time>
            </article>
          ) : (
            <p className="pwr-audit-detail__empty">No notes yet. Leave the first mark.</p>
          )}
          <label>
            <span>Leave a note for You</span>
            <em>Send</em>
          </label>
        </footer>
      </section>
    </div>
  );
}

function Section({
  kicker,
  title,
  body,
  children,
}: {
  kicker: string;
  title: string;
  body: string;
  children: ReactNode;
}) {
  return (
    <section className="pwr-audit-section">
      <header className="pwr-audit-section__head">
        <span>{kicker}</span>
        <h2>{title}</h2>
        <p>{body}</p>
      </header>
      {children}
    </section>
  );
}

export default function ReviewPage() {
  useEffect(() => {
    document.body.classList.add('pwr-review-scroll');
    return () => document.body.classList.remove('pwr-review-scroll');
  }, []);

  return (
    <main className="pwr-audit-page">
      <section className="pwr-audit-hero">
        <div>
          <span className="pwr-audit-kicker">UI Audit Board</span>
          <h1>Poster Wall</h1>
          <p>
            A complete review surface for the live game UI: wall, generator states, production flow,
            detail view, social actions, and generated poster assets.
          </p>
        </div>
        <nav>
          <a href="?play=1">Open live game</a>
          <a href="#detail">Review detail</a>
        </nav>
      </section>

      <section className="pwr-audit-contract">
        {[
          ['Typography', 'Helvetica-style grotesk, no decorative UI text, 0 letter spacing.'],
          ['Layout', 'Poster first. UI elements act as subway-style wayfinding and side notes.'],
          ['Icons', 'Filled 24px system icons. Stack/Grid share one block language.'],
          ['Social', 'Like count lives inside the button; notes stay secondary.'],
        ].map(([label, text]) => (
          <article key={label}>
            <span>{label}</span>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <Section
        kicker="Identity proof / live generation"
        title="The same person survives all four poster systems."
        body="Four sequential transit generations use one fixed reference. Identity holds across portrait, xerox, Swiss, and color-block systems; the review still flags the 2:3 output ratio and typography collisions for the next pass."
      >
        <div className="pwr-identity-proof">
          <aside className="pwr-identity-proof__reference">
            <div>
              <span>Fixed reference</span>
              <strong>ISAYA</strong>
              <p>Long blue hair · blue eyes · black headphones · subdued expression · black hoodie</p>
            </div>
            <img src="./img/review-generated/identity-test/reference-isaya.png" alt="ISAYA identity test reference" draggable={false} />
          </aside>
          <div className="pwr-identity-proof__summary">
            <article><strong>4/4</strong><span>Identity recognizable</span></article>
            <article><strong>1/4</strong><span>Clean name discipline</span></article>
            <article><strong>0/4</strong><span>Square output from tall ref</span></article>
          </div>
          <div className="pwr-identity-proof__grid">
            {identityTests.map(test => (
              <figure key={test.id} className={`is-${test.status}`}>
                <div className="pwr-identity-proof__image">
                  <img src={test.src} alt={`${test.tier} identity test output`} draggable={false} />
                  <span>{test.tier}</span>
                </div>
                <figcaption>
                  <strong>{test.verdict}</strong>
                  <p>{test.note}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </Section>

      <Section
        kicker="Wall"
        title="Stack and grid are two readings of the same wall."
        body="Stack compresses the newest posters into one high-impact pile. Grid becomes a normal browsing layout with the same poster ratio."
      >
        <div className="pwr-audit-grid pwr-audit-grid--three">
          <figure><WallFrame mode="stack" generator="cooldown" /><figcaption>Stack + cooldown</figcaption></figure>
          <figure><WallFrame mode="grid" generator="avatar" /><figcaption>Grid + avatar ready</figcaption></figure>
          <figure><EmptyFrame /><figcaption>Empty wall + primary CTA</figcaption></figure>
        </div>
      </Section>

      <Section
        kicker="Making"
        title="The wait state becomes a press-room screen."
        body="Generation has its own full-screen state, with one current instruction, print-sheet motion, and a simple progress rhythm."
      >
        <div className="pwr-audit-grid pwr-audit-grid--two">
          <figure><ProductionFrame /><figcaption>Full-screen production</figcaption></figure>
          <figure><WallFrame mode="stack" generator="ready" /><figcaption>Ready state with Material-style arrow</figcaption></figure>
        </div>
      </Section>

      <Section
        kicker="Detail"
        title="A selected poster should become larger than the wall."
        body="Detail now behaves like an exhibition view: the poster takes the upper stage, identity and actions sit on one rail, and notes stay quiet at the bottom."
      >
        <div id="detail" className="pwr-audit-grid pwr-audit-grid--two">
          <figure><DetailFrame variant="comment" /><figcaption>Detail with long name + note</figcaption></figure>
          <figure><DetailFrame variant="empty" /><figcaption>Detail with empty notes</figcaption></figure>
        </div>
      </Section>

      <Section
        kicker="Artwork"
        title="Generated posters remain the loudest element."
        body="The UI stays quiet so generated posters can carry the visual personality. These samples are used only for review and fallback demonstrations."
      >
        <div className="pwr-audit-samples">
          {samples.map(sample => (
            <figure key={sample.src}>
              <img src={sample.src} alt={sample.label} draggable={false} />
              <figcaption>{sample.label}</figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section
        kicker="Template files"
        title="Ten templates, including the new duotone notice bill."
        body="The new direction is built for overlap: a bright paper stock, one ink pass, no border, no tape, no photographed mockup."
      >
        <div className="pwr-audit-template-callout">
          <div className="pwr-audit-template-callout__copy">
            <span>New template</span>
            <h3>Colored paper. One ink.</h3>
            <p>
              This template keeps the poster flat and printable. The background paper changes color,
              while all marks, type, and illustration are printed in a single ink color.
            </p>
            <dl>
              <div>
                <dt>Best use</dt>
                <dd>Stacked wall collision and color contrast.</dd>
              </div>
              <div>
                <dt>Forbidden</dt>
                <dd>Frames, tape, wall scenes, gradients, and extra ink colors.</dd>
              </div>
            </dl>
          </div>
          <div className="pwr-audit-template-callout__images">
            <figure>
              <img src={featuredTemplate.ref} alt="Duotone notice reference sheet" draggable={false} />
              <figcaption>Reference sheet</figcaption>
            </figure>
            <figure>
              <img src={featuredTemplate.src} alt="Duotone notice generated template output" draggable={false} />
              <figcaption>Generated output</figcaption>
            </figure>
          </div>
        </div>
        <div className="pwr-audit-template-sheet">
          {templateSamples.map(sample => (
            <figure key={sample.id} className={sample.id === featuredTemplate.id ? 'is-featured' : undefined}>
              <img src={sample.src} alt={`${sample.id} template output`} draggable={false} />
              <figcaption>
                <strong>{sample.id}</strong>
                <span>{sample.mode}</span>
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>
    </main>
  );
}
