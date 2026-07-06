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
  REVIEW_POSTER_IMAGES,
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

const DEFAULT_SAVE: PosterSave = { posters: [], totalGenerated: 0 };

function nameGraphicLine(userName?: string) {
  const clean = (userName || '').replace(/[{}<>"'`]/g, '').replace(/\s+/g, ' ').trim().slice(0, 24);
  if (!clean) return 'If no usable user name is available, do not invent a name; use abstract poster typography instead.';
  return [
    `Optional user-name material: "${clean}".`,
    'Treat the name as graphic raw material, not as a plain signature: artist alias fragments, initials, cropped block letters, vertical or sideways type, ticket numbers, venue codes, set-time labels, torn headline fragments, or half-readable decorative typography.',
    'Keep name-derived typography near the center third of the poster so wall cropping still leaves traces visible.',
  ].join(' ');
}

function avatarPromptFor(userName?: string) {
  return [
    'Full-bleed vertical underground live music gig poster artwork pasted-in-the-city in spirit, using the reference avatar only as raw identity inspiration.',
    'Extract broad traits only: face silhouette, hairstyle direction, expression energy, color temperature, accessory hints, and attitude.',
    'Reinvent those traits as an original club night poster, band tour poster, festival side-stage poster, experimental live show flyer, or underground venue bill.',
    nameGraphicLine(userName),
    'Use bold show-title hierarchy, venue/date blocks, fake lineup fragments, torn-paper collage, halftone dots, screenprint registration errors, ink scuffs, photocopy grain, tape residue, serial numbers, barcodes, and rough overprint texture.',
    'The final artwork should feel like a second-generation gig poster interpretation of the person, not a pasted avatar and not a literal photo portrait.',
    'Artwork fills the entire rectangular image edge to edge, with the strongest visual mass centered.',
    'Do not preserve the exact face, do not copy the photo composition, do not paste a circular avatar, do not create a photorealistic headshot, do not make a cute caricature.',
    'Do not include app UI, mockup frame, surrounding wall background, blank margins, standalone logo, skateboard, wheels, trucks, protest placards, wanted-poster cliches, or childish styling.',
  ].join(' ');
}

function basicPromptFor(userName?: string) {
  return [
    'Full-bleed vertical underground live music gig poster artwork, raw two or three color screenprint, bold show-title fragments, fake lineup blocks, venue/date/time labels, ticket numbers, tape residue, torn paper, photocopy grain, halftone dots.',
    nameGraphicLine(userName),
    'The artwork fills the entire rectangular image edge to edge, strongest type and symbol composition centered, gritty urban paste-up wall energy around a club night or live show.',
    'Do not include app UI, mockup frame, surrounding wall background, blank margins, portrait, skateboard, wheels, trucks, or readable external brand logos.',
  ].join(' ');
}

const avatarPrompt = avatarPromptFor();
const basicPrompt = basicPromptFor();

function toneForSeed(seed: string): PosterTone {
  const tones: PosterTone[] = ['neon', 'paper', 'acid'];
  const score = Array.from(seed).reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return tones[score % tones.length];
}

function makeId() {
  if (crypto?.randomUUID) return crypto.randomUUID();
  return `poster-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function absoluteImageUrl(url: string) {
  return url.startsWith('http') ? url : new URL(url, document.baseURI).href;
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

function demoPoster(index: number): PosterEntry {
  return {
    id: `demo-poster-${index}`,
    createdAt: Date.now() - index * 90000,
    mode: index % 3 === 0 ? 'basic' : 'avatar',
    imageUrl: REVIEW_POSTER_IMAGES[index % REVIEW_POSTER_IMAGES.length],
    prompt: index % 3 === 0 ? basicPrompt : avatarPrompt,
    hasAvatar: index % 3 !== 0,
    posterTone: toneForSeed(`demo-${index}`),
    userId: `demo-${index}`,
    userName: ['Maya', 'Jun', 'Rae', 'Noor', 'Ari', 'Lux', 'Theo', 'Iris'][index % 8],
  };
}

function makeDemoWall(): WallEntry[] {
  return Array.from({ length: 12 }, (_, index) => ({
    ...demoPoster(index),
    userId: `demo-${index}`,
    userName: ['Maya', 'Jun', 'Rae', 'Noor', 'Ari', 'Lux', 'Theo', 'Iris'][index % 8],
  }));
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
      const demo = makeDemoWall().map((entry, index) => ({ ...entry, likeCount: 5 + index, commentCount: index % 3 }));
      setWall(demo);
      setMessageThreads(new Map([
        ['demo-poster-0', [{
          id: 'demo-message-0',
          target: 'demo-poster-0',
          text: '这张像被贴在凌晨两点的后巷入口。',
          ts: Date.now() - 1000 * 60 * 8,
          fromUserId: 'demo-note-0',
          userName: 'Noor',
        }]],
      ]));
      setLikeThreads(new Map([
        ['demo-poster-0', [
          { id: 'demo-like-0', target: 'demo-poster-0', ts: Date.now() - 1000 * 60 * 5, fromUserId: 'demo-note-1', userName: 'Maya' },
          { id: 'demo-like-1', target: 'demo-poster-0', ts: Date.now() - 1000 * 60 * 15, fromUserId: 'demo-note-2', userName: 'Jun' },
        ]],
      ]));
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
        userName: 'YOU',
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
    const prompt = hasAvatar ? avatarPromptFor(profile?.name) : basicPromptFor(profile?.name);
    const draftId = makeId();
    const draftCreatedAt = Date.now();
    const posterTone = toneForSeed(`${draftId}-${draftCreatedAt}`);
    try {
      const imageUrl = await gen.generate({ prompt, ...(hasAvatar ? { ref_url: profile!.head_url! } : {}) });
      setGenerationPhase('saving');
      await preloadImage(imageUrl);
      const now = Date.now();
      const poster: PosterEntry = {
        id: draftId,
        createdAt: now,
        mode: hasAvatar ? 'avatar' : 'basic',
        imageUrl,
        prompt,
        hasAvatar,
        posterTone,
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
      message.fromUserId === myUserId ? { ...message, userName: 'YOU', userAvatarUrl: profile?.head_url } : message
    ));
  }, [messageThreads, mirror?.messages, myUserId, profile?.head_url]);

  const likesFor = useCallback((entry: WallEntry | null): PosterLike[] => {
    if (!entry) return [];
    return uniqueLikesFor(entry.id, likeThreads, mirror?.likes, myUserId).map(like => (
      like.fromUserId === myUserId ? { ...like, userName: 'YOU', userAvatarUrl: profile?.head_url } : like
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
