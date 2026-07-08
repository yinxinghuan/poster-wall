import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  callAigramAPI,
  isInAigram,
  openAigramProfile,
  telegramId,
  type AigramResponse,
  useGameEvent,
  useGenImage,
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
const CRAFT_COOLDOWN_MS = 12 * 60 * 60 * 1000;
const USERNAME_FORMAT_REF = './img/style-ref/flat-poster-ref.png';

const DEFAULT_SAVE: PosterSave = { posters: [], totalGenerated: 0 };

function nameGraphicLine(userName?: string) {
  const clean = (userName || '').replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!clean) return 'If no usable user name is available, do not invent a name; use abstract poster typography instead.';
  return [
    `Optional user-name material: "${clean}".`,
    'Treat the name as graphic raw material, never as a plain signature: oversized cropped letters, initials, sideways type, venue arrows, edition numbers, access-code labels, show-title fragments, or half-readable decorative typography.',
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
}

const POSTER_PROMPT_BASE = [
  'FORMAT CONTRACT: output exactly one flat 2D poster artwork image. The entire image canvas IS the poster artwork.',
  'The result must look like a direct digital print file or scanned flat graphic, not like a photo of a poster.',
  'Fill the image from edge to edge with artwork: ink fields, type, symbols, portrait marks, print grain, registration texture, and color blocks.',
  'ABSOLUTELY FORBIDDEN: room, wall, brick, tile, table, floor, hand, phone, camera, frame, mat board, binder clip, tape, sticker outside the design, hanging hardware, photographed paper, product mockup, poster mockup, realistic lighting, perspective view, drop shadow outside the artwork, blank margin, white border, black border, outer frame, inner frame, smaller poster inside a larger scene.',
  'Do not generate any real-world environment. Do not show a poster object. Do not show a sheet of paper. Do not show a framed print. Do not show the artwork being photographed.',
  'If the model is tempted to add a border, replace it with full-bleed background color and internal typography instead.',
  'Keep all important identity marks, face cues, title mass, name-derived typography, and symbols in the center vertical safe area because the UI crops the image into a 2:3 poster card.',
  'Use fictional English venue and show text only. Text can be fragmented, cropped, hand-lettered, semi-readable, or imperfect, but it must be part of the poster design.',
  'Make it feel like mature print culture: gig flyer, showbill, zine poster, venue placard, indie event poster, Swiss programme, or risograph screenprint.',
  'No app UI, no social-media story UI, no QR code, no external brand logo, no Aigram logo, no Chinese sticker marks, no skateboard, no wheels, no wanted-poster trope, no childish cartoon.',
].join(' ');

const AVATAR_IDENTITY_RULE = [
  'Use the reference avatar as the social identity source.',
  'Reinterpret broad traits only: face silhouette, hair direction, expression energy, color temperature, accessory hints, and attitude.',
  'The user must be visibly present as a designed performer portrait, symbolic stage icon, or print-culture character.',
  'Redraw the identity in flat ink, risograph, linocut, halftone, vector, or screenprint language. No photographic skin, no camera lighting, no pasted photo, no circular avatar, no selfie, no photorealistic headshot, and no cute caricature.',
].join(' ');

const USERNAME_IDENTITY_RULE = [
  'There is no avatar. Use the user name as the social identity source.',
  'A flat poster reference may be supplied only to lock the output format and typography hierarchy: full-bleed 2D poster artwork with visible event text, no photographed scene. Do not copy its exact text, colors, layout, or symbols.',
  'Turn the name into the main 2D graphic: large cropped letters, initials, vertical fragments, ticket-code typography, venue stamp, hand-lettered stage name, or half-readable title mass.',
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
    layout: 'one heavy central icon, small astronomy diagrams, safety pictograms, condensed title fragments stacked around the center',
    palette: ['acid yellow and deep black only', 'safety orange and black with dirty cream ink', 'black paper with sulfur yellow ink'],
    typography: ['rough condensed block type', 'stamped hazard labels', 'cropped all-night show codes'],
    identity: 'For avatar mode, turn the face into a central engraved performer head. For username mode, turn the name into a hazard-label title and warning-code fragments.',
  },
  {
    id: 'upstairs-handbill',
    mode: 'both',
    tone: 'paper',
    concept: 'local underground music and comedy flyer, art-school handbill, casual venue-night charm',
    layout: 'flat paper field, loose marker arrows, wavy lines, one sitting or leaning performer silhouette, small venue metadata along the edges',
    palette: ['pastel cyan, red, cream, and black', 'soft yellow paper with red marker and black ink', 'dusty pink paper with green and black ink'],
    typography: ['hand-lettered headline', 'marker arrows', 'imperfect small event notes'],
    identity: 'For avatar mode, make the performer silhouette inherit the avatar face and hair. For username mode, turn the name into messy stage lettering across the central third.',
  },
  {
    id: 'tokyo-pulp-flyer',
    mode: 'both',
    tone: 'neon',
    concept: 'Tokyo indie flyer meets board-game insert, snack-packaging energy, funny but mature weirdness',
    layout: 'large expressive central character or mascot-like performer, dense side labels, oversized title shapes, screenprint registration texture',
    palette: ['saturated red, teal, pink, cream, and black', 'cobalt blue, hot pink, rice paper, and ink black', 'tomato red, mint green, pale blue, and black'],
    typography: ['distorted hand-painted Latin letters', 'kana-like Latin fragments', 'small fake catalog stamps'],
    identity: 'For avatar mode, derive the central face from the avatar. For username mode, make the name huge, playful, and cropped like packaging typography.',
  },
  {
    id: 'subway-showbill',
    mode: 'avatar',
    tone: 'paper',
    concept: 'pure flat graphic-design showbill, neutral grotesk type, subway poster discipline, restrained but bold',
    layout: 'one saturated color field, strict vertical alignment, ticket-rule lines, date block, venue line, one simple sound-wave or arrow symbol, no illustrated scene',
    palette: ['green paper with black and cream type', 'blue paper with black and off-white type', 'warm red paper with black and pale yellow type'],
    typography: ['neutral grotesk headline', 'tight ticket metadata', 'large cropped initials'],
    identity: 'For avatar mode, reduce the avatar into a flat two-color portrait symbol or simple identity mark. For username mode, make the name the loud central typographic block.',
  },
  {
    id: 'swiss-type-system',
    mode: 'avatar',
    tone: 'paper',
    concept: 'pure Swiss graphic design concert programme, all structure, typography, spacing, and measured tension',
    layout: 'strict asymmetric grid, oversized name block, small venue metadata, thin rule lines, numbered sections, one abstract circle or slash mark, no illustration scene',
    palette: ['off-white, black, and signal red', 'pale grey, black, and cobalt blue', 'butter yellow, black, and one green accent'],
    typography: ['Helvetica-like grotesk typography', 'tight numeric programme labels', 'oversized cropped initials'],
    identity: 'For avatar mode, translate the avatar into one minimal flat monogram portrait mark plus coded metadata. For username mode, treat the name as the entire poster architecture.',
  },
  {
    id: 'color-block-program',
    mode: 'avatar',
    tone: 'neon',
    concept: 'pure square digital graphic system, bold color blocks, Bauhaus-like stage programme, no representational illustration and no physical object',
    layout: 'large overlapping rectangles and circles printed directly to the canvas edges, one diagonal rule, number column, central name or identity symbol, precise negative space',
    palette: ['red, yellow, blue, black, and cream', 'cyan, magenta, black, and white', 'emerald, orange, cream, and black'],
    typography: ['large grotesk letters locked to color blocks', 'tiny serial numbers', 'simple programme captions'],
    identity: 'For avatar mode, reduce face and hair into abstract flat shapes and a two-color emblem. For username mode, let the name break across the color blocks as a graphic object.',
  },
  {
    id: 'fashion-week-roster',
    mode: 'both',
    tone: 'neon',
    concept: 'fashion-week schedule poster translated into live-show culture, editorial and high contrast',
    layout: 'overlapping roster blocks, edition number, large date, vertical name fragments, clean grid with one disruptive symbol',
    palette: ['electric yellow, black, and small magenta accents', 'mint green, black, and cream', 'pale lavender, black, and red'],
    typography: ['oversized compressed roster type', 'thin rule lines', 'tiny edition codes'],
    identity: 'For avatar mode, turn the avatar into a fashion-campaign performer mark. For username mode, split the name into roster entries and oversized initials.',
  },
  {
    id: 'museum-comedy-label',
    mode: 'both',
    tone: 'acid',
    concept: 'comedy museum signage, backstage labels, wayfinding panels, deadpan institutional humor',
    layout: 'cut-corner sign panels, arrows, room numbers, one bold exhibit-like portrait or name plaque, strong negative space',
    palette: ['deep green, pink, black, and cream', 'red, yellow, black, and off-white', 'blue, cream, and signal red'],
    typography: ['blocky signage type', 'museum label captions', 'numbered room codes'],
    identity: 'For avatar mode, make the avatar a printed exhibit portrait. For username mode, make the name a room label and punchline-like title.',
  },
  {
    id: 'xerox-photo-silhouette',
    mode: 'avatar',
    tone: 'paper',
    concept: 'photocopied club-night portrait poster, but redrawn as graphic print rather than photo collage',
    layout: 'large monochrome face or bust in the center, rough crop marks, handwritten lineup fragments, broad empty paper areas',
    palette: ['black ink on dirty cream with one red accent', 'blue paper with black ink and white scratches', 'salmon paper with black and cyan ink'],
    typography: ['photocopy captions', 'small handwritten schedule notes', 'cropped title stamp'],
    identity: 'Use avatar mode only: turn the avatar into a rough xerox performer portrait with recognizable hair, posture, and expression energy.',
  },
];

function seedScore(seed: string) {
  return Array.from(seed).reduce((score, char) => ((score << 5) - score + char.charCodeAt(0)) >>> 0, 2166136261);
}

function pickForSeed<T>(items: T[], seed: string, salt: string): T {
  return items[seedScore(`${seed}:${salt}`) % items.length];
}

function promptTemplateFor(mode: PosterPromptMode, seed: string) {
  const pool = PROMPT_TEMPLATES.filter(template => template.mode === mode || template.mode === 'both');
  return pickForSeed(pool, seed, mode);
}

function buildPosterPrompt(mode: PosterPromptMode, userName: string | undefined, seed: string) {
  const template = promptTemplateFor(mode, seed);
  const palette = pickForSeed(template.palette, seed, 'palette');
  const type = pickForSeed(template.typography, seed, 'type');
  const identityRule = mode === 'avatar' ? AVATAR_IDENTITY_RULE : USERNAME_IDENTITY_RULE;
  const prompt = [
    POSTER_PROMPT_BASE,
    identityRule,
    nameGraphicLine(userName),
    `Template: ${template.concept}.`,
    `Layout: ${template.layout}.`,
    `Palette: ${palette}.`,
    `Typography: ${type}.`,
    template.identity,
    'Keep the strongest identity mark in the center vertical safe area. Make this poster look different from other templates in composition, not only in color.',
  ].join(' ');
  return { prompt, posterTone: template.tone, templateId: template.id };
}

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `poster-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function absoluteImageUrl(url: string) {
  return url.startsWith('http') ? url : new URL(url, document.baseURI).href;
}

function formatReferenceUrl() {
  const url = absoluteImageUrl(USERNAME_FORMAT_REF);
  if (/^https?:\/\/(localhost|127\.0\.0\.1)(:|\/)/.test(url)) return undefined;
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
  const [mirror, setMirror] = useState<PosterSave | undefined>(undefined);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [wall, setWall] = useState<WallEntry[]>([]);
  const [messageThreads, setMessageThreads] = useState<Map<string, GuestMessage[]>>(new Map());
  const [likeThreads, setLikeThreads] = useState<Map<string, PosterLike[]>>(new Map());
  const [status, setStatus] = useState<PosterStatus>('idle');
  const [startedAt, setStartedAt] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [generationPhase, setGenerationPhase] = useState<'idle' | 'art' | 'saving'>('idle');
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
    setGenerationPhase('art');
    setError('');
    const hasAvatar = !!profile?.head_url;
    const draftId = makeId();
    const draftCreatedAt = Date.now();
    const promptSpec = buildPosterPrompt(hasAvatar ? 'avatar' : 'username', profile?.name, `${draftId}-${draftCreatedAt}`);
    try {
      const refUrl = hasAvatar ? profile!.head_url! : formatReferenceUrl();
      const imageUrl = await gen.generate({ prompt: promptSpec.prompt, ...(refUrl ? { ref_url: refUrl } : {}) });
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
  }, [canCraft, gen, mirror, persist, profile, refreshWall, status]);

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
