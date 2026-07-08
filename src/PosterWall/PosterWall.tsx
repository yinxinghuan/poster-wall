import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { FIELD_H, FIELD_W, type WallEntry } from './types';
import { usePosterWall } from './hooks/usePosterWall';
import { timeAgo, type GuestMessage } from '../shared/social/guestbook';
import { t } from './i18n';
import { playClick, playFail, playGenerate, playOpen, playSuccess, resumeAudio } from './utils/sounds';
import './PosterWall.less';

const aigramSrc = './img/aigram.svg';

function authorInitial(name?: string) {
  return (name || '?').trim().slice(0, 1).toUpperCase() || '?';
}

function asAssetUrl(url: string) {
  return url.startsWith('http') ? url : new URL(url, document.baseURI).href;
}

function posterStyle(entry: WallEntry, index: number): CSSProperties {
  return {
    '--z': `${30 - index}`,
    '--poster-img': `url(${asAssetUrl(entry.imageUrl)})`,
  } as CSSProperties;
}

function productionStep(game: ReturnType<typeof usePosterWall>) {
  if (game.generationPhase === 'reading') return 0;
  if (game.generationPhase === 'saving') return 3;
  return game.elapsedMs < 35000 ? 1 : 2;
}

function productionProgress(game: ReturnType<typeof usePosterWall>) {
  const sec = game.elapsedMs / 1000;
  const step = productionStep(game);
  if (step === 0) return Math.min(8 + sec * 4, 22);
  if (step === 1) return Math.min(24 + (sec / 35) * 20, 44);
  if (step === 2) return Math.min(48 + ((sec - 35) / 85) * 30, 78);
  return 92;
}

function productionCopyKey(game: ReturnType<typeof usePosterWall>, hasAvatar: boolean) {
  if (game.generationPhase === 'reading' && hasAvatar) return 'productionReadAvatar';
  if (game.generationPhase === 'saving') return 'productionSaving';
  return hasAvatar ? 'productionArtAvatar' : 'productionArtBasic';
}

function productionNoteKey(elapsedMs: number) {
  return `productionNote${Math.floor(elapsedMs / 9000) % 4}`;
}

function formatCooldown(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  return `${minutes}m ${String(total % 60).padStart(2, '0')}s`;
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false;
  return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
}

const productionStepKeys = ['stageRead', 'stagePrep', 'stageSpray', 'stageSeal'] as const;

function PosterCard({
  entry,
  index,
  onOpen,
}: {
  entry: WallEntry;
  index: number;
  onOpen: () => void;
}) {
  return (
    <button type="button" className={`pw-card pw-card--slot-${index % 10}`} style={posterStyle(entry, index)} onClick={onOpen}>
      <span className="pw-card__paper" />
    </button>
  );
}

function EmptyWall() {
  return (
    <div className="pw-wall-empty">
      <span>{t('emptyWallKicker')}</span>
      <strong>{t('emptyWallTitle')}</strong>
      <p>{t('emptyWallBody')}</p>
    </div>
  );
}

function CommentAvatar({ message }: { message: GuestMessage }) {
  return (
    <span className="pw-comment__avatar" aria-hidden>
      {message.userAvatarUrl ? (
        <img src={message.userAvatarUrl} alt="" draggable={false} />
      ) : (
        <span>{authorInitial(message.userName)}</span>
      )}
    </span>
  );
}

function DetailSocial({
  game,
  entry,
}: {
  game: ReturnType<typeof usePosterWall>;
  entry: WallEntry;
}) {
  const [draft, setDraft] = useState('');
  const comments = game.commentsFor(entry);
  const likes = game.likesFor(entry);
  const liked = game.hasLiked(entry);

  useEffect(() => {
    setDraft('');
  }, [entry.id]);

  function submitComment(ev: FormEvent) {
    ev.preventDefault();
    if (game.sendComment(entry, draft)) setDraft('');
  }

  const latestComments = comments.slice(-3).reverse();
  const locale = 'en-US';
  const authorName = entry.userName || (entry.isSelf ? t('self') : 'artist');

  return (
    <section className="pw-detail__social">
      <div className="pw-detail__side">
        <div className="pw-detail__identity">
          {entry.isSelf ? (
            <div className="pw-author-card pw-author-card--self">
              <span className="pw-author-card__avatar" aria-hidden>
                {entry.userAvatarUrl ? (
                  <img src={entry.userAvatarUrl} alt="" draggable={false} />
                ) : (
                  <span>{authorInitial(entry.userName || t('self'))}</span>
                )}
              </span>
              <span className="pw-author-card__name">
                <small>{entry.hasAvatar ? t('avatarBadge') : t('noAvatarBadge')}</small>
                <strong>{authorName}</strong>
              </span>
            </div>
          ) : (
            <button
              type="button"
              className="pw-author-card"
              onClick={() => game.openAuthor(entry)}
              disabled={!game.isInAigram}
              aria-label={t('openProfile', { n: entry.userName || 'artist' })}
            >
              <span className="pw-author-card__avatar" aria-hidden>
                {entry.userAvatarUrl ? (
                  <img src={entry.userAvatarUrl} alt="" draggable={false} />
                ) : (
                  <span>{authorInitial(entry.userName)}</span>
                )}
              </span>
              <span className="pw-author-card__name">
                <small>{entry.hasAvatar ? t('avatarBadge') : t('noAvatarBadge')}</small>
                <strong>{authorName}</strong>
              </span>
            </button>
          )}
        </div>

        <div className="pw-social__actions">
          <button
            type="button"
            className={`pw-like ${liked ? 'pw-like--active' : ''}`}
            onClick={() => game.toggleLike(entry)}
            aria-pressed={liked}
          >
            <span aria-hidden>{liked ? '♥' : '♡'}</span>
            {likes.length > 0 ? likes.length : t('like')}
          </button>
          <span className="pw-social__note-count">{t('commentCount', { n: comments.length })}</span>
        </div>
      </div>

      <div className="pw-detail__notes">
        <div className="pw-comments">
          {latestComments.length ? latestComments.map(message => {
            const isMine =
              message.fromUserId === String(game.telegramId || 'self') ||
              message.userName === 'YOU' ||
              message.userName === 'You';
            const author = message.userName || (isMine ? t('self') : 'artist');
            return (
              <article className="pw-comment" key={message.id}>
                {isMine ? (
                  <div className="pw-comment__author pw-comment__author--self">
                    <CommentAvatar message={message} />
                    <strong>{t('self')}</strong>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="pw-comment__author"
                    onClick={() => game.openUserProfile(message.fromUserId)}
                    disabled={!game.isInAigram}
                  >
                    <CommentAvatar message={message} />
                    <strong>{author}</strong>
                  </button>
                )}
                <p>{message.text}</p>
                <time>{timeAgo(message.ts, locale)}</time>
              </article>
            );
          }) : (
            <p className="pw-comments__empty">{t('noComments')}</p>
          )}
        </div>

        <form className="pw-comment-form" onSubmit={submitComment}>
          <input
            value={draft}
            onChange={ev => setDraft(ev.target.value)}
            maxLength={140}
            placeholder={t('commentPlaceholder', { n: authorName })}
          />
          <button type="submit" disabled={!draft.trim()}>{t('sendComment')}</button>
        </form>
      </div>
    </section>
  );
}

export default function PosterWall() {
  const game = usePosterWall();
  const [viewMode, setViewMode] = useState<'stack' | 'grid'>('stack');
  const hasAvatar = !!game.profile?.head_url;
  const activeProductionStep = productionStep(game);
  const visibleEntries = game.wall.slice(0, 10);

  useEffect(() => {
    const onKey = (ev: KeyboardEvent) => {
      if (isTypingTarget(ev.target)) return;
      if (ev.key === 'Escape') {
        game.setSelected(null);
        return;
      }
      if (ev.key !== ' ' && ev.key !== 'Enter') return;
      ev.preventDefault();
      handleGenerate();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  async function handleGenerate() {
    if (game.generating || !game.profileLoaded || !game.canCraft) return;
    resumeAudio();
    playClick();
    playGenerate();
    try {
      await game.generatePoster();
      playSuccess();
    } catch {
      playFail();
    }
  }

  function openEntry(entry: WallEntry) {
    playOpen();
    game.setSelected(entry);
  }

  return (
    <main className={`pw-shell pw-shell--${viewMode}`}>
      <section
        className="pw-stage"
        style={{
          width: FIELD_W,
          height: FIELD_H,
          transform: `scale(${game.scale})`,
        }}
      >
        <header className="pw-header">
          <div className="pw-header__copy">
            <span className="pw-kicker">Poster Wall</span>
            <h1>{t('title')}</h1>
            <p>{t('wallStats', { n: `${game.wall.length} / ${game.mine.length}` })}</p>
          </div>
          <div className="pw-view-toggle" aria-label={t('viewMode')}>
            <button
              type="button"
              className={viewMode === 'stack' ? 'is-active' : ''}
              onClick={() => setViewMode('stack')}
            >
              <span className="pw-view-toggle__icon pw-view-toggle__icon--stack" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <span className="pw-view-toggle__copy">
                <strong>{t('stackView')}</strong>
                <small>{t('stackHint')}</small>
              </span>
            </button>
            <button
              type="button"
              className={viewMode === 'grid' ? 'is-active' : ''}
              onClick={() => setViewMode('grid')}
            >
              <span className="pw-view-toggle__icon pw-view-toggle__icon--grid" aria-hidden>
                <i />
                <i />
                <i />
                <i />
              </span>
              <span className="pw-view-toggle__copy">
                <strong>{t('gridView')}</strong>
                <small>{t('gridHint')}</small>
              </span>
            </button>
          </div>
        </header>

        <section className={`pw-wall pw-wall--${viewMode}`} aria-label={t('wall')}>
          <div className="pw-wall__deck">
            {visibleEntries.length ? (
              visibleEntries.map((entry, index) => (
                <PosterCard
                  key={entry.id}
                  entry={entry}
                  index={index}
                  onOpen={() => openEntry(entry)}
                />
              ))
            ) : (
              <EmptyWall />
            )}
          </div>
        </section>

        <section className={`pw-generator pw-generator--${game.status}`}>
          <div className="pw-generator__status">
            <span className={`pw-avatar ${hasAvatar ? 'pw-avatar--ready' : ''}`}>
              {hasAvatar ? <img src={game.profile!.head_url} alt="" draggable={false} /> : '?'}
            </span>
            <div>
              <strong>{hasAvatar ? t('avatarBadge') : t('noAvatarBadge')}</strong>
              <p>{hasAvatar ? t('avatarReadyHint') : t('profileHint')}</p>
            </div>
          </div>

          {game.generating && (
            <div className="pw-progress">
              <span />
              <p>{t(game.stageLabel as any)}</p>
            </div>
          )}

          {game.status === 'failed' && <p className="pw-error">{game.error || 'Generation failed.'}</p>}

          <button
            type="button"
            className={`pw-cta ${!game.canCraft ? 'pw-cta--cooldown' : ''}`}
            onPointerDown={handleGenerate}
            disabled={game.generating || !game.profileLoaded || !game.canCraft}
          >
            <span className="pw-cta__mark">
              {game.generating ? t('generating') : game.canCraft ? t('craftCtaTitle') : t('craftCooldownTitle')}
            </span>
            <span className="pw-cta__copy">
              {game.canCraft
                ? hasAvatar ? t('craftCtaSubAvatar') : t('craftCtaSubBasic')
                : t('craftCooldownSub', { n: formatCooldown(game.cooldownRemainingMs) })}
            </span>
            <span className="pw-cta__arrow" aria-hidden>
              {game.canCraft ? (
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M14 18l-1.4-1.4 3.6-3.6H4v-2h12.2l-3.6-3.6L14 6l6 6-6 6z" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" focusable="false">
                  <path d="M12 22a9.77 9.77 0 0 1-3.9-.79 10.1 10.1 0 0 1-3.18-2.13 10.1 10.1 0 0 1-2.13-3.18A9.77 9.77 0 0 1 2 12a9.77 9.77 0 0 1 .79-3.9 10.1 10.1 0 0 1 2.13-3.18A10.1 10.1 0 0 1 8.1 2.79 9.77 9.77 0 0 1 12 2a9.77 9.77 0 0 1 3.9.79 10.1 10.1 0 0 1 3.18 2.13 10.1 10.1 0 0 1 2.13 3.18A9.77 9.77 0 0 1 22 12a9.77 9.77 0 0 1-.79 3.9 10.1 10.1 0 0 1-2.13 3.18 10.1 10.1 0 0 1-3.18 2.13A9.77 9.77 0 0 1 12 22Zm0-2a7.72 7.72 0 0 0 5.66-2.34A7.72 7.72 0 0 0 20 12a7.72 7.72 0 0 0-2.34-5.66A7.72 7.72 0 0 0 12 4a7.72 7.72 0 0 0-5.66 2.34A7.72 7.72 0 0 0 4 12a7.72 7.72 0 0 0 2.34 5.66A7.72 7.72 0 0 0 12 20Zm3.2-4.2L11 12.6V7h2v4.6l3.4 2.55-1.2 1.65Z" />
                </svg>
              )}
            </span>
          </button>

          {!game.isInAigram && <p className="pw-offplatform">{t('offPlatform')}</p>}
        </section>

        {game.generating && (
          <section className="pw-production" aria-live="polite">
            <div className="pw-production__bench" aria-hidden>
              <span className="pw-production__bar" />
              <span className="pw-production__dot" />
              <span className="pw-production__trace" />
            </div>

            <div className="pw-production__top">
              <span>{t('productionKicker')}</span>
              <strong>{t('productionTitle')}</strong>
              <p>{t(productionCopyKey(game, hasAvatar) as any)}</p>
            </div>

            <div className="pw-production__cue">
              <span>{t(productionStepKeys[activeProductionStep])}</span>
              <strong>{t(productionNoteKey(game.elapsedMs) as any)}</strong>
              <div className="pw-production__dots" aria-hidden>
                {productionStepKeys.map((key, index) => (
                  <i
                    key={key}
                    className={index < activeProductionStep ? 'is-done' : index === activeProductionStep ? 'is-active' : ''}
                  />
                ))}
              </div>
            </div>

            <div className="pw-production__meter">
              <span style={{ width: `${productionProgress(game)}%` }} />
            </div>
          </section>
        )}

        {game.selected && (
          <div className="pw-detail" role="dialog" aria-modal="true" onClick={() => game.setSelected(null)}>
            <div className="pw-detail__body" onClick={ev => ev.stopPropagation()}>
              <button type="button" className="pw-detail__back" onClick={() => game.setSelected(null)} aria-label={t('backToWall')}>
                <span aria-hidden>←</span>
                {t('backToWall')}
              </button>
              <button
                type="button"
                className={`pw-detail__poster pw-detail__poster--${game.selected.posterTone || 'neon'}`}
                style={posterStyle(game.selected, 0)}
                onClick={() => game.setSelected(null)}
                aria-label={t('backToWall')}
              >
                <span className="pw-detail__paper" />
              </button>
              <DetailSocial game={game} entry={game.selected} />
            </div>
          </div>
        )}

        <img className="pw-watermark" src={aigramSrc} alt="" draggable={false} />
      </section>
    </main>
  );
}
