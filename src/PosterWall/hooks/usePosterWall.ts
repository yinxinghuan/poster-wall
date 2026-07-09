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

function nameGraphicLine(userName?: string) {
  const clean = (userName || 'YOU').replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'YOU';
  const displayName = clean.toUpperCase();
  const initials = clean
    .split(/\s+/)
    .map(part => part[0])
    .join('')
    .slice(0, 4)
    .toUpperCase() || displayName.slice(0, 4);
  const exactName = displayName.length > 18 ? displayName.slice(0, 18).trim() : displayName;
  return [
    `Required user-name material: "${clean}".`,
    `Mandatory exact-name text: the poster must contain one readable instance of "${exactName}" spelled exactly, preferably as the performer name, show title, or vertical title spine.`,
    `Do not satisfy the name requirement with initials only, lookalike random letters, misspelled variants, or fake words. Initials "${initials}" may appear only as secondary ornament.`,
    `Readable text tokens may include "${exactName}", "${exactName} LIVE", "${exactName} 22:00", "${initials} ROOM", "ROOM 05", "FRI 22", "SIDE A", and "EDITION 07".`,
    'Treat the name as graphic raw material, never as a plain signature: oversized cropped letters, initials, sideways type, venue arrows, edition numbers, access-code labels, show-title fragments, or half-readable decorative typography.',
    'The exact readable name can be integrated into a major composition mass, but one instance must remain legible while other name-derived letters may be cropped by the canvas edge, rotated vertically, or colliding with a date or venue block.',
    'Keep name-derived typography in the center third of the poster so the stacked wall view still shows a recognizable trace.',
  ].join(' ');
}

type PosterPromptMode = 'avatar' | 'username';

interface PosterPromptTemplate {
  id: string;
  mode: PosterPromptMode | 'both';
  tone: PosterTone;
  concept: string;
  layout: string;
  palette: string[];
  typography: string[];
  identity: string;
  refAsset?: string;
}

const POSTER_PROMPT_BASE = [
  'Create one full-frame flat 2D vector typography artwork, like an exported Illustrator/SVG/risograph graphic design file.',
  'The entire image is only colored ink shapes, typography, symbols, portrait marks, print grain, registration texture, and flat color blocks on one digital canvas.',
  'Use the whole square output canvas as one square gig poster, showbill, or flyer artwork. Color fields and type must touch all four image edges. Do not create a smaller rectangle floating inside unused space.',
  'Use a flat orthographic front-view square composition. Do not make a photo. Only a flat graphic composition. No realistic lighting, no scene, no object, no perspective.',
  'Fill the output edge-to-edge with the design itself, using solid background color fields and internal typography instead of surrounding space.',
  'Keep all important identity marks, face cues, title mass, name-derived typography, and symbols inside the square artwork; the app displays the generated image as a square card without vertical cropping.',
  'Use high typographic tension: oversized cropped headline letters bleeding off the canvas, vertical type spines, diagonal cuts, compressed side labels, strong scale contrast, and asymmetrical negative space.',
  'Typography must drive the composition, not decorate it. Use three clear text scales: one huge cropped word or name fragment dominating about half the canvas, one medium event line or date block, and a few tiny venue/catalog notes.',
  'Avoid calm centered layouts, equal margins, evenly spaced blocks, and polite poster templates. Create pressure by making type touch edges, collide with rules, run vertically, stack tightly, or cut through color fields.',
  'The design cannot be wordless. Include visible fictional English show information such as title, venue, date, time, edition number, door note, side label, or lineup fragments.',
  'For better spelling, print only short English words and short numeric labels. Avoid long paragraphs, fake body copy, and dense unreadable microtext.',
  'Use fictional English venue and show text only. Text may be cropped, stacked, vertical, or hand-lettered, but the largest visible words should be readable.',
  'Make it feel like mature print culture: gig flyer, showbill, zine poster, venue placard, indie event poster, Swiss programme, or risograph screenprint.',
  'No app UI, no social-media story UI, no QR code, no external brand logo, no Aigram logo, no skateboard, no wheels, no wanted-poster trope, no childish cartoon.',
].join(' ');

const AVATAR_IDENTITY_RULE = [
  'Use the reference avatar image and avatar text cue only as the social identity source, not as a scene, object, photo frame, or layout reference.',
  'Reinterpret broad traits only: face silhouette, hair direction, expression energy, color temperature, accessory hints, and attitude.',
  'The avatar-derived identity is the main subject of the poster, not a small accent, background texture, or optional side note.',
  'At least three avatar-derived visual cues must visibly shape the central portrait, emblem, symbol, palette accent, or typographic rhythm.',
  'The user must be visibly present as a designed performer portrait, symbolic stage icon, personal emblem, or print-culture character integrated into the poster typography.',
  'A pure typography-only poster is invalid in avatar mode: include a visible non-photographic face, silhouette, mask, performer icon, or identity emblem derived from the avatar.',
  'Redraw the identity in flat ink, risograph, linocut, halftone, vector, or screenprint language. No photographic skin, no camera lighting, no pasted photo, no circular avatar, no selfie, no photorealistic headshot, and no cute caricature.',
  'The face or identity mark should occupy the central safe area, then be cropped, overprinted, masked by letters, or reduced into a two-color portrait symbol. It must never appear as a separate photo placed on top of the poster.',
  'Typography remains the dominant structure even in avatar mode: oversized event text and name-derived type should push across or around the portrait.',
].join(' ');

const USERNAME_IDENTITY_RULE = [
  'There is no avatar. Use the user name as the social identity source.',
  'This is a pure text-to-image generation path: no reference image, no avatar image, no physical poster mockup, and no photographed scene.',
  'Do not copy any old cached reference words such as BACK, ROOM, TONIGHT, SIDE A, LIVE, FRI, EAST STAGE, POSTER WALL, NOISE, LATE, SHIFT, ECHO, SIDE B, ROOM 14, NORTH LINE, or TYPE SHOULD FEEL TOO LARGE.',
  'Create a new typographic composition from the current user name and fictional show information; invent the main axis, crop points, color placement, and text positions.',
  'Turn the name into the main 2D graphic: large cropped letters, initials, vertical fragments, ticket-code typography, venue stamp, hand-lettered stage name, or half-readable title mass.',
  'The typographic layout should feel tense and designed: one oversized name/title element should push beyond the canvas edge, while smaller date and venue details lock around it. The largest type should feel almost too big for the poster.',
  'Generate your own fictional English show title, room label, date, time, edition number, and small venue notes as part of the poster.',
  'The name should feel integrated into the design, not placed as a plain signature.',
  'All lettering must sit directly on the flat design canvas, never on a photographed sheet, wall, signboard, or framed object.',
].join(' ');

const PROMPT_TEMPLATES: PosterPromptTemplate[] = [
  {
    id: 'hex-zine-portrait',
    mode: 'both',
    tone: 'acid',
    concept: 'underground zine night, warning signage, occult diagram marks, xerox grit, serious after-hours energy',
    layout: 'one huge cropped warning word across the middle, a vertical name spine, small astronomy diagrams, safety pictograms, condensed title fragments stacked tightly around the center',
    palette: ['acid yellow and deep black only', 'safety orange and black with dirty cream ink', 'black paper with sulfur yellow ink'],
    typography: ['rough condensed block type', 'stamped hazard labels', 'cropped all-night show codes'],
    identity: 'For avatar mode, build the poster around a central engraved performer head derived from avatar cues; warning diagrams and type must orbit, slice, or mask that head. For username mode, turn the name into a hazard-label title and warning-code fragments.',
  },
  {
    id: 'upstairs-handbill',
    mode: 'both',
    tone: 'paper',
    concept: 'local underground music and comedy flyer, art-school handbill, casual venue-night charm',
    layout: 'flat paper field, loose marker arrows, one oversized hand-lettered name block, wavy lines pressing into the title, one sitting or leaning performer silhouette, small venue metadata along the edges',
    palette: ['pastel cyan, red, cream, and black', 'soft yellow paper with red marker and black ink', 'dusty pink paper with green and black ink'],
    typography: ['hand-lettered headline', 'marker arrows', 'imperfect small event notes'],
    identity: 'For avatar mode, make the main performer silhouette inherit avatar face contour, hair rhythm, expression energy, and attitude cues; arrows and venue notes should press around that figure. For username mode, turn the name into messy stage lettering across the central third.',
  },
  {
    id: 'tokyo-pulp-flyer',
    mode: 'both',
    tone: 'neon',
    concept: 'Tokyo indie flyer meets board-game insert, snack-packaging energy, funny but mature weirdness',
    layout: 'large expressive central character or mascot-like performer interrupted by cropped package typography, dense side labels, oversized title shapes, screenprint registration texture',
    palette: ['saturated red, teal, pink, cream, and black', 'cobalt blue, hot pink, rice paper, and ink black', 'tomato red, mint green, pale blue, and black'],
    typography: ['distorted hand-painted Latin letters', 'kana-like Latin fragments', 'small fake catalog stamps'],
    identity: 'For avatar mode, derive the central face, costume attitude, and mascot-like performer energy from avatar cues, then let packaging typography wrap around or interrupt it. For username mode, make the name huge, playful, and cropped like packaging typography.',
  },
  {
    id: 'fluoro-notice-bill',
    mode: 'both',
    tone: 'neon',
    concept: 'duotone fluorescent notice bill: one colored paper stock plus one single ink color, designed so many different paper colors collide beautifully when stacked on the wall',
    layout: 'full canvas is one uninterrupted solid paper color; every printed element uses the same single ink color only: heavy invented masthead across the top, dot-and-bar registration marks, one rectangular one-ink portrait or illustration window, orderly event information below, and small one-ink stamps at the bottom edge',
    palette: ['fluorescent orange paper plus black ink only', 'fluorescent green paper plus black ink only', 'cyan paper plus black ink only', 'hot pink paper plus black ink only', 'warm butter paper plus black ink only'],
    typography: ['chunky rounded grotesk masthead with dot accents', 'typewriter-like italic subhead', 'condensed black event metadata'],
    identity: 'Strict duotone rule: exactly one background paper color and exactly one ink color. No third color, no gradients, no colored illustration, no multicolor type, no shadows, no lighting. Do not copy the real word CESURE or any real event logo. Invent a short fictional masthead. For avatar mode, the one-ink portrait or icon window is the main subject and must translate avatar hair, face contour, accessory hints, or expression energy into a personal notice-bill mark. For username mode, make the user name the secondary event title or performer line, not a signature.',
    refAsset: './img/style-ref/fluoro-notice-ref.png',
  },
  {
    id: 'subway-showbill',
    mode: 'avatar',
    tone: 'paper',
    concept: 'pure flat graphic-design showbill, neutral grotesk type, subway poster discipline, restrained but bold',
    layout: 'one saturated color field, strict vertical alignment, ticket-rule lines, date block, venue line, one simple sound-wave or arrow symbol, no illustrated scene',
    palette: ['green paper with black and cream type', 'blue paper with black and off-white type', 'warm red paper with black and pale yellow type'],
    typography: ['neutral grotesk headline', 'tight ticket metadata', 'large cropped initials'],
    identity: 'For avatar mode, reduce avatar cues into a flat two-color portrait symbol or route-sign identity mark that controls the central alignment and type cuts. For username mode, make the name the loud central typographic block.',
  },
  {
    id: 'swiss-type-system',
    mode: 'avatar',
    tone: 'paper',
    concept: 'pure Swiss graphic design concert programme, all structure, typography, spacing, and measured tension',
    layout: 'strict asymmetric grid, oversized name block, small venue metadata, thin rule lines, numbered sections, one abstract circle or slash mark, no illustration scene',
    palette: ['off-white, black, and signal red', 'pale grey, black, and cobalt blue', 'butter yellow, black, and one green accent'],
    typography: ['Helvetica-like grotesk typography', 'tight numeric programme labels', 'oversized cropped initials'],
    identity: 'For avatar mode, translate face contour and hair rhythm into one oversized flat monogram portrait mark, then lock coded metadata to that mark. For username mode, treat the name as the entire poster architecture.',
  },
  {
    id: 'color-block-program',
    mode: 'avatar',
    tone: 'neon',
    concept: 'pure square digital graphic system, bold color blocks, Bauhaus-like stage programme, no representational illustration and no physical object',
    layout: 'large overlapping rectangles and circles printed directly to the canvas edges, one diagonal rule, number column, central name or identity symbol, precise negative space',
    palette: ['red, yellow, blue, black, and cream', 'cyan, magenta, black, and white', 'emerald, orange, cream, and black'],
    typography: ['large grotesk letters locked to color blocks', 'tiny serial numbers', 'simple programme captions'],
    identity: 'For avatar mode, let face contour, hair direction, expression energy, and accessory hints determine the central abstract flat shapes, two-color emblem, and color-block geometry. For username mode, let the name break across the color blocks as a graphic object.',
  },
  {
    id: 'fashion-week-roster',
    mode: 'both',
    tone: 'neon',
    concept: 'fashion-week schedule poster translated into live-show culture, editorial and high contrast',
    layout: 'overlapping roster blocks, edition number, huge cropped date, vertical name fragments, clean grid with one disruptive symbol and tight microtype at the bottom edge',
    palette: ['electric yellow, black, and small magenta accents', 'mint green, black, and cream', 'pale lavender, black, and red'],
    typography: ['oversized compressed roster type', 'thin rule lines', 'tiny edition codes'],
    identity: 'For avatar mode, turn avatar cues into a fashion-campaign performer mark that anchors the roster blocks and date crop. For username mode, split the name into roster entries and oversized initials.',
  },
  {
    id: 'museum-comedy-label',
    mode: 'both',
    tone: 'acid',
    concept: 'comedy museum signage, backstage labels, wayfinding panels, deadpan institutional humor',
    layout: 'cut-corner sign panels, arrows, room numbers, one bold exhibit-like portrait or name plaque, one oversized cropped punchline word, strong negative space',
    palette: ['deep green, pink, black, and cream', 'red, yellow, black, and off-white', 'blue, cream, and signal red'],
    typography: ['blocky signage type', 'museum label captions', 'numbered room codes'],
    identity: 'For avatar mode, make avatar cues become the printed exhibit portrait, personal room icon, or signage mascot, not a generic face. For username mode, make the name a room label and punchline-like title.',
  },
  {
    id: 'xerox-photo-silhouette',
    mode: 'avatar',
    tone: 'paper',
    concept: 'photocopied club-night portrait poster, but redrawn as graphic print rather than photo collage',
    layout: 'large monochrome face or bust in the center, rough crop marks, handwritten lineup fragments, broad empty paper areas',
    palette: ['black ink on dirty cream with one red accent', 'blue paper with black ink and white scratches', 'salmon paper with black and cyan ink'],
    typography: ['photocopy captions', 'small handwritten schedule notes', 'cropped title stamp'],
    identity: 'Use avatar mode only: turn the avatar into a rough xerox performer portrait with recognizable hair rhythm, face contour, posture, accessory hints, and expression energy.',
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
  return pickForSeed(contrastPool.length ? contrastPool : pool, seed, mode);
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
    return 'Avatar text cue: recognition was unavailable. Use the user name as the main social identity and invent a mature flat performer mark that still feels personal, not generic.';
  }
  const caption = result.caption?.replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 160);
  const labels = cueList(result.labels, 8);
  const attributes = cueList(result.attributes, 8);
  const parts = cueList(result.parts, 8);
  return [
    'Avatar text cue from visual recognition only; do not paste or reconstruct the source photo.',
    caption ? `Caption: ${caption}.` : '',
    labels.length ? `Visual labels: ${labels.join(', ')}.` : '',
    attributes.length ? `Graphic traits: ${attributes.join(', ')}.` : '',
    parts.length ? `Useful parts: ${parts.join(', ')}.` : '',
    'Use at least three of these cues as design direction for the central silhouette, hair/shape rhythm, expression energy, color temperature, accessory hints, and stage attitude. Do not make demographic claims.',
  ].filter(Boolean).join(' ');
}

function avatarIdentityPriorityLine(userName?: string) {
  const clean = (userName || 'YOU').replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24) || 'YOU';
  return [
    'The template supplies print language only; the avatar-derived identity must decide the poster subject.',
    'Make the central identity form large enough that a viewer can tell this is a personal poster even when the wall view stacks it as a smaller square card.',
    'Reflect the avatar cues in at least two different design layers: the main portrait or emblem, the supporting symbol or illustration, the accent palette, the crop shape, or the type rhythm.',
    `The name "${clean}" must appear as part of the poster design, woven through the identity mark as cropped letters, stage-title fragments, or vertical type rather than a plain author credit.`,
    'Do not produce a generic event flyer that would look the same for another user.',
  ].join(' ');
}

function previousPosterContrastLine(previous?: PosterEntry) {
  if (!previous?.posterTemplate) {
    return 'No previous poster to avoid; create a decisive one-off composition.';
  }
  return [
    'Consecutive-poster contrast: do not make this poster feel like a sibling copy of the last saved poster.',
    `Avoid repeating the previous template family: ${previous.posterTemplate}.`,
    'Change at least four visible traits from the previous poster: template structure, background color, headline crop, portrait or symbol shape, type axis, and negative-space rhythm.',
  ].join(' ');
}

function buildPosterPrompt(mode: PosterPromptMode, userName: string | undefined, seed: string, avatarCue?: RecognizeResult | null, previousPoster?: PosterEntry) {
  const template = promptTemplateFor(mode, seed, previousPoster?.posterTemplate);
  const palette = pickForSeed(template.palette, seed, 'palette');
  const type = pickForSeed(template.typography, seed, 'type');
  const identityRule = mode === 'avatar' ? AVATAR_IDENTITY_RULE : USERNAME_IDENTITY_RULE;
  const prompt = [
    POSTER_PROMPT_BASE,
    identityRule,
    mode === 'avatar' ? avatarCueLine(avatarCue) : '',
    nameGraphicLine(userName),
    `Template: ${template.concept}.`,
    `Layout: ${template.layout}.`,
    `Palette: ${palette}.`,
    `Typography: ${type}.`,
    template.identity,
    mode === 'avatar' ? avatarIdentityPriorityLine(userName) : '',
    previousPosterContrastLine(previousPoster),
    'Keep the strongest identity mark in the center vertical safe area. Make this poster look different from other templates in composition, not only in color.',
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
      return { ...entry, likeCount: likes.length, commentCount: comments.length, likedByMe: likes.some(like => like.fromUserId === myUserId) };
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
    generatePoster,
    openAuthor,
    openUserProfile,
    generating: gen.loading || status === 'generating',
  };
}
