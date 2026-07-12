import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  callAigramAPI,
  isInAigram,
  openAigramProfile,
  telegramId,
  type AigramResponse,
  useGameEvent,
  useGenImage,
  useRecognize,
  type RecognizeResult,
} from '@shared/runtime';
import { useGameSave } from '@shared/save';
import {
  appendMessage,
  guestbookNotifyConfig,
  messagesByTarget,
  newId,
  newMessage,
  threadFor,
  type GuestMessage,
} from '../../shared/social/guestbook';
import {
  FIELD_H,
  FIELD_W,
  type PosterEntry,
  type PosterLike,
  type PosterSave,
  type PosterStatus,
  type PosterTone,
  type ProfileInfo,
  type SaveRow,
  type WallEntry,
} from '../types';

const MAX_MINE = 12;
const MAX_WALL = 24;
const MAX_LIKES_STORED = 80;
const CRAFT_COOLDOWN_MS = 3 * 60 * 60 * 1000;

const DEFAULT_SAVE: PosterSave = { posters: [], totalGenerated: 0 };

function nameGraphicLine(userName?: string, templateId?: string) {
  const clean = (userName || 'YOU').replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'YOU';
  const displayName = clean.toUpperCase();
  const initials = clean
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 4)
    .toUpperCase() || displayName.slice(0, 4);
  const exactName = displayName.length > 18 ? displayName.slice(0, 18).trim() : displayName;
  if (templateId === 'swiss-type-system') {
    return `Set the exact performer name "${exactName}" once inside the small top-left information label, at the same restrained size as "LIVE · FRI 22 · 22:00".`;
  }
  if (templateId === 'xerox-photo-silhouette') {
    return `Stamp the exact performer name "${exactName}" once in the small top-right corner, directly above the same-size line "LIVE · FRI 22 · 22:00".`;
  }
  return `Print the exact performer name "${exactName}" once, clearly spelled and readable. Initials "${initials}" may appear only as a small secondary mark. The only supporting text is "LIVE · FRI 22 · 22:00".`;
}

type PosterPromptMode = 'avatar' | 'username';

interface PosterPromptTemplate {
  id: string;
  mode: PosterPromptMode | 'both';
  avatarFidelity?: 'portrait' | 'silhouette' | 'abstract';
  tone: PosterTone;
  concept: string;
  layout: string;
  palette: string[];
  typography: string[];
  identity: string;
  refAsset?: string;
}

const POSTER_PROMPT_BASE = [
  'Create one square, front-view, edge-to-edge 2D graphic artwork that fills every pixel of the canvas.',
  'The background ink field reaches all four image edges; the canvas edge itself is the artwork edge.',
  'Show only the template artwork: its performer identity, permitted lettering, ink marks, and listed graphic motifs. Every visible element must belong to that closed list.',
].join(' ');

const AVATAR_IDENTITY_RULE = [
  'Redraw the same person from the reference as the performer. Preserve face shape, hairstyle, expression, and distinctive accessories; keep eyes, nose, and mouth unobscured.',
  'Translate the person into the selected print technique while keeping the face recognizable.',
].join(' ');

const USERNAME_IDENTITY_RULE = [
  'There is no avatar. Make the current performer name the identity anchor and the only large text in this flat graphic.',
].join(' ');

const PROMPT_TEMPLATES: PosterPromptTemplate[] = [
  {
    id: 'hex-zine-portrait',
    mode: 'both',
    avatarFidelity: 'portrait',
    tone: 'acid',
    concept: 'a raw two-ink photocopied occult-zine cover with hand-cut collage energy',
    layout: 'one irregular central portrait or hand-cut name collage surrounded by tiny hand-drawn stars, arrows, stamps, and torn xerox fragments; use a loose radial composition with large areas of exposed paper',
    palette: ['acid yellow and deep black only', 'safety orange and black with dirty cream ink', 'black paper with sulfur yellow ink'],
    typography: ['rough condensed block type', 'stamped hazard labels', 'cropped all-night show codes'],
    identity: 'Allowed elements only: one hand-cut identity collage, rough stamped letters, tiny stars, arrows, ink smudges, and torn copier fragments. Use exactly two ink colors and an irregular radial arrangement.',
  },
  {
    id: 'upstairs-handbill',
    mode: 'both',
    avatarFidelity: 'portrait',
    tone: 'paper',
    concept: 'a one-night local venue handbill drawn quickly with marker, brush, and cheap one-color duplicator ink',
    layout: 'the colored paper field reaches all four canvas edges; one off-center hand-drawn performer or name, loose handwritten lines, a crooked venue stamp, and two or three small doodles float in open paper',
    palette: ['pastel cyan, red, cream, and black', 'soft yellow paper with red marker and black ink', 'dusty pink paper with green and black ink'],
    typography: ['hand-lettered headline', 'marker arrows', 'imperfect small event notes'],
    identity: 'Allowed elements only: one loose marker identity, the performer name, one crooked venue stamp, two tiny doodles, and three handwritten event tokens. Use one paper color and at most two loose ink colors; leave at least 30 percent open paper.',
  },
  {
    id: 'tokyo-pulp-flyer',
    mode: 'both',
    avatarFidelity: 'portrait',
    tone: 'neon',
    concept: 'a vivid Tokyo indie pulp flyer with a strange central performer illustration and playful snack-wrapper lettering',
    layout: 'a saturated background reaches all four canvas edges; one large expressive illustrated performer fills the center while curved wrapper ribbons, starbursts, speech-bubble shapes, and small package labels orbit the figure in an energetic asymmetric swirl',
    palette: ['saturated red, teal, pink, cream, and black', 'cobalt blue, hot pink, rice paper, and ink black', 'tomato red, mint green, pale blue, and black'],
    typography: ['distorted hand-painted Latin letters', 'kana-like Latin fragments', 'small fake catalog stamps'],
    identity: 'Allowed elements only: one central singer illustration, the exact performer name, rounded hand-painted lettering, curved wrapper ribbons, three starbursts, and two tiny fictional snack-label shapes. The singer occupies 55 percent of the canvas and the name occupies at most 16 percent of the canvas height.',
  },
  {
    id: 'fluoro-notice-bill',
    mode: 'both',
    avatarFidelity: 'portrait',
    tone: 'neon',
    concept: 'duotone fluorescent notice bill: one colored paper stock plus one single ink color, designed so many different paper colors collide beautifully when stacked on the wall',
    layout: 'full canvas is one uninterrupted solid paper color; every printed element uses the same single ink color only: heavy invented masthead across the top, dot-and-bar registration marks, one rectangular one-ink portrait or illustration window, orderly event information below, and small one-ink stamps at the bottom edge',
    palette: ['fluorescent orange paper plus black ink only', 'fluorescent green paper plus black ink only', 'cyan paper plus black ink only', 'hot pink paper plus black ink only', 'warm butter paper plus black ink only'],
    typography: ['chunky rounded grotesk masthead with dot accents', 'typewriter-like italic subhead', 'condensed black event metadata'],
    identity: 'Allowed elements only: one uninterrupted fluorescent paper field, one single ink color, one rectangular identity window, one chunky invented masthead, dot-and-bar registration marks, and three short event lines. Every printed pixel uses the same ink color; flat duotone printing defines the whole image.',
    refAsset: './img/style-ref/fluoro-notice-ref.png',
  },
  {
    id: 'subway-showbill',
    mode: 'avatar',
    avatarFidelity: 'silhouette',
    tone: 'paper',
    concept: 'a flat metropolitan route showbill with one bold silhouette and disciplined transit-sign alignment',
    layout: 'one saturated background reaches all four edges; one recognizable two-color head-and-shoulders silhouette sits on the left while three horizontal route lines, one arrow, and a compact date block align on the right',
    palette: ['green paper with black and cream type', 'blue paper with black and off-white type', 'warm red paper with black and pale yellow type'],
    typography: ['neutral grotesk headline', 'tight ticket metadata', 'large cropped initials'],
    identity: 'Allowed elements only: exactly one two-color performer silhouette, three route lines, one arrow, the exact performer name, and LIVE · FRI 22 · 22:00. The silhouette occupies 55 percent and the route information occupies the remaining narrow column.',
  },
  {
    id: 'swiss-type-system',
    mode: 'avatar',
    avatarFidelity: 'silhouette',
    tone: 'paper',
    concept: 'a restrained 1960s Swiss concert programme built from measured typography, calm spacing, and one precise geometric signal',
    layout: 'use a strict six-column grid with one small portrait or identity mark occupying at most one third; keep at least 40 percent quiet negative space, align a modest performer name, date, venue, and section numbers to thin rules',
    palette: ['off-white, black, and signal red', 'pale grey, black, and cobalt blue', 'butter yellow, black, and one green accent'],
    typography: ['restrained Helvetica-like labels', 'small tabular programme numerals', 'modest exact-name information label'],
    identity: 'Allowed elements only: exactly one identity depiction as a rectangular halftone head-and-shoulders crop, six thin rules, section numerals 01–04, and a small top-left information label. Quiet empty space occupies at least 40 percent.',
  },
  {
    id: 'color-block-program',
    mode: 'avatar',
    avatarFidelity: 'abstract',
    tone: 'neon',
    concept: 'an abstract Bauhaus stage programme that translates personal avatar traits into a geometric emblem',
    layout: 'three large overlapping geometric shapes touch the canvas edges; a single central emblem derived from hair direction and face contour sits beside one vertical number column and one thin rule',
    palette: ['red, yellow, blue, black, and cream', 'cyan, magenta, black, and white', 'emerald, orange, cream, and black'],
    typography: ['large grotesk letters locked to color blocks', 'tiny serial numbers', 'simple programme captions'],
    identity: 'Allowed elements only: three overlapping shapes, one two-color personal emblem, one thin rule, one number column 01–04, one small exact-name label, and LIVE · FRI 22 · 22:00. Geometry—not a portrait or information table—occupies 75 percent.',
  },
  {
    id: 'fashion-week-roster',
    mode: 'both',
    avatarFidelity: 'portrait',
    tone: 'neon',
    concept: 'an editorial fashion-week roster translated into a live-show programme with elegant high contrast',
    layout: 'one tall narrow identity strip occupies the left quarter; five clean horizontal roster lines step down the right side around one oversized date numeral and a small disruptive circle',
    palette: ['electric yellow, black, and small magenta accents', 'mint green, black, and cream', 'pale lavender, black, and red'],
    typography: ['oversized compressed roster type', 'thin rule lines', 'tiny edition codes'],
    identity: 'Allowed elements only: one tall identity strip, five roster lines, one oversized date numeral, one small circle, the exact performer name, and LIVE · FRI 22 · 22:00. Editorial white space separates every line; the performer name appears once as a roster heading.',
  },
  {
    id: 'museum-comedy-label',
    mode: 'both',
    avatarFidelity: 'portrait',
    tone: 'acid',
    concept: 'deadpan museum wayfinding for a fictional comedy performance, built from exhibit labels and cut-corner signs',
    layout: 'one cut-corner identity plaque sits off-center; two small directional arrows lead to three isolated room-number labels across broad quiet space',
    palette: ['deep green, pink, black, and cream', 'red, yellow, black, and off-white', 'blue, cream, and signal red'],
    typography: ['blocky signage type', 'museum label captions', 'numbered room codes'],
    identity: 'Allowed elements only: one cut-corner identity plaque, exactly two arrows, room numbers 02, 05, and 07, one tiny exhibit caption, the exact performer name, and LIVE · FRI 22 · 22:00. Quiet background occupies at least 45 percent.',
  },
  {
    id: 'xerox-photo-silhouette',
    mode: 'avatar',
    avatarFidelity: 'portrait',
    tone: 'paper',
    concept: 'a brutal two-tone photocopied club portrait made from one enlarged high-contrast face and physical xerox noise',
    layout: 'one recognizable face or bust occupies 65 to 75 percent of the canvas, cropped close on one edge; place a small stamped performer name and a single date strip in the remaining space',
    palette: ['black ink on dirty cream with one red accent', 'blue paper with black ink and white scratches', 'salmon paper with black and cyan ink'],
    typography: ['photocopy captions', 'small handwritten schedule notes', 'cropped title stamp'],
    identity: 'Use avatar mode only. Allowed elements only: exactly one identity depiction as an edge-cropped high-contrast face, rough copier dust, two crop marks, and one small top-right information stamp. Exactly one paper color plus one dark copier ink; the single face occupies 70 percent.',
  },
];

function seedScore(seed: string) {
  return Array.from(seed).reduce((score, char) => ((score << 5) - score + char.charCodeAt(0)) >>> 0, 2166136261);
}

function pickForSeed<T>(items: T[], seed: string, salt: string): T {
  return items[seedScore(`${seed}:${salt}`) % items.length];
}

function promptTemplateFor(mode: PosterPromptMode, seed: string, avoidTemplateId?: string) {
  const pool = PROMPT_TEMPLATES.filter(template => template.mode === mode || template.mode === 'both');
  const contrastPool = avoidTemplateId ? pool.filter(template => template.id !== avoidTemplateId) : pool;
  const available = contrastPool.length ? contrastPool : pool;
  if (mode !== 'avatar') return pickForSeed(available, seed, mode);
  const fidelityRoll = seedScore(`${seed}:avatar-fidelity`) % 10;
  const targetFidelity = fidelityRoll < 7 ? 'portrait' : fidelityRoll < 9 ? 'silhouette' : 'abstract';
  const fidelityPool = available.filter(template => template.avatarFidelity === targetFidelity);
  return pickForSeed(fidelityPool.length ? fidelityPool : available, seed, `${mode}:${targetFidelity}`);
}

function cueList(items: string[] | undefined, limit: number) {
  const blocked = /\b(age|young|old|male|female|woman|man|girl|boy|asian|latino|ethnicity|race)\b/i;
  return [...new Set(items || [])]
    .map(item => item.replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim())
    .filter(item => item && !blocked.test(item))
    .slice(0, limit);
}

function avatarCueLine(result?: RecognizeResult | null) {
  if (!result) {
    return 'Use the reference image as the identity authority; do not invent a replacement performer.';
  }
  const caption = result.caption?.replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const labels = cueList(result.labels, 8);
  const attributes = cueList(result.attributes, 8);
  const parts = cueList(result.parts, 8);
  return [
    caption ? `Avatar cue: ${caption}.` : '',
    labels.length ? `Visual labels: ${labels.join(', ')}.` : '',
    attributes.length ? `Graphic traits: ${attributes.join(', ')}.` : '',
    parts.length ? `Useful parts: ${parts.join(', ')}.` : '',
  ].filter(Boolean).join(' ');
}

function avatarIdentityPriorityLine(_userName?: string) {
  return `Keep the reference face recognizable at thumbnail size, with the eyes, nose, and mouth unobscured.`;
}

function previousPosterContrastLine(previous?: PosterEntry) {
  if (!previous?.posterTemplate) {
    return 'No previous poster to avoid; create a decisive one-off composition.';
  }
  return `Do not repeat the previous ${previous.posterTemplate} composition; change structure, type scale, and negative space.`;
}

export function buildPosterPrompt(mode: PosterPromptMode, userName: string | undefined, seed: string, avatarCue?: RecognizeResult | null, previousPoster?: PosterEntry, forcedTemplateId?: string) {
  const forcedTemplate = forcedTemplateId
    ? PROMPT_TEMPLATES.find(candidate => candidate.id === forcedTemplateId && (candidate.mode === mode || candidate.mode === 'both'))
    : undefined;
  const template = forcedTemplate ?? promptTemplateFor(mode, seed, previousPoster?.posterTemplate);
  const palette = pickForSeed(template.palette, seed, 'palette');
  const type = pickForSeed(template.typography, seed, 'type');
  const identityRule = mode === 'avatar' ? AVATAR_IDENTITY_RULE : USERNAME_IDENTITY_RULE;
  const prompt = [
    `Art direction: ${template.concept}.`,
    `Composition: ${template.layout}.`,
    `Color: ${palette}.`,
    `Lettering: ${type}.`,
    template.identity,
    POSTER_PROMPT_BASE,
    identityRule,
    mode === 'avatar' ? avatarCueLine(avatarCue) : '',
    nameGraphicLine(userName, template.id),
    mode === 'avatar' ? avatarIdentityPriorityLine(userName) : '',
    previousPosterContrastLine(previousPoster),
  ].filter(Boolean).join(' ');
  return { prompt, posterTone: template.tone, templateId: template.id, refAsset: template.refAsset };
}

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `poster-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function absoluteImageUrl(url: string) {
  return url.startsWith('http') ? url : new URL(url, document.baseURI).href;
}

function publicRefUrl(path?: string) {
  if (!path) return undefined;
  const url = absoluteImageUrl(path);
  if (!url.startsWith('https://')) return undefined;
  return url;
}

function preloadImage(url: string): Promise<void> {
  return new Promise(resolve => {
    const image = new Image();
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      resolve();
    };
    const timer = window.setTimeout(finish, 16000);
    image.onload = () => {
      if ('decode' in image) image.decode().then(finish).catch(finish);
      else finish();
    };
    image.onerror = finish;
    image.src = absoluteImageUrl(url);
  });
}

async function fetchProfile(userId: string): Promise<ProfileInfo | null> {
  try {
    const res = await callAigramAPI<AigramResponse<ProfileInfo>>(
      `/note/telegram/user/get/info/by/telegram_id?telegram_id=${encodeURIComponent(userId)}`,
      'GET',
    );
    return res?.data ?? null;
  } catch {
    return null;
  }
}

function stampedMessages(
  grouped: Map<string, GuestMessage[]>,
  profileMap: Map<string, ProfileInfo | null>,
): Map<string, GuestMessage[]> {
  const next = new Map<string, GuestMessage[]>();
  grouped.forEach((messages, target) => {
    next.set(target, messages.map(message => {
      const p = message.fromUserId ? profileMap.get(message.fromUserId) : null;
      return { ...message, userName: p?.name || message.userName, userAvatarUrl: p?.head_url || message.userAvatarUrl };
    }));
  });
  return next;
}

function likesByTarget(rows: SaveRow[]): Map<string, PosterLike[]> {
  const grouped = new Map<string, PosterLike[]>();
  for (const row of rows) {
    if (!row?.user_id || !row.resource_data) continue;
    let save: PosterSave;
    try {
      save = JSON.parse(row.resource_data) as PosterSave;
    } catch {
      continue;
    }
    for (const like of save.likes || []) {
      if (!like?.id || !like.target) continue;
      const stamped: PosterLike = { ...like, fromUserId: row.user_id };
      const bucket = grouped.get(like.target);
      if (bucket) bucket.push(stamped);
      else grouped.set(like.target, [stamped]);
    }
  }
  return grouped;
}

function stampedLikes(
  grouped: Map<string, PosterLike[]>,
  profileMap: Map<string, ProfileInfo | null>,
): Map<string, PosterLike[]> {
  const next = new Map<string, PosterLike[]>();
  grouped.forEach((likes, target) => {
    next.set(target, likes.map(like => {
      const p = like.fromUserId ? profileMap.get(like.fromUserId) : null;
      return { ...like, userName: p?.name || like.userName, userAvatarUrl: p?.head_url || like.userAvatarUrl };
    }));
  });
  return next;
}

function uniqueLikesFor(
  target: string,
  grouped: Map<string, PosterLike[]>,
  myLikes: PosterLike[] | undefined,
  myUserId?: string | null,
): PosterLike[] {
  const byUser = new Map<string, PosterLike>();
  const myKey = myUserId || 'self';
  const myHasLike = (myLikes || []).some(like => like.target === target);
  for (const like of grouped.get(target) || []) {
    if ((like.fromUserId || like.id) === myKey && !myHasLike) continue;
    byUser.set(like.fromUserId || like.id, like);
  }
  for (const like of myLikes || []) {
    if (like.target !== target) continue;
    byUser.set(myKey, { ...like, fromUserId: like.fromUserId ?? myKey });
  }
  return [...byUser.values()].sort((a, b) => b.ts - a.ts);
}

export function usePosterWall() {
  const { savedData, persist } = useGameSave<PosterSave>('poster-wall');
  const { trigger } = useGameEvent();
  const gen = useGenImage();
  const { recognize } = useRecognize();
  const [mirror, setMirror] = useState<PosterSave | undefined>(undefined);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [wall, setWall] = useState<WallEntry[]>([]);
  const [messageThreads, setMessageThreads] = useState<Map<string, GuestMessage[]>>(new Map());
  const [likeThreads, setLikeThreads] = useState<Map<string, PosterLike[]>>(new Map());
  const [status, setStatus] = useState<PosterStatus>('idle');
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'reading' | 'art' | 'saving'>('idle');
  const [selected, setSelected] = useState<WallEntry | null>(null);
  const [error, setError] = useState('');
  const [scale, setScale] = useState(1);
  const [nowMs, setNowMs] = useState(Date.now());
  const notifiedMessages = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (mirror === undefined && savedData !== undefined) {
      setMirror(savedData ?? DEFAULT_SAVE);
    }
  }, [savedData, mirror]);

  useEffect(() => {
    const compute = () => {
      const vv = window.visualViewport;
      const root = document.getElementById('root')?.getBoundingClientRect();
      const width = Math.max(1, Math.min(vv?.width || window.innerWidth, root?.width || window.innerWidth));
      const height = Math.max(1, Math.min(vv?.height || window.innerHeight, root?.height || window.innerHeight));
      setScale(Math.min(width / FIELD_W, height / FIELD_H));
    };
    compute();
    window.addEventListener('resize', compute);
    window.addEventListener('orientationchange', compute);
    window.visualViewport?.addEventListener('resize', compute);
    window.visualViewport?.addEventListener('scroll', compute);
    return () => {
      window.removeEventListener('resize', compute);
      window.removeEventListener('orientationchange', compute);
      window.visualViewport?.removeEventListener('resize', compute);
      window.visualViewport?.removeEventListener('scroll', compute);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isInAigram || !telegramId) {
        if (!cancelled) {
          setProfile(null);
          setProfileLoaded(true);
        }
        return;
      }
      const p = await fetchProfile(String(telegramId));
      if (!cancelled) {
        setProfile(p);
        setProfileLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const mine = mirror?.posters ?? [];
  const cooldownRemainingMs = Math.max(0, (mirror?.lastGeneratedAt || 0) + CRAFT_COOLDOWN_MS - nowMs);
  const canCraft = cooldownRemainingMs <= 0;

  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const refreshWall = useCallback(async () => {
    if (!isInAigram) {
      setWall([]);
      setMessageThreads(new Map());
      setLikeThreads(new Map());
      return;
    }
    try {
      const sessionId = (window as any).__GAME_UUID__;
      const res = await callAigramAPI<AigramResponse<SaveRow[]>>(
        `/note/aigram/ai/game/get/data/list?session_id=${encodeURIComponent(sessionId)}`,
        'GET',
      );
      const rows = Array.isArray(res?.data) ? res.data : [];
      const pairs: Array<{ userId: string; poster: PosterEntry }> = [];
      for (const row of rows) {
        if (!row.user_id || !row.resource_data) continue;
        try {
          const save = JSON.parse(row.resource_data) as PosterSave;
          for (const poster of save.posters || []) {
            if (poster?.id && poster.imageUrl) pairs.push({ userId: row.user_id, poster });
          }
        } catch {
          /* skip corrupt saves */
        }
      }
      pairs.sort((a, b) => (b.poster.createdAt || 0) - (a.poster.createdAt || 0));
      const limited = pairs.slice(0, MAX_WALL);
      const rawMessages = messagesByTarget(rows.filter((row): row is { user_id: string; resource_data: string } => !!row.user_id && !!row.resource_data));
      const rawLikes = likesByTarget(rows);
      const allInteractorIds = new Set<string>();
      rawMessages.forEach(messages => messages.forEach(message => {
        if (message.fromUserId) allInteractorIds.add(message.fromUserId);
      }));
      rawLikes.forEach(likes => likes.forEach(like => {
        if (like.fromUserId) allInteractorIds.add(like.fromUserId);
      }));
      const ids = Array.from(new Set([...limited.map(p => p.userId), ...allInteractorIds]));
      const profiles = await Promise.all(ids.map(async id => [id, await fetchProfile(id)] as const));
      const profileMap = new Map(profiles);
      const stampedMessageMap = stampedMessages(rawMessages, profileMap);
      const stampedLikeMap = stampedLikes(rawLikes, profileMap);
      setMessageThreads(stampedMessageMap);
      setLikeThreads(stampedLikeMap);
      setWall(limited.map(({ userId, poster }) => {
        const p = profileMap.get(userId);
        const comments = stampedMessageMap.get(poster.id) || [];
        const likes = uniqueLikesFor(poster.id, stampedLikeMap, mirror?.likes, telegramId ? String(telegramId) : null);
        return {
          ...poster,
          userId,
          userName: p?.name || poster.userName,
          userAvatarUrl: p?.head_url || poster.userAvatarUrl,
          likeCount: likes.length,
          commentCount: comments.length,
          likedByMe: likes.some(like => like.fromUserId === String(telegramId || 'self')),
        };
      }));
    } catch {
      setWall([]);
    }
  }, [mirror?.likes]);

  useEffect(() => {
    refreshWall().catch(() => {});
  }, [refreshWall]);

  useEffect(() => {
    if (status !== 'generating' || !startedAt) return;
    const tick = () => setElapsedMs(Date.now() - startedAt);
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [status, startedAt]);

  const mergedWall = useMemo(() => {
    const cloudIds = new Set(wall.map(item => item.id));
    const myUserId = telegramId ? String(telegramId) : 'self';
    const selfEntries: WallEntry[] = mine
      .filter(poster => !cloudIds.has(poster.id))
      .map(poster => ({
        ...poster,
        userId: 'self',
        userName: 'You',
        userAvatarUrl: profile?.head_url,
        isSelf: true,
        likeCount: uniqueLikesFor(poster.id, likeThreads, mirror?.likes, myUserId).length,
        commentCount: threadFor(poster.id, messageThreads, mirror?.messages, myUserId).length,
        likedByMe: (mirror?.likes || []).some(like => like.target === poster.id),
      }));
    const stampedWall = wall.map(entry => {
      const likes = uniqueLikesFor(entry.id, likeThreads, mirror?.likes, myUserId);
      const comments = threadFor(entry.id, messageThreads, mirror?.messages, myUserId);
      return {
        ...entry,
        isSelf: entry.userId === myUserId,
        likeCount: likes.length,
        commentCount: comments.length,
        likedByMe: likes.some(like => like.fromUserId === myUserId),
      };
    });
    return [...selfEntries, ...stampedWall].sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0)).slice(0, MAX_WALL);
  }, [likeThreads, messageThreads, mine, mirror?.likes, mirror?.messages, profile?.head_url, wall]);

  const stageLabel = useMemo(() => {
    if (status !== 'generating') return '';
    if (generationPhase === 'reading') return 'stageRead';
    if (generationPhase === 'saving') return 'stageSeal';
    const elapsed = elapsedMs;
    if (elapsed < 35000) return 'stagePrep';
    return 'stageSpray';
  }, [elapsedMs, generationPhase, status]);

  const generatePoster = useCallback(async () => {
    if (!mirror || status === 'generating' || !canCraft) return;
    setStatus('generating');
    setStartedAt(Date.now());
    setElapsedMs(0);
    setError('');
    const hasAvatar = !!profile?.head_url;
    setGenerationPhase(hasAvatar ? 'reading' : 'art');
    const draftId = makeId();
    const draftCreatedAt = Date.now();
    try {
      let avatarCue: RecognizeResult | null = null;
      if (hasAvatar) {
        try {
          avatarCue = await recognize({ image_url: profile!.head_url!, mode: 'face' });
        } catch {
          avatarCue = null;
        }
      }
      setGenerationPhase('art');
      const previousPoster = mirror.posters[0];
      const promptSpec = buildPosterPrompt(hasAvatar ? 'avatar' : 'username', profile?.name, `${draftId}-${draftCreatedAt}`, avatarCue, previousPoster);
      const styleRefUrl = publicRefUrl(promptSpec.refAsset);
      const imageRefUrl = hasAvatar && profile?.head_url ? profile.head_url : styleRefUrl;
      const imageUrl = await gen.generate(imageRefUrl ? { prompt: promptSpec.prompt, ref_url: imageRefUrl } : { prompt: promptSpec.prompt });
      setGenerationPhase('saving');
      await preloadImage(imageUrl);
      const now = Date.now();
      const poster: PosterEntry = {
        id: draftId,
        createdAt: now,
        mode: hasAvatar ? 'avatar' : 'basic',
        imageUrl,
        prompt: promptSpec.prompt,
        hasAvatar,
        posterTone: promptSpec.posterTone,
        posterTemplate: promptSpec.templateId,
        userId: telegramId || 'self',
        userName: profile?.name,
        userAvatarUrl: profile?.head_url,
      };
      const next: PosterSave = {
        ...mirror,
        posters: [poster, ...mirror.posters].slice(0, MAX_MINE),
        totalGenerated: (mirror.totalGenerated || 0) + 1,
        lastGeneratedAt: now,
      };
      setMirror(next);
      persist(next);
      setSelected({ ...poster, userId: 'self', isSelf: true });
      setStatus('complete');
      setGenerationPhase('idle');
      setTimeout(() => refreshWall().catch(() => {}), 1400);
    } catch (e) {
      setStatus('failed');
      setGenerationPhase('idle');
      setError(e instanceof Error ? e.message : String(e));
    }
  }, [canCraft, gen, mirror, persist, profile, recognize, refreshWall, status]);

  const myUserId = telegramId ? String(telegramId) : 'self';

  const commentsFor = useCallback((entry: WallEntry | null): GuestMessage[] => {
    if (!entry) return [];
    return threadFor(entry.id, messageThreads, mirror?.messages, myUserId).map(message => (
      message.fromUserId === myUserId ? { ...message, userName: 'You', userAvatarUrl: profile?.head_url } : message
    ));
  }, [messageThreads, mirror?.messages, myUserId, profile?.head_url]);

  const likesFor = useCallback((entry: WallEntry | null): PosterLike[] => {
    if (!entry) return [];
    return uniqueLikesFor(entry.id, likeThreads, mirror?.likes, myUserId).map(like => (
      like.fromUserId === myUserId ? { ...like, userName: 'You', userAvatarUrl: profile?.head_url } : like
    ));
  }, [likeThreads, mirror?.likes, myUserId, profile?.head_url]);

  const hasLiked = useCallback((entry: WallEntry | null): boolean => {
    if (!entry) return false;
    return likesFor(entry).some(like => like.fromUserId === myUserId);
  }, [likesFor, myUserId]);

  const toggleLike = useCallback((entry: WallEntry) => {
    if (!entry?.id) return;
    setMirror(prev => {
      const base = prev ?? mirror ?? DEFAULT_SAVE;
      const alreadyLiked = (base.likes || []).some(like => like.target === entry.id);
      const nextLikes = alreadyLiked
        ? (base.likes || []).filter(like => like.target !== entry.id)
        : [{ id: newId(), target: entry.id, toUserId: entry.isSelf ? undefined : entry.userId, ts: Date.now() }, ...(base.likes || [])].slice(0, MAX_LIKES_STORED);
      const next: PosterSave = { ...base, likes: nextLikes };
      persist(next);
      return next;
    });
  }, [mirror, persist]);

  const sendComment = useCallback((entry: WallEntry, text: string) => {
    if (!entry?.id) return false;
    const msg = newMessage(entry.id, entry.isSelf ? undefined : entry.userId, text);
    if (!msg) return false;
    setMirror(prev => {
      const base = prev ?? mirror ?? DEFAULT_SAVE;
      const next = appendMessage(base, msg);
      persist(next);
      return next;
    });
    if (!entry.isSelf && entry.userId && entry.userId !== myUserId && !notifiedMessages.current.has(entry.id)) {
      notifiedMessages.current.add(entry.id);
      trigger('poster_wall_note', guestbookNotifyConfig({
        toUserId: entry.userId,
        refUrl: absoluteImageUrl(entry.imageUrl),
        template: '{sender_name} left a note on your poster',
        imagePrompt: 'A gritty gig poster wall notification with torn paper, venue stickers, ticket stubs, and neon ink.',
        note: msg.text,
      }));
    }
    setTimeout(() => refreshWall().catch(() => {}), 800);
    return true;
  }, [mirror, myUserId, persist, refreshWall, trigger]);

  const deletePoster = useCallback((posterId: string) => {
    if (!posterId || !mirror?.posters.some(poster => poster.id === posterId)) return false;
    setMirror(prev => {
      const base = prev ?? mirror;
      const next: PosterSave = {
        ...base,
        posters: base.posters.filter(poster => poster.id !== posterId),
        likes: (base.likes || []).filter(like => like.target !== posterId),
        messages: (base.messages || []).filter(message => message.target !== posterId),
      };
      persist(next);
      return next;
    });
    setSelected(current => current?.id === posterId ? null : current);
    setWall(current => current.filter(entry => entry.id !== posterId));
    return true;
  }, [mirror, persist]);

  const openAuthor = useCallback((entry: WallEntry) => {
    if (!isInAigram || entry.isSelf || !entry.userId || entry.userId === 'self') return;
    openAigramProfile(entry.userId);
  }, []);

  const openUserProfile = useCallback((userId?: string) => {
    if (!isInAigram || !userId || userId === 'self' || userId === myUserId) return;
    openAigramProfile(userId);
  }, [myUserId]);

  return {
    profile,
    profileLoaded,
    isInAigram,
    telegramId,
    mine,
    wall: mergedWall,
    status,
    stageLabel,
    elapsedMs,
    generationPhase,
    canCraft,
    cooldownRemainingMs,
    selected,
    setSelected,
    error,
    scale,
    commentsFor,
    likesFor,
    hasLiked,
    toggleLike,
    sendComment,
    deletePoster,
    generatePoster,
    openAuthor,
    openUserProfile,
    generating: gen.loading || status === 'generating',
  };
}
