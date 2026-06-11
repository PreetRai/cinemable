import React, { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import {
  ADVANCED_SEARCH_GENRES,
  getMovieSummaryById,
  isLikelyContentTitle,
  parseMovieYear,
  parseSearchYearRange,
  searchMoviesByQueries,
  searchMoviesWithFilters,
} from "../services/omdbApi";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";

const FALLBACK_POSTER = "https://via.placeholder.com/300x450?text=No+Poster";

const normalizePosterUrl = (poster) => {
  if (typeof poster !== "string") return FALLBACK_POSTER;
  const trimmedPoster = poster.trim();
  if (!trimmedPoster || trimmedPoster === "N/A") return FALLBACK_POSTER;

  let normalizedPoster = trimmedPoster;
  if (normalizedPoster.startsWith("http://")) {
    normalizedPoster = `https://${normalizedPoster.slice(7)}`;
  } else if (normalizedPoster.startsWith("//")) {
    normalizedPoster = `https:${normalizedPoster}`;
  }

  if (!normalizedPoster.startsWith("https://")) return FALLBACK_POSTER;
  return normalizedPoster;
};

const CompactSkeletonCard = () => (
  <div className="flex-shrink-0 w-36 md:w-44 h-52 md:h-64 rounded-lg animate-pulse bg-[#2a2a2a]" />
);

const HeroSkeleton = () => (
  <div className="w-full h-[70vh] animate-pulse bg-[#2a2a2a]" />
);

const GridSkeletonCard = () => (
  <div className="animate-pulse bg-[#2a2a2a] rounded-lg overflow-hidden">
    <div className="h-64 bg-[#353535]" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-[#353535] rounded w-3/4" />
      <div className="h-3 bg-[#353535] rounded w-1/2" />
    </div>
  </div>
);

const ShelfRow = ({
  shelfKey,
  label,
  movies,
  loading,
  updatedAt,
  onOpenDetails,
  onPlay,
  onNotInterested,
}) => {
  const rowRef = useRef(null);
  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir === "left" ? -480 : 480, behavior: "smooth" });
    }
  };
  const updatedHoursAgo =
    typeof updatedAt === "number"
      ? Math.max(0, Math.floor((Date.now() - updatedAt) / (1000 * 60 * 60)))
      : null;

  return (
    <section className="mb-10">
      <div className="mb-3 px-4 md:px-8">
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">{label}</h2>
        {!loading && updatedHoursAgo !== null && (
          <p className="text-xs text-gray-500 mt-1">Updated {updatedHoursAgo}h ago</p>
        )}
      </div>
      <div className="relative group/shelf">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 md:w-14 flex items-center justify-center bg-gradient-to-r from-[#141414] to-transparent opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-200"
          aria-label="Scroll left"
        >
          <span className="text-white text-2xl font-bold">&#8249;</span>
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 md:w-14 flex items-center justify-center bg-gradient-to-l from-[#141414] to-transparent opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-200"
          aria-label="Scroll right"
        >
          <span className="text-white text-2xl font-bold">&#8250;</span>
        </button>
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <CompactSkeletonCard key={i} />)
            : movies.map((movie) => (
                <MovieCard
                  key={movie.imdbID}
                  movie={movie}
                  compact
                  showNotInterested
                  onOpenDetails={() => onOpenDetails?.(movie, shelfKey)}
                  onPlay={() => onPlay?.(movie, shelfKey)}
                  onNotInterested={() => onNotInterested?.(movie, shelfKey)}
                />
              ))}
        </div>
      </div>
    </section>
  );
};

const HeroBanner = ({
  movies,
  activeIndex,
  onNext,
  onPrev,
  onGoTo,
  onOpenDetails,
  onPause,
  onResume,
}) => {
  const navigate = useNavigate();
  const activeMovie = safeArray(movies)[activeIndex] || null;
  if (!activeMovie) return <HeroSkeleton />;

  const poster = normalizePosterUrl(activeMovie?.Poster);
  const showControls = safeArray(movies).length > 1;

  return (
    <div
      className="relative w-full h-[70vh] overflow-hidden group/hero"
      onMouseEnter={onPause}
      onMouseLeave={onResume}
    >
      <img
        src={poster}
        alt={activeMovie.Title}
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-40"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_POSTER;
        }}
      />
      <img
        src={poster}
        alt={activeMovie.Title}
        className="absolute inset-0 w-full h-full object-contain"
        onError={(e) => {
          e.currentTarget.onerror = null;
          e.currentTarget.src = FALLBACK_POSTER;
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
      <div className="absolute bottom-16 left-6 md:left-12 max-w-lg">
        <div className="flex flex-wrap gap-2 mb-3">
          <span className="inline-block bg-[#e50914] text-white text-xs font-bold uppercase tracking-widest px-2 py-1 rounded">
            {activeMovie.Type || "movie"}
          </span>
          {(activeMovie.feedBadges || []).slice(0, 2).map((badge) => (
            <span
              key={badge.type + badge.label}
              className={
                "inline-block text-xs font-semibold px-2 py-1 rounded border " +
                (badge.type === "new"
                  ? "bg-emerald-600/25 border-emerald-400/40 text-emerald-200"
                  : badge.type === "group_pick"
                  ? "bg-[#e50914]/20 border-[#e50914]/45 text-[#ffd3d6]"
                  : "bg-white/10 border-white/20 text-white")
              }
            >
              {badge.label}
            </span>
          ))}
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-tight drop-shadow-lg">
          {activeMovie.Title}
        </h1>
        <p className="text-gray-300 text-sm mb-5">{activeMovie.Year}</p>
        <button
          onClick={() => {
            onOpenDetails?.(activeMovie);
            navigate("/movie/" + activeMovie.imdbID);
          }}
          className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
        >
          View Details
        </button>
      </div>

      {showControls && (
        <>
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous hero movie"
            className="absolute left-3 md:left-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/50 text-white text-2xl leading-none flex items-center justify-center opacity-100 md:opacity-0 md:group-hover/hero:opacity-100 transition-opacity"
          >
            <span aria-hidden="true">&#8249;</span>
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next hero movie"
            className="absolute right-3 md:right-6 top-1/2 -translate-y-1/2 z-20 h-10 w-10 rounded-full bg-black/50 text-white text-2xl leading-none flex items-center justify-center opacity-100 md:opacity-0 md:group-hover/hero:opacity-100 transition-opacity"
          >
            <span aria-hidden="true">&#8250;</span>
          </button>
          <div className="absolute bottom-6 right-6 z-20 flex items-center gap-2">
            {safeArray(movies).map((movie, index) => (
              <button
                key={movie.imdbID}
                type="button"
                aria-label={`Go to hero movie ${index + 1}`}
                onClick={() => onGoTo?.(index)}
                className={
                  "h-2.5 rounded-full transition-all " +
                  (index === activeIndex
                    ? "w-6 bg-white"
                    : "w-2.5 bg-white/55 hover:bg-white/75")
                }
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const SHELF_CATEGORIES = [
  {
    key: "latest",
    label: "Latest Releases",
    queries: ["movie", "series", "cinema"],
    ttlHours: 6,
  },
  {
    key: "action",
    label: "Action",
    queries: ["action", "adventure", "mission"],
    ttlHours: 24,
  },
  {
    key: "marvel",
    label: "Marvel Universe",
    queries: ["marvel", "avengers", "x-men"],
    ttlHours: 24,
  },
  {
    key: "thriller",
    label: "Thriller",
    queries: ["thriller", "mystery", "crime"],
    ttlHours: 24,
  },
  {
    key: "animated",
    label: "Animation",
    queries: ["animated", "pixar", "anime"],
    ttlHours: 24,
  },
];

const OPTIONAL_SHELVES = [
  { key: "because_you_like", label: "Because You Like" },
  { key: "from_groups", label: "From Your Groups" },
];

const DISPLAY_SHELVES = [
  { key: "latest", label: "Latest Releases" },
  ...OPTIONAL_SHELVES,
  ...SHELF_CATEGORIES.filter((shelf) => shelf.key !== "latest").map((shelf) => ({
    key: shelf.key,
    label: shelf.label,
  })),
];

const HOME_CACHE_KEY = "cinemable.homeFeed.v2";
const ENGAGEMENT_CACHE_KEY = "cinemable.homeEngagement.v1";
const HIDDEN_MOVIES_CACHE_KEY = "cinemable.hiddenMovieIds.v1";
const SHELF_ORDER_CACHE_KEY = "cinemable.shelfOrder.v1";
const STALE_FALLBACK_HOURS = 72;
const SHELF_TARGET_SIZE = 18;
const SOCIAL_DETAIL_FETCH_LIMIT = 6;
const PERSONALIZED_QUERY_LIMIT = 6;
const ORDER_PERSIST_HOURS = 24;
const MAX_FRANCHISE_ITEMS = 2;
const HERO_POOL_LIMIT = 10;
const HERO_ROTATE_INTERVAL_MS = 5000;

const GENRE_QUERY_MAP = {
  Action: ["action", "adventure", "mission"],
  Comedy: ["comedy", "funny", "buddy"],
  Drama: ["drama", "character", "family"],
  Thriller: ["thriller", "mystery", "crime"],
  "Sci-Fi": ["sci-fi", "space", "future"],
  Animation: ["animated", "pixar", "anime"],
  Romance: ["romance", "love", "heart"],
  Horror: ["horror", "haunted", "supernatural"],
  Documentary: ["documentary", "true story", "biography"],
};

const DIVERSIFIED_DEFAULT_QUERIES = [
  "award winning",
  "underrated",
  "mind bending",
  "feel good",
  "epic adventure",
];

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "movie",
  "series",
  "season",
  "part",
  "episode",
  "story",
]);

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const hasTokenMatch = (title, token) => {
  if (!title || !token) return false;
  const regex = new RegExp(`\\b${escapeRegExp(token.toLowerCase())}\\b`, "i");
  return regex.test(title.toLowerCase());
};

const rankCandidate = (movie, matchedQueries, currentYear, shelfKey) => {
  const year = parseMovieYear(movie.Year);
  const freshness = year ? Math.max(0, 30 - Math.max(0, currentYear - year)) : 0;
  const queryConfidence = matchedQueries.some((query) => hasTokenMatch(movie.Title || "", query))
    ? 12
    : 0;
  const appearanceBoost = matchedQueries.length * 6;
  let latestBonus = 0;
  if (shelfKey === "latest" && year) {
    if (year >= currentYear - 1) latestBonus = 10;
    else if (year === currentYear - 2) latestBonus = 5;
  }
  return freshness + queryConfidence + appearanceBoost + latestBonus;
};

const isValidShelfMovie = (movie) => {
  if (!movie?.imdbID) return false;
  if (movie.Poster === "N/A") return false;
  if (!isLikelyContentTitle(movie.Title)) return false;
  return true;
};

const getHours = (ms) => ms / (1000 * 60 * 60);

const getDayBucket = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const hashValue = (input) => {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) % 2147483647;
  }
  return Math.abs(hash);
};

const rotateQueriesForDay = (queries, shelfKey, dayBucket) => {
  if (!Array.isArray(queries) || queries.length <= 1) return queries || [];
  const offset = hashValue(`${shelfKey}:${dayBucket}`) % queries.length;
  return [...queries.slice(offset), ...queries.slice(0, offset)];
};

const normalizePreferenceType = (value) => {
  if (value === "movie" || value === "series") return value;
  return undefined;
};

const safeArray = (value) => (Array.isArray(value) ? value : []);

const titleToTokens = (title) => {
  if (!title || typeof title !== "string") return [];
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOP_WORDS.has(word));
};

const uniqueLimit = (items, limit) => {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const normalized = String(item || "").trim();
    if (!normalized) continue;
    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(normalized);
    if (result.length >= limit) break;
  }
  return result;
};

const EMPTY_SEARCH_FILTERS = {
  genre: "",
  yearRange: "",
  languageOrCountry: "",
};

const createSubmittedSearch = (overrides = {}) => ({
  query: "",
  type: "all",
  ...EMPTY_SEARCH_FILTERS,
  ...overrides,
});

const hasCommittedSearch = (search) => {
  if (!search) return false;
  return Boolean(
    (typeof search.query === "string" && search.query.trim()) ||
      search.type === "movie" ||
      search.type === "series" ||
      (typeof search.genre === "string" && search.genre.trim()) ||
      (typeof search.yearRange === "string" && search.yearRange.trim()) ||
      (typeof search.languageOrCountry === "string" && search.languageOrCountry.trim())
  );
};

const flattenSearchSeedMovies = (shelves) => {
  const deduped = new Map();
  Object.values(shelves || {}).forEach((items) => {
    safeArray(items).forEach((movie) => {
      if (!movie?.imdbID || deduped.has(movie.imdbID)) return;
      deduped.set(movie.imdbID, movie);
    });
  });
  return Array.from(deduped.values());
};

const buildSearchChips = (search, yearRange) => {
  const chips = [];

  if (search?.type && search.type !== "all") {
    chips.push({
      key: "type",
      label: search.type === "series" ? "Series" : "Movies",
    });
  }

  if (search?.genre) {
    chips.push({ key: "genre", label: search.genre });
  }

  if (yearRange?.raw) {
    chips.push({ key: "year", label: `Year ${yearRange.raw}` });
  }

  if (search?.languageOrCountry?.trim()) {
    chips.push({ key: "region", label: search.languageOrCountry.trim() });
  }

  return chips;
};

const formatReasonLabel = (rawValue) => {
  if (!rawValue) return "Because you watched similar titles";
  return `Because you watched ${rawValue}`;
};

const withFeedBadge = (movie, badge) => {
  const existing = Array.isArray(movie.feedBadges) ? movie.feedBadges : [];
  return {
    ...movie,
    feedBadges: [...existing, badge],
  };
};

const withFeedReason = (movie, reason) => {
  if (!reason) return movie;
  return {
    ...movie,
    feedReason: reason,
  };
};

const applyLatestBadges = (movies) => {
  const currentYear = new Date().getFullYear();
  return movies.map((movie) => {
    const year = parseMovieYear(movie.Year);
    if (!year || year < currentYear - 1) return withFeedReason(movie, "Fresh release");
    return withFeedReason(withFeedBadge(movie, { type: "new", label: "New" }), "Fresh release");
  });
};

const applyPersonalizedBadges = (movies, reasonHint) => {
  const reasonLabel = formatReasonLabel(reasonHint);
  return movies.map((movie) =>
    withFeedReason(withFeedBadge(movie, { type: "because_you_like", label: "For You" }), reasonLabel)
  );
};

const applyGroupBadges = (movies) => {
  return movies.map((movie) =>
    withFeedReason(withFeedBadge(movie, { type: "group_pick", label: "Group Pick" }), "Trending in your groups")
  );
};

const getScopedKey = (baseKey, userId) => `${baseKey}:${userId || "guest"}`;

const readLocalJson = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const writeLocalJson = (key, payload) => {
  try {
    localStorage.setItem(key, JSON.stringify(payload));
  } catch {
    // Ignore localStorage write failures.
  }
};

const readHiddenMovieIds = (userId) => {
  const payload = readLocalJson(getScopedKey(HIDDEN_MOVIES_CACHE_KEY, userId));
  if (!payload || !Array.isArray(payload.ids)) return [];
  return uniqueLimit(payload.ids, 2000);
};

const writeHiddenMovieIds = (userId, ids) => {
  writeLocalJson(getScopedKey(HIDDEN_MOVIES_CACHE_KEY, userId), {
    ids: uniqueLimit(ids, 2000),
    savedAt: Date.now(),
  });
};

const defaultEngagement = (dayBucket) => ({
  dayBucket,
  counters: {
    openDetail: 0,
    play: 0,
    notInterested: 0,
  },
  byShelf: {},
  byQuery: {},
  byType: {},
  updatedAt: Date.now(),
});

const readEngagement = (userId, dayBucket) => {
  const payload = readLocalJson(getScopedKey(ENGAGEMENT_CACHE_KEY, userId));
  if (!payload || payload.dayBucket !== dayBucket) {
    return defaultEngagement(dayBucket);
  }
  return {
    ...defaultEngagement(dayBucket),
    ...payload,
    counters: {
      ...defaultEngagement(dayBucket).counters,
      ...(payload.counters || {}),
    },
    byShelf: payload.byShelf || {},
    byQuery: payload.byQuery || {},
    byType: payload.byType || {},
  };
};

const writeEngagement = (userId, engagement) => {
  writeLocalJson(getScopedKey(ENGAGEMENT_CACHE_KEY, userId), {
    ...engagement,
    updatedAt: Date.now(),
  });
};

const updateEngagementState = (engagement, eventType, shelfKey, movie) => {
  const next = {
    ...engagement,
    counters: {
      ...engagement.counters,
      [eventType]: (engagement.counters?.[eventType] || 0) + 1,
    },
    byShelf: {
      ...engagement.byShelf,
    },
    byQuery: {
      ...engagement.byQuery,
    },
    byType: {
      ...engagement.byType,
    },
    updatedAt: Date.now(),
  };

  if (shelfKey) {
    const shelfCounters = next.byShelf[shelfKey] || {};
    next.byShelf[shelfKey] = {
      ...shelfCounters,
      [eventType]: (shelfCounters[eventType] || 0) + 1,
    };
  }

  safeArray(movie?.matchedQueries).forEach((queryValue) => {
    const key = String(queryValue || "").toLowerCase().trim();
    if (!key) return;
    next.byQuery[key] = (next.byQuery[key] || 0) + 1;
  });

  if (movie?.Type) {
    const typeKey = String(movie.Type).toLowerCase();
    next.byType[typeKey] = (next.byType[typeKey] || 0) + 1;
  }

  return next;
};

const getFranchiseKey = (title) => {
  const tokens = titleToTokens(title).filter((token) => token.length > 2);
  if (tokens.length === 0) return "unknown";
  return tokens.slice(0, 2).join(" ");
};

const enforceFranchiseDiversity = (movies, targetSize, maxPerFranchise = MAX_FRANCHISE_ITEMS) => {
  const counts = new Map();
  const selected = [];

  for (const movie of movies) {
    const franchiseKey = getFranchiseKey(movie?.Title);
    const currentCount = counts.get(franchiseKey) || 0;
    if (currentCount >= maxPerFranchise) continue;
    selected.push(movie);
    counts.set(franchiseKey, currentCount + 1);
    if (selected.length >= targetSize) break;
  }

  if (selected.length < targetSize) {
    const selectedIds = new Set(selected.map((movie) => movie.imdbID));
    for (const movie of movies) {
      if (selectedIds.has(movie.imdbID)) continue;
      selected.push(movie);
      if (selected.length >= targetSize) break;
    }
  }

  return selected;
};

const splitPersonalizedPicks = (rankedMovies, preferredQueries) => {
  const target = Math.min(SHELF_TARGET_SIZE, rankedMovies.length);
  if (target === 0) return [];

  const exploitTarget = Math.max(1, Math.floor(target * 0.7));
  const exploreTarget = Math.max(1, target - exploitTarget);
  const lowerPriorityQueries = safeArray(preferredQueries).slice(Math.floor(preferredQueries.length / 2));

  const explorationPool = rankedMovies.filter((movie) =>
    safeArray(movie.matchedQueries)
      .map((queryValue) => String(queryValue).toLowerCase())
      .some((queryValue) => lowerPriorityQueries.includes(queryValue))
  );

  const exploitation = enforceFranchiseDiversity(rankedMovies, exploitTarget);
  const used = new Set(exploitation.map((movie) => movie.imdbID));

  const exploration = enforceFranchiseDiversity(
    explorationPool.filter((movie) => !used.has(movie.imdbID)),
    exploreTarget,
    1
  );
  exploration.forEach((movie) => used.add(movie.imdbID));

  const filled = [...exploitation, ...exploration];
  if (filled.length < target) {
    rankedMovies.forEach((movie) => {
      if (filled.length >= target) return;
      if (used.has(movie.imdbID)) return;
      filled.push(movie);
      used.add(movie.imdbID);
    });
  }

  return filled.slice(0, target);
};

const applyEngagementBoost = (movies, engagement, shelfKey) => {
  const shelfSignals = engagement?.byShelf?.[shelfKey] || {};
  const shelfAffinity = (shelfSignals.openDetail || 0) * 1.8 + (shelfSignals.play || 0) * 2.4;
  return safeArray(movies)
    .map((movie) => {
      const baseFeedScore =
        typeof movie.baseFeedScore === "number" ? movie.baseFeedScore : movie.feedScore || 0;
      const queryBoost = safeArray(movie.matchedQueries).reduce(
        (sum, queryValue) => sum + (engagement?.byQuery?.[String(queryValue).toLowerCase()] || 0),
        0
      );
      const typeBoost = engagement?.byType?.[String(movie?.Type || "").toLowerCase()] || 0;
      const adjustedScore = baseFeedScore + shelfAffinity + queryBoost * 0.9 + typeBoost * 0.8;
      return {
        ...movie,
        baseFeedScore,
        feedScore: adjustedScore,
      };
    })
    .sort((left, right) => (right.feedScore || 0) - (left.feedScore || 0));
};

const filterHiddenFromShelves = (shelves, hiddenIds) => {
  const hiddenSet = new Set(hiddenIds || []);
  const filtered = {};
  Object.keys(shelves || {}).forEach((shelfKey) => {
    filtered[shelfKey] = safeArray(shelves[shelfKey]).filter((movie) => !hiddenSet.has(movie.imdbID));
  });
  return filtered;
};

const isValidHeroMovie = (movie) => {
  if (!movie?.imdbID) return false;
  if (!movie?.Title || typeof movie.Title !== "string") return false;
  if (!movie?.Poster || movie.Poster === "N/A") return false;
  return true;
};

const computeHeroPoolFromShelves = (shelves) => {
  const latestMovies = safeArray(shelves?.latest)
    .filter(isValidHeroMovie)
    .sort((left, right) => (right.feedScore || 0) - (left.feedScore || 0))
    .map((movie) => ({ ...movie, heroShelfKey: "latest" }));

  const pool = [];
  const seen = new Set();

  for (const movie of latestMovies) {
    if (seen.has(movie.imdbID)) continue;
    seen.add(movie.imdbID);
    pool.push(movie);
    if (pool.length >= HERO_POOL_LIMIT) return pool;
  }

  const fallbackKeys = DISPLAY_SHELVES.map((shelf) => shelf.key).filter((key) => key !== "latest");
  for (const shelfKey of fallbackKeys) {
    const rankedShelf = safeArray(shelves?.[shelfKey])
      .filter(isValidHeroMovie)
      .sort((left, right) => (right.feedScore || 0) - (left.feedScore || 0));

    for (const movie of rankedShelf) {
      if (seen.has(movie.imdbID)) continue;
      seen.add(movie.imdbID);
      pool.push({ ...movie, heroShelfKey: shelfKey });
      if (pool.length >= HERO_POOL_LIMIT) return pool;
    }
  }

  return pool;
};

const readShelfOrderPreference = (userId) => {
  const payload = readLocalJson(getScopedKey(SHELF_ORDER_CACHE_KEY, userId));
  if (!payload || !Array.isArray(payload.order) || !payload.savedAt) return null;
  if (getHours(Date.now() - payload.savedAt) > ORDER_PERSIST_HOURS) return null;
  return payload.order;
};

const writeShelfOrderPreference = (userId, order) => {
  writeLocalJson(getScopedKey(SHELF_ORDER_CACHE_KEY, userId), {
    order,
    savedAt: Date.now(),
  });
};

const scoreShelfOrder = (shelfKey, movies, engagement) => {
  const shelfEvents = engagement?.byShelf?.[shelfKey] || {};
  const topScore = safeArray(movies)
    .slice(0, 4)
    .reduce((sum, movie) => sum + (movie.feedScore || 0), 0);
  return topScore + (shelfEvents.openDetail || 0) * 16 + (shelfEvents.play || 0) * 24;
};

const computeAdaptiveShelfOrder = (shelves, engagement, storedOrder) => {
  const available = DISPLAY_SHELVES.filter((shelf) => safeArray(shelves[shelf.key]).length > 0).map(
    (shelf) => shelf.key
  );
  if (available.length === 0) return [];

  const latestIncluded = available.includes("latest");
  const baseOrder = safeArray(storedOrder).filter((key) => available.includes(key));
  const remaining = available.filter((key) => !baseOrder.includes(key));
  const mergeOrder = [...baseOrder, ...remaining];

  const nonLatest = mergeOrder
    .filter((key) => key !== "latest")
    .sort((left, right) => {
      const rightScore = scoreShelfOrder(right, shelves[right], engagement);
      const leftScore = scoreShelfOrder(left, shelves[left], engagement);
      if (rightScore !== leftScore) return rightScore - leftScore;
      return mergeOrder.indexOf(left) - mergeOrder.indexOf(right);
    });

  if (!latestIncluded) return nonLatest;
  return ["latest", ...nonLatest];
};

const persistHiddenMovieToFirestore = async (userId, movieId, hide) => {
  if (!userId || !movieId) return;
  const userRef = doc(db, "users", userId);
  try {
    if (hide) {
      await updateDoc(userRef, { hiddenMovieIds: arrayUnion(movieId) });
    } else {
      await updateDoc(userRef, { hiddenMovieIds: arrayRemove(movieId) });
    }
  } catch {
    if (hide) {
      try {
        await setDoc(userRef, { hiddenMovieIds: [movieId] }, { merge: true });
      } catch {
        // Ignore Firestore merge failures to keep feed non-blocking.
      }
    }
  }
};

const readHomeCache = () => {
  try {
    const raw = localStorage.getItem(HOME_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeHomeCache = (payload) => {
  try {
    localStorage.setItem(HOME_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore localStorage write failures.
  }
};

const buildCachePayload = (shelves, updatedAt, heroMovie, dayBucket) => {
  const shelfEntries = {};
  SHELF_CATEGORIES.forEach(({ key }) => {
    shelfEntries[key] = {
      movies: shelves[key] || [],
      updatedAt: updatedAt[key] || Date.now(),
    };
  });

  return {
    version: 2,
    dayBucket,
    heroMovie,
    shelves: shelfEntries,
    savedAt: Date.now(),
  };
};

const getCacheView = (cache, maxHoursByShelf, options = {}) => {
  const { requireDayBucket = null } = options;
  if (!cache?.shelves) return null;
  if (requireDayBucket && cache.dayBucket !== requireDayBucket) return null;
  const now = Date.now();
  const shelves = {};
  const updatedAt = {};
  let hasAny = false;

  SHELF_CATEGORIES.forEach(({ key }) => {
    const shelf = cache.shelves[key];
    if (!shelf?.updatedAt || !Array.isArray(shelf.movies)) return;
    const maxAge = maxHoursByShelf[key];
    const ageHours = getHours(now - shelf.updatedAt);
    if (ageHours > maxAge) return;
    shelves[key] = shelf.movies.filter(isValidShelfMovie);
    updatedAt[key] = shelf.updatedAt;
    hasAny = true;
  });

  if (!hasAny) return null;
  return {
    shelves,
    updatedAt,
    heroMovie: cache.heroMovie && isValidShelfMovie(cache.heroMovie) ? cache.heroMovie : null,
  };
};

const mergeAndRankShelf = (movies, queries, currentYear, shelfKey) => {
  const indexed = new Map();
  movies.forEach((movie) => {
    if (!isValidShelfMovie(movie)) return;
    const matchedQueries = Array.isArray(movie.matchedQueries)
      ? movie.matchedQueries.filter(Boolean)
      : [];
    if (!indexed.has(movie.imdbID)) {
      indexed.set(movie.imdbID, {
        movie,
        querySet: new Set(matchedQueries),
      });
      return;
    }
    const existing = indexed.get(movie.imdbID);
    matchedQueries.forEach((query) => existing.querySet.add(query));
  });

  return Array.from(indexed.values())
    .map(({ movie, querySet }) => {
      const matched = Array.from(querySet);
      const score = rankCandidate(movie, matched.length > 0 ? matched : queries, currentYear, shelfKey);
      return {
        ...movie,
        matchedQueries: matched,
        feedScore: score,
      };
    })
    .sort((left, right) => right.feedScore - left.feedScore);
};

const fetchLatestCandidates = async (queries, currentYear) => {
  const yearWindows = [currentYear, currentYear - 1];
  let merged = [];

  for (const year of yearWindows) {
    const yearResults = await searchMoviesByQueries(queries, { year, pages: 1 });
    merged = merged.concat(yearResults);
  }

  if (merged.length < 12) {
    const fallbackYearResults = await searchMoviesByQueries(queries, {
      year: currentYear - 2,
      pages: 1,
    });
    merged = merged.concat(fallbackYearResults);
  }

  return merged;
};

const buildHomeShelves = async (dayBucket) => {
  const currentYear = new Date().getFullYear();
  const allRankedByShelf = {};
  const requestErrors = [];

  for (const shelf of SHELF_CATEGORIES) {
    try {
      const rotatedQueries = rotateQueriesForDay(shelf.queries, shelf.key, dayBucket);
      let candidates = [];
      if (shelf.key === "latest") {
        candidates = await fetchLatestCandidates(rotatedQueries, currentYear);
      } else {
        const firstPage = await searchMoviesByQueries(rotatedQueries, { pages: 1 });
        candidates = firstPage;
        if (candidates.length < SHELF_TARGET_SIZE / 2) {
          const secondPage = await searchMoviesByQueries(rotatedQueries, { pages: 2 });
          candidates = candidates.concat(secondPage);
        }
      }
      allRankedByShelf[shelf.key] = mergeAndRankShelf(
        candidates,
        rotatedQueries,
        currentYear,
        shelf.key
      );
    } catch {
      requestErrors.push(shelf.key);
      allRankedByShelf[shelf.key] = [];
    }
  }

  const usedImdbIds = new Set();
  const shelves = {};
  const updatedAt = {};

  SHELF_CATEGORIES.forEach(({ key }) => {
    const ranked = allRankedByShelf[key] || [];
    const deduped = ranked.filter((movie) => {
      if (usedImdbIds.has(movie.imdbID)) return false;
      usedImdbIds.add(movie.imdbID);
      return true;
    });
    shelves[key] = deduped.slice(0, SHELF_TARGET_SIZE);
    updatedAt[key] = Date.now();
  });

  const heroPool =
    shelves.latest && shelves.latest.length > 0
      ? shelves.latest
      : SHELF_CATEGORIES.flatMap(({ key }) => shelves[key] || []);
  const heroMovie = heroPool.length > 0
    ? [...heroPool].sort((left, right) => (right.feedScore || 0) - (left.feedScore || 0))[0]
    : null;

  return {
    shelves,
    updatedAt,
    heroMovie,
    hasFailures: requestErrors.length > 0,
    totalCount: Object.values(shelves).reduce((sum, items) => sum + items.length, 0),
  };
};

const buildPersonalizedQueryPlan = (userData) => {
  const preferences = userData?.preferences || {};
  const favoriteGenres = safeArray(preferences.favoriteGenres);
  const preferredType = normalizePreferenceType(preferences.preferredTypes);
  const watchlist = safeArray(userData?.watchlist);
  const watchedMovies = safeArray(userData?.watchedMovies);
  const behaviorItems = [...watchlist, ...watchedMovies];

  const genreQueries = uniqueLimit(
    favoriteGenres.flatMap((genre) => GENRE_QUERY_MAP[genre] || []),
    PERSONALIZED_QUERY_LIMIT
  );

  if (genreQueries.length > 0) {
    return {
      queries: genreQueries,
      reasonHint: favoriteGenres[0] || genreQueries[0],
      preferredType,
    };
  }

  const tokenCounts = new Map();
  behaviorItems.forEach((item) => {
    const genreText = typeof item?.genre === "string" ? item.genre : "";
    genreText
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((genre) => {
        const mapped = GENRE_QUERY_MAP[genre] || [genre.toLowerCase()];
        mapped.forEach((query) => {
          tokenCounts.set(query, (tokenCounts.get(query) || 0) + 2);
        });
      });

    titleToTokens(item?.title).forEach((token) => {
      tokenCounts.set(token, (tokenCounts.get(token) || 0) + 1);
    });
  });

  const inferredQueries = Array.from(tokenCounts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([token]) => token);

  if (inferredQueries.length > 0) {
    const queries = uniqueLimit(inferredQueries, PERSONALIZED_QUERY_LIMIT);
    return {
      queries,
      reasonHint: queries[0],
      preferredType,
    };
  }

  return {
    queries: uniqueLimit(DIVERSIFIED_DEFAULT_QUERIES, PERSONALIZED_QUERY_LIMIT),
    reasonHint: "new discoveries",
    preferredType,
  };
};

const fetchPersonalizedShelf = async (user, engagement) => {
  if (!user?.uid) return null;

  const currentYear = new Date().getFullYear();
  let userData = {};

  try {
    const userSnapshot = await getDoc(doc(db, "users", user.uid));
    userData = userSnapshot.exists() ? userSnapshot.data() || {} : {};
  } catch {
    userData = {};
  }

  const plan = buildPersonalizedQueryPlan(userData);
  const orderedQueries = [...safeArray(plan.queries)].sort((left, right) => {
    const leftCount = engagement?.byQuery?.[String(left).toLowerCase()] || 0;
    const rightCount = engagement?.byQuery?.[String(right).toLowerCase()] || 0;
    if (leftCount !== rightCount) return leftCount - rightCount;
    return left.localeCompare(right);
  });

  try {
    let candidates = await searchMoviesByQueries(orderedQueries, {
      type: plan.preferredType,
      pages: 1,
    });

    if (candidates.length < SHELF_TARGET_SIZE / 2) {
      const nextPage = await searchMoviesByQueries(orderedQueries, {
        type: plan.preferredType,
        pages: 2,
      });
      candidates = candidates.concat(nextPage);
    }

    const ranked = mergeAndRankShelf(candidates, orderedQueries, currentYear, "because_you_like");
    const mixed = splitPersonalizedPicks(ranked, orderedQueries);
    const movies = applyPersonalizedBadges(mixed, plan.reasonHint);
    return {
      key: "because_you_like",
      movies,
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
};

const chunk = (items, size) => {
  const output = [];
  for (let index = 0; index < items.length; index += size) {
    output.push(items.slice(index, index + size));
  }
  return output;
};

const normalizeRecommendationMovie = (rec) => {
  const movieId = rec?.movieId || rec?.movie?.imdbID || rec?.movie?.movieId;
  if (!movieId) return null;

  const rawMovie = rec?.movie || {};
  const title = rawMovie.title || rawMovie.Title;
  const poster = rawMovie.poster || rawMovie.Poster;
  const type = rawMovie.type || rawMovie.Type || "movie";
  const year = rawMovie.year || rawMovie.Year || "";

  return {
    movieId,
    movie:
      title || poster
        ? {
            imdbID: movieId,
            Title: title || "",
            Poster: poster || "N/A",
            Type: type,
            Year: year,
          }
        : null,
  };
};

const fetchGroupShelf = async (user) => {
  if (!user?.uid) return null;

  try {
    const groupsSnapshot = await getDocs(collection(db, "groups"));
    const memberGroups = groupsSnapshot.docs
      .map((groupDoc) => ({ id: groupDoc.id, ...groupDoc.data() }))
      .filter((group) => safeArray(group.members).some((member) => member?.userId === user.uid));

    const groupIds = memberGroups.map((group) => group.id);
    if (groupIds.length === 0) return null;

    const recommendationDocs = [];
    const idChunks = chunk(groupIds, 10);

    for (const ids of idChunks) {
      const recommendationQuery = query(collection(db, "recommendations"), where("groupId", "in", ids));
      const recommendationSnapshot = await getDocs(recommendationQuery);
      recommendationSnapshot.docs.forEach((docSnapshot) => {
        recommendationDocs.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
    }

    const aggregated = new Map();
    recommendationDocs.forEach((rec) => {
      const normalized = normalizeRecommendationMovie(rec);
      if (!normalized?.movieId) return;
      if (!aggregated.has(normalized.movieId)) {
        aggregated.set(normalized.movieId, {
          movieId: normalized.movieId,
          movie: normalized.movie,
          recCount: 1,
          newestAt: rec.recommendedAt?.seconds ? rec.recommendedAt.seconds : 0,
        });
        return;
      }
      const current = aggregated.get(normalized.movieId);
      current.recCount += 1;
      current.newestAt = Math.max(current.newestAt, rec.recommendedAt?.seconds || 0);
      if (!current.movie && normalized.movie) {
        current.movie = normalized.movie;
      }
    });

    if (aggregated.size === 0) return null;

    const entries = Array.from(aggregated.values());
    const missing = entries
      .filter((entry) => !entry.movie || !entry.movie.Title || entry.movie.Poster === "N/A")
      .slice(0, SOCIAL_DETAIL_FETCH_LIMIT);

    const fetched = await Promise.all(
      missing.map(async (entry) => {
        const details = await getMovieSummaryById(entry.movieId);
        if (!details) return null;
        return {
          movieId: entry.movieId,
          movie: {
            imdbID: entry.movieId,
            Title: details.Title,
            Poster: details.Poster,
            Type: details.Type,
            Year: details.Year,
          },
        };
      })
    );

    fetched.filter(Boolean).forEach((item) => {
      if (!aggregated.has(item.movieId)) return;
      aggregated.get(item.movieId).movie = item.movie;
    });

    const sorted = Array.from(aggregated.values())
      .filter((entry) => isValidShelfMovie(entry.movie))
      .sort((left, right) => {
        if (right.recCount !== left.recCount) return right.recCount - left.recCount;
        return right.newestAt - left.newestAt;
      })
      .slice(0, SHELF_TARGET_SIZE)
      .map((entry) => ({ ...entry.movie, groupRecCount: entry.recCount }));

    if (sorted.length === 0) return null;

    return {
      key: "from_groups",
      movies: applyGroupBadges(sorted),
      updatedAt: Date.now(),
    };
  } catch {
    return null;
  }
};

const composeShelves = (baseShelves, personalizedShelf, socialShelf) => {
  const usedImdbIds = new Set();
  const nextShelves = {};
  const nextUpdatedAt = {};

  const addShelf = (key, movies, updatedAt) => {
    const diversified = enforceFranchiseDiversity(safeArray(movies), SHELF_TARGET_SIZE);
    const deduped = diversified.filter((movie) => {
      if (!movie?.imdbID) return false;
      if (usedImdbIds.has(movie.imdbID)) return false;
      usedImdbIds.add(movie.imdbID);
      return true;
    });

    nextShelves[key] = deduped;
    nextUpdatedAt[key] = updatedAt || Date.now();
  };

  const baseLatest = applyLatestBadges(safeArray(baseShelves.shelves?.latest));
  addShelf("latest", baseLatest, baseShelves.updatedAt?.latest);

  if (personalizedShelf?.movies?.length) {
    addShelf(personalizedShelf.key, personalizedShelf.movies, personalizedShelf.updatedAt);
  }
  if (socialShelf?.movies?.length) {
    addShelf(socialShelf.key, socialShelf.movies, socialShelf.updatedAt);
  }

  SHELF_CATEGORIES.filter((shelf) => shelf.key !== "latest").forEach((shelf) => {
    addShelf(shelf.key, baseShelves.shelves?.[shelf.key], baseShelves.updatedAt?.[shelf.key]);
  });

  const heroPool = nextShelves.latest?.length
    ? nextShelves.latest
    : DISPLAY_SHELVES.flatMap((shelf) => nextShelves[shelf.key] || []);
  const heroMovie =
    heroPool.length > 0
      ? [...heroPool].sort((left, right) => (right.feedScore || 0) - (left.feedScore || 0))[0]
      : null;

  return {
    shelves: nextShelves,
    updatedAt: nextUpdatedAt,
    heroMovie,
  };
};

const Home = () => {
  const { user } = useAuth();
  const userScopeId = user?.uid || "guest";
  const [draftSearchTerm, setDraftSearchTerm] = useState("");
  const [draftSearchType, setDraftSearchType] = useState("all");
  const [draftSearchFilters, setDraftSearchFilters] = useState(EMPTY_SEARCH_FILTERS);
  const [submittedSearch, setSubmittedSearch] = useState(createSubmittedSearch());
  const [page, setPage] = useState(1);

  const [searchMovies, setSearchMovies] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchError, setSearchError] = useState(null);

  const [sourceShelfData, setSourceShelfData] = useState({});
  const [sourceShelfUpdatedAt, setSourceShelfUpdatedAt] = useState({});
  const [shelfData, setShelfData] = useState({});
  const [shelfUpdatedAt, setShelfUpdatedAt] = useState({});
  const [heroMovies, setHeroMovies] = useState([]);
  const [heroActiveIndex, setHeroActiveIndex] = useState(0);
  const [isHeroPaused, setIsHeroPaused] = useState(false);
  const [orderedShelfKeys, setOrderedShelfKeys] = useState([]);
  const [hiddenMovieIds, setHiddenMovieIds] = useState([]);
  const [lastHidden, setLastHidden] = useState(null);
  const [engagement, setEngagement] = useState(defaultEngagement(getDayBucket()));
  const [shelfLoading, setShelfLoading] = useState(true);

  const normalizedSubmittedSearchTerm = submittedSearch.query.trim();
  const submittedYearRange = useMemo(
    () => parseSearchYearRange(submittedSearch.yearRange),
    [submittedSearch.yearRange]
  );
  const searchSeedMovies = useMemo(
    () => flattenSearchSeedMovies(sourceShelfData),
    [sourceShelfData]
  );
  const activeSearchChips = useMemo(
    () => buildSearchChips(submittedSearch, submittedYearRange),
    [submittedSearch, submittedYearRange]
  );
  const isSearchActive = hasCommittedSearch(submittedSearch);

  useEffect(() => {
    const dayBucket = getDayBucket();
    setEngagement(readEngagement(userScopeId, dayBucket));
    setHiddenMovieIds(readHiddenMovieIds(userScopeId));
    setLastHidden(null);
  }, [userScopeId]);

  useEffect(() => {
    const fetchShelves = async () => {
      setShelfLoading(true);
      const dayBucket = getDayBucket();
      const sessionEngagement = readEngagement(userScopeId, dayBucket);
      const cache = readHomeCache();
      const ttlByShelf = SHELF_CATEGORIES.reduce((acc, shelf) => {
        acc[shelf.key] = shelf.ttlHours;
        return acc;
      }, {});

      let baseFeed = null;
      const freshCache = getCacheView(cache, ttlByShelf, { requireDayBucket: dayBucket });

      if (freshCache) {
        baseFeed = {
          shelves: freshCache.shelves,
          updatedAt: freshCache.updatedAt,
          heroMovie: freshCache.heroMovie,
        };
      } else {
        try {
          const next = await buildHomeShelves(dayBucket);
          const staleCache = getCacheView(
            cache,
            SHELF_CATEGORIES.reduce((acc, shelf) => {
              acc[shelf.key] = STALE_FALLBACK_HOURS;
              return acc;
            }, {})
          );

          if (next.totalCount === 0 && next.hasFailures && staleCache) {
            baseFeed = {
              shelves: staleCache.shelves,
              updatedAt: staleCache.updatedAt,
              heroMovie: staleCache.heroMovie,
            };
          } else {
            baseFeed = {
              shelves: next.shelves,
              updatedAt: next.updatedAt,
              heroMovie: next.heroMovie,
            };
            writeHomeCache(buildCachePayload(next.shelves, next.updatedAt, next.heroMovie, dayBucket));
          }
        } catch {
          const staleCache = getCacheView(
            cache,
            SHELF_CATEGORIES.reduce((acc, shelf) => {
              acc[shelf.key] = STALE_FALLBACK_HOURS;
              return acc;
            }, {})
          );
          if (staleCache) {
            baseFeed = {
              shelves: staleCache.shelves,
              updatedAt: staleCache.updatedAt,
              heroMovie: staleCache.heroMovie,
            };
          }
        }
      }

      if (!baseFeed) {
        setSourceShelfData({});
        setSourceShelfUpdatedAt({});
        setShelfData({});
        setShelfUpdatedAt({});
        setHeroMovies([]);
        setHeroActiveIndex(0);
        setOrderedShelfKeys([]);
        setShelfLoading(false);
        return;
      }

      if (!user?.uid) {
        const withLatestBadges = {
          shelves: {
            ...baseFeed.shelves,
            latest: applyLatestBadges(baseFeed.shelves.latest || []),
          },
          updatedAt: baseFeed.updatedAt,
          heroMovie: baseFeed.heroMovie,
        };
        setSourceShelfData(withLatestBadges.shelves);
        setSourceShelfUpdatedAt(withLatestBadges.updatedAt);
        setShelfLoading(false);
        return;
      }

      const [personalized, social] = await Promise.allSettled([
        fetchPersonalizedShelf(user, sessionEngagement),
        fetchGroupShelf(user),
      ]);

      const personalizedShelf = personalized.status === "fulfilled" ? personalized.value : null;
      const socialShelf = social.status === "fulfilled" ? social.value : null;

      const composed = composeShelves(baseFeed, personalizedShelf, socialShelf);
      setSourceShelfData(composed.shelves);
      setSourceShelfUpdatedAt(composed.updatedAt);
      setShelfLoading(false);
    };
    fetchShelves();
  }, [user, userScopeId]);

  useEffect(() => {
    const sourceKeys = Object.keys(sourceShelfData || {});
    if (sourceKeys.length === 0) {
      setShelfData({});
      setShelfUpdatedAt({});
      setHeroMovies([]);
      setHeroActiveIndex(0);
      setOrderedShelfKeys([]);
      return;
    }

    const boostedShelves = {};
    Object.keys(sourceShelfData).forEach((shelfKey) => {
      boostedShelves[shelfKey] = applyEngagementBoost(sourceShelfData[shelfKey], engagement, shelfKey);
    });

    const filteredShelves = filterHiddenFromShelves(boostedShelves, hiddenMovieIds);
    const storedOrder = readShelfOrderPreference(userScopeId);
    const nextOrder = computeAdaptiveShelfOrder(filteredShelves, engagement, storedOrder);

    writeShelfOrderPreference(userScopeId, nextOrder);
    setShelfData(filteredShelves);
    setShelfUpdatedAt(sourceShelfUpdatedAt);
    setHeroMovies(computeHeroPoolFromShelves(filteredShelves));
    setOrderedShelfKeys(nextOrder);
  }, [sourceShelfData, sourceShelfUpdatedAt, hiddenMovieIds, engagement, userScopeId]);

  useEffect(() => {
    setHeroActiveIndex((prevIndex) => {
      if (heroMovies.length === 0) return 0;
      return Math.min(prevIndex, heroMovies.length - 1);
    });
  }, [heroMovies]);

  useEffect(() => {
    if (heroMovies.length <= 1 || isHeroPaused) return undefined;
    const timerId = setTimeout(() => {
      setHeroActiveIndex((prevIndex) => (prevIndex + 1) % heroMovies.length);
    }, HERO_ROTATE_INTERVAL_MS);
    return () => clearTimeout(timerId);
  }, [heroMovies.length, heroActiveIndex, isHeroPaused]);

  useEffect(() => {
    if (!isSearchActive) {
      setSearchMovies([]);
      setSearchTotal(0);
      setSearchError(null);
      return;
    }

    if (!submittedYearRange.isValid) {
      setSearchMovies([]);
      setSearchTotal(0);
      setSearchError("Enter a year like 2019 or 2019-2022.");
      return;
    }

    const fetchSearch = async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const result = await searchMoviesWithFilters(submittedSearch, {
          page,
          seedMovies: searchSeedMovies,
        });

        if (result.Response === "True") {
          setSearchMovies((prev) =>
            page === 1 ? result.Search : [...prev, ...result.Search]
          );
          setSearchTotal(parseInt(result.totalResults, 10) || 0);
        } else {
          if (result.Error) setSearchError(result.Error);
          if (page === 1) {
            setSearchMovies([]);
            setSearchTotal(0);
          }
        }
      } catch {
        setSearchError("Failed to fetch movies");
      }
      setSearchLoading(false);
    };
    const id = setTimeout(fetchSearch, 300);
    return () => clearTimeout(id);
  }, [isSearchActive, page, searchSeedMovies, submittedSearch, submittedYearRange]);

  const recordEngagement = (eventType, shelfKey, movie) => {
    const dayBucket = getDayBucket();
    const next = updateEngagementState(
      engagement.dayBucket === dayBucket ? engagement : defaultEngagement(dayBucket),
      eventType,
      shelfKey,
      movie
    );
    setEngagement(next);
    writeEngagement(userScopeId, next);
  };

  const handleNotInterested = (movie, shelfKey) => {
    if (!movie?.imdbID) return;
    recordEngagement("notInterested", shelfKey, movie);

    setHiddenMovieIds((prev) => {
      if (prev.includes(movie.imdbID)) return prev;
      const next = [...prev, movie.imdbID];
      writeHiddenMovieIds(userScopeId, next);
      return next;
    });

    setLastHidden({
      movie,
      shelfKey,
      hiddenAt: Date.now(),
    });

    persistHiddenMovieToFirestore(user?.uid, movie.imdbID, true);
  };

  const undoNotInterested = () => {
    if (!lastHidden?.movie?.imdbID) return;
    const movieId = lastHidden.movie.imdbID;
    setHiddenMovieIds((prev) => {
      const next = prev.filter((id) => id !== movieId);
      writeHiddenMovieIds(userScopeId, next);
      return next;
    });
    persistHiddenMovieToFirestore(user?.uid, movieId, false);
    setLastHidden(null);
  };

  const handleSearchChange = (e) => {
    setDraftSearchTerm(e.target.value);
  };

  const handleSearchSubmit = (value) => {
    const nextDraftSearchTerm = typeof value === "string" ? value : draftSearchTerm;
    setDraftSearchTerm(nextDraftSearchTerm);
    setSubmittedSearch(
      createSubmittedSearch({
        query: typeof nextDraftSearchTerm === "string" ? nextDraftSearchTerm.trim() : "",
        type: draftSearchType,
        ...draftSearchFilters,
      })
    );
    setPage(1);
  };

  const handleSearchTypeChange = (value) => {
    setDraftSearchType(value);
  };

  const handleSearchFilterChange = (key, value) => {
    setDraftSearchFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSelectMovie = (movie) => {
    const nextTitle = movie?.Title || "";
    setDraftSearchTerm(nextTitle);
  };

  const goToHeroIndex = (index) => {
    if (heroMovies.length <= 1) return;
    const bounded = Math.max(0, Math.min(index, heroMovies.length - 1));
    setHeroActiveIndex(bounded);
  };

  const showNextHero = () => {
    if (heroMovies.length <= 1) return;
    setHeroActiveIndex((prevIndex) => (prevIndex + 1) % heroMovies.length);
  };

  const showPrevHero = () => {
    if (heroMovies.length <= 1) return;
    setHeroActiveIndex((prevIndex) => (prevIndex - 1 + heroMovies.length) % heroMovies.length);
  };

  useEffect(() => {
    if (!lastHidden) return undefined;
    const id = setTimeout(() => setLastHidden(null), 7000);
    return () => clearTimeout(id);
  }, [lastHidden]);

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar
        searchTerm={draftSearchTerm}
        searchType={draftSearchType}
        searchFilters={draftSearchFilters}
        searchGenreOptions={ADVANCED_SEARCH_GENRES}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onSearchTypeChange={handleSearchTypeChange}
        onSearchFilterChange={handleSearchFilterChange}
        onSearchSelectMovie={handleSelectMovie}
      />

      {!isSearchActive && (
        <>
          <HeroBanner
            movies={heroMovies}
            activeIndex={heroActiveIndex}
            onNext={showNextHero}
            onPrev={showPrevHero}
            onGoTo={goToHeroIndex}
            onPause={() => setIsHeroPaused(true)}
            onResume={() => setIsHeroPaused(false)}
            onOpenDetails={(movie) => recordEngagement("openDetail", movie?.heroShelfKey || "latest", movie)}
          />

          <div className="mt-10">
            {(shelfLoading
              ? DISPLAY_SHELVES.map((shelf) => shelf.key)
              : orderedShelfKeys
            )
              .filter((key) => {
                if (shelfLoading) return true;
                return safeArray(shelfData[key]).length > 0;
              })
              .map((key) => {
                const shelfMeta = DISPLAY_SHELVES.find((shelf) => shelf.key === key);
                if (!shelfMeta) return null;
                return (
                  <ShelfRow
                    key={key}
                    shelfKey={key}
                    label={shelfMeta.label}
                    movies={shelfData[key] || []}
                    loading={shelfLoading}
                    updatedAt={shelfUpdatedAt[key]}
                    onOpenDetails={(movie, shelfKey) => recordEngagement("openDetail", shelfKey, movie)}
                    onPlay={(movie, shelfKey) => recordEngagement("play", shelfKey, movie)}
                    onNotInterested={handleNotInterested}
                  />
                );
              })}
          </div>

          {lastHidden?.movie && (
            <div className="fixed bottom-6 right-6 z-40 max-w-sm bg-[#1f1f1f] border border-white/15 rounded-xl px-4 py-3 shadow-2xl">
              <p className="text-sm text-gray-200 mb-2">
                Hidden <span className="font-semibold text-white">{lastHidden.movie.Title}</span>
              </p>
              <button
                type="button"
                onClick={undoNotInterested}
                className="text-sm font-semibold text-[#ff6169] hover:text-[#ff858b] transition-colors"
              >
                Undo
              </button>
            </div>
          )}
        </>
      )}

      {isSearchActive && (
        <div className="container mx-auto px-4 pt-6 pb-8">
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 shadow-[0_0_32px_rgba(229,9,20,0.08)]">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-white/45">
                  Search
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-white">
                  {normalizedSubmittedSearchTerm
                    ? `Results for "${normalizedSubmittedSearchTerm}"`
                    : "Filtered recommendations"}
                </h2>
              </div>
              <p className="text-sm text-white/55">
                {searchTotal > 0
                  ? `${searchTotal} ranked match${searchTotal === 1 ? "" : "es"}`
                  : "Ranking results with OMDb metadata"}
              </p>
            </div>

            {activeSearchChips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {activeSearchChips.map((chip) => (
                  <span
                    key={chip.key}
                    className="rounded-full border border-white/10 bg-black/30 px-3 py-1 text-xs font-medium text-white/75"
                  >
                    {chip.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {searchError && (
            <div className="text-center text-red-500 mb-4">{searchError}</div>
          )}

          {searchLoading && searchMovies.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <GridSkeletonCard key={i} />)}
            </div>
          ) : searchMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchMovies.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-10 text-center text-white/65">
              No matching titles were found for this search.
            </div>
          )}

          {searchMovies.length > 0 && searchMovies.length < searchTotal && (
            <div className="text-center mt-8">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={searchLoading}
                className="bg-[#e50914] text-white px-8 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {searchLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="h-16" />
    </div>
  );
};

export default Home;
