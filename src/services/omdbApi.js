import axios from 'axios';

const SEARCH_PAGE_SIZE = 10;
const ADVANCED_ENRICH_LIMIT = 24;
const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'at',
  'by',
  'for',
  'from',
  'in',
  'into',
  'of',
  'on',
  'or',
  'the',
  'to',
  'with',
]);
const DEFAULT_DISCOVERY_QUERIES = ['movie', 'cinema', 'film', 'series', 'show'];
const TYPE_DISCOVERY_QUERIES = {
  movie: ['movie', 'cinema', 'film'],
  series: ['series', 'show', 'tv'],
};
const GENRE_QUERY_EXPANSIONS = {
  Action: ['action', 'adventure', 'mission'],
  Adventure: ['adventure', 'quest', 'journey'],
  Animation: ['animation', 'animated', 'anime'],
  Comedy: ['comedy', 'funny', 'buddy'],
  Crime: ['crime', 'detective', 'underworld'],
  Documentary: ['documentary', 'biography', 'true story'],
  Drama: ['drama', 'family', 'character'],
  Fantasy: ['fantasy', 'magic', 'myth'],
  Horror: ['horror', 'haunted', 'supernatural'],
  Mystery: ['mystery', 'investigation', 'clue'],
  Romance: ['romance', 'love', 'heart'],
  'Sci-Fi': ['sci-fi', 'science fiction', 'future', 'space'],
  Thriller: ['thriller', 'suspense', 'mystery'],
};

export const ADVANCED_SEARCH_GENRES = Object.keys(GENRE_QUERY_EXPANSIONS);

const hasValidPoster = (poster) =>
  typeof poster === 'string' && poster.trim() !== '' && poster !== 'N/A';

const extractYear = (yearString) => {
  if (!yearString || typeof yearString !== 'string') return null;
  const match = yearString.match(/\b(\d{4})\b/);
  return match ? match[1] : null;
};

const normalizeSearchValue = (value) =>
  typeof value === 'string'
    ? value
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

const splitCsvField = (value) =>
  typeof value === 'string'
    ? value
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean)
    : [];

const extractMeaningfulTokens = (value, minimumLength = 3) =>
  normalizeSearchValue(value)
    .split(' ')
    .filter((token) => token.length >= minimumLength && !STOP_WORDS.has(token));

const normalizeTypeFilter = (type) => {
  if (type === 'movie' || type === 'series') return type;
  return undefined;
};

const dedupeValues = (values) => Array.from(new Set((values || []).filter(Boolean)));

const coerceIntegerYear = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const hasActiveAdvancedFilters = (search = {}) => {
  const type = normalizeTypeFilter(search.type);
  return Boolean(
    type ||
      (typeof search.genre === 'string' && search.genre.trim()) ||
      (typeof search.yearRange === 'string' && search.yearRange.trim()) ||
      (typeof search.languageOrCountry === 'string' && search.languageOrCountry.trim())
  );
};

const buildSeedQueries = (search = {}) => {
  const query = typeof search.query === 'string' ? search.query.trim() : '';
  const genre = typeof search.genre === 'string' ? search.genre.trim() : '';
  const languageOrCountry =
    typeof search.languageOrCountry === 'string' ? search.languageOrCountry.trim() : '';
  const type = normalizeTypeFilter(search.type);

  const queries = [];
  if (query) queries.push(query);
  queries.push(...extractMeaningfulTokens(query, 4));

  if (genre) {
    queries.push(genre.toLowerCase());
    queries.push(...(GENRE_QUERY_EXPANSIONS[genre] || []));
  }

  queries.push(...extractMeaningfulTokens(languageOrCountry, 3));

  if (queries.length === 0 && type) {
    queries.push(...(TYPE_DISCOVERY_QUERIES[type] || []));
  }

  if (queries.length === 0) {
    queries.push(...DEFAULT_DISCOVERY_QUERIES);
  }

  return dedupeValues(queries).slice(0, 6);
};

const matchesTypeFilter = (movie, type) => {
  const normalizedType = normalizeTypeFilter(type);
  if (!normalizedType) return true;
  return movie?.Type === normalizedType;
};

const matchesYearRange = (movie, yearRange) => {
  if (!yearRange?.isValid || !yearRange.startYear || !yearRange.endYear) return true;
  const movieYear = parseMovieYear(movie?.Year);
  if (!movieYear) return false;
  return movieYear >= yearRange.startYear && movieYear <= yearRange.endYear;
};

const matchesGenreFilter = (movie, genre) => {
  const normalizedGenre = typeof genre === 'string' ? genre.trim().toLowerCase() : '';
  if (!normalizedGenre) return true;
  return splitCsvField(movie?.Genre).some((entry) => entry.toLowerCase() === normalizedGenre);
};

const matchesRegionFilter = (movie, languageOrCountry) => {
  const normalizedNeedle = normalizeSearchValue(languageOrCountry);
  if (!normalizedNeedle) return true;

  const haystacks = [movie?.Language, movie?.Country]
    .flatMap((value) => splitCsvField(value))
    .map((value) => normalizeSearchValue(value));

  return haystacks.some(
    (value) => value.includes(normalizedNeedle) || normalizedNeedle.includes(value)
  );
};

const matchesKeywordIntent = (movie, keywordTokens) => {
  if (!Array.isArray(keywordTokens) || keywordTokens.length === 0) return true;

  const title = normalizeSearchValue(movie?.Title || '');
  const plot = normalizeSearchValue(movie?.Plot || '');
  const genre = normalizeSearchValue(movie?.Genre || '');
  const language = normalizeSearchValue(movie?.Language || '');
  const country = normalizeSearchValue(movie?.Country || '');
  const matchedCount = keywordTokens.filter((token) => {
    return (
      title.includes(token) ||
      plot.includes(token) ||
      genre.includes(token) ||
      language.includes(token) ||
      country.includes(token)
    );
  }).length;

  return matchedCount > 0;
};

const scoreDetailedCandidate = (movie, search, keywordTokens, yearRange) => {
  const normalizedQuery = normalizeSearchValue(search?.query || '');
  const normalizedTitle = normalizeSearchValue(movie?.Title || '');
  const normalizedPlot = normalizeSearchValue(movie?.Plot || '');
  const normalizedGenre = normalizeSearchValue(movie?.Genre || '');
  const normalizedLanguage = normalizeSearchValue(movie?.Language || '');
  const normalizedCountry = normalizeSearchValue(movie?.Country || '');
  const movieYear = parseMovieYear(movie?.Year);
  const exactYear =
    yearRange?.isValid && yearRange.startYear === yearRange.endYear ? yearRange.startYear : null;

  let score = 0;

  if (normalizedQuery) {
    score += scoreSearchCandidate(normalizedQuery, movie, normalizedQuery) * 2;
    if (normalizedTitle === normalizedQuery) score += 30;
    if (normalizedTitle.startsWith(normalizedQuery)) score += 18;
  }

  keywordTokens.forEach((token) => {
    if (normalizedTitle.includes(token)) score += 8;
    if (normalizedPlot.includes(token)) score += 14;
    if (normalizedGenre.includes(token)) score += 7;
    if (normalizedLanguage.includes(token) || normalizedCountry.includes(token)) score += 6;
  });

  if (matchesGenreFilter(movie, search?.genre)) score += 18;
  if (matchesRegionFilter(movie, search?.languageOrCountry)) score += 16;
  if (matchesTypeFilter(movie, search?.type)) score += 14;

  if (exactYear && movieYear) {
    score += Math.max(0, 16 - Math.abs(movieYear - exactYear) * 4);
  } else if (movieYear && yearRange?.isValid && movieYear >= yearRange.startYear && movieYear <= yearRange.endYear) {
    score += 10;
  }

  if (Array.isArray(movie?.matchedQueries)) {
    score += movie.matchedQueries.length * 2;
  }

  return score;
};

const mergeCandidateMovie = (merged, movie, matchedQuery = null, seedBoost = 0) => {
  if (!movie?.imdbID) return;

  if (!merged.has(movie.imdbID)) {
    merged.set(movie.imdbID, {
      ...movie,
      matchedQueries: matchedQuery ? [matchedQuery] : [],
      __seedBoost: seedBoost,
    });
    return;
  }

  const existing = merged.get(movie.imdbID);
  if (matchedQuery && !existing.matchedQueries.includes(matchedQuery)) {
    existing.matchedQueries.push(matchedQuery);
  }

  if ((!existing.Poster || existing.Poster === 'N/A') && movie.Poster) {
    existing.Poster = movie.Poster;
  }

  existing.__seedBoost = Math.max(existing.__seedBoost || 0, seedBoost);
};

export const parseSearchYearRange = (value) => {
  const normalized = typeof value === 'string' ? value.trim() : '';
  if (!normalized) {
    return {
      raw: '',
      startYear: null,
      endYear: null,
      isValid: true,
    };
  }

  const exactMatch = normalized.match(/^(\d{4})$/);
  if (exactMatch) {
    const year = coerceIntegerYear(exactMatch[1]);
    return {
      raw: normalized,
      startYear: year,
      endYear: year,
      isValid: Boolean(year),
    };
  }

  const rangeMatch = normalized.match(/^(\d{4})\s*[-/]\s*(\d{4})$/);
  if (rangeMatch) {
    const leftYear = coerceIntegerYear(rangeMatch[1]);
    const rightYear = coerceIntegerYear(rangeMatch[2]);
    if (!leftYear || !rightYear) {
      return {
        raw: normalized,
        startYear: null,
        endYear: null,
        isValid: false,
      };
    }

    return {
      raw: normalized,
      startYear: Math.min(leftYear, rightYear),
      endYear: Math.max(leftYear, rightYear),
      isValid: true,
    };
  }

  return {
    raw: normalized,
    startYear: null,
    endYear: null,
    isValid: false,
  };
};

const buildFallbackQueries = (searchTerm) => {
  const normalized = normalizeSearchValue(searchTerm);

  if (!normalized) {
    return [];
  }

  const tokens = normalized.split(' ').filter(Boolean);
  const variations = new Set([normalized]);

  if (tokens.length > 1) {
    variations.add(tokens.slice(0, 2).join(' '));
    variations.add(tokens[0]);

    const longestTokens = [...tokens]
      .sort((left, right) => right.length - left.length)
      .slice(0, 2);

    if (longestTokens.length > 0) {
      variations.add(longestTokens.join(' '));
      variations.add(longestTokens[0]);
    }
  }

  tokens.forEach((token) => {
    if (token.length >= 5) {
      variations.add(token.slice(0, Math.max(4, token.length - 1)));
      variations.add(token.slice(0, 4));
    }
  });

  return Array.from(variations).filter(Boolean);
};

const computeLevenshteinDistance = (left, right) => {
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;

  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = new Array(right.length + 1);

  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const substitutionCost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        current[j - 1] + 1,
        previous[j] + 1,
        previous[j - 1] + substitutionCost
      );
    }

    for (let j = 0; j <= right.length; j += 1) {
      previous[j] = current[j];
    }
  }

  return previous[right.length];
};

const scoreSearchCandidate = (query, movie, matchedQuery) => {
  const normalizedQuery = normalizeSearchValue(query);
  const normalizedTitle = normalizeSearchValue(movie?.Title || '');

  if (!normalizedTitle) return Number.NEGATIVE_INFINITY;

  const queryTokens = normalizedQuery.split(' ').filter(Boolean);
  const titleTokens = new Set(normalizedTitle.split(' ').filter(Boolean));
  const tokenHits = queryTokens.filter((token) => titleTokens.has(token)).length;
  const prefixBonus = normalizedTitle.startsWith(normalizedQuery) ? 6 : 0;
  const substringBonus = normalizedTitle.includes(normalizedQuery) ? 3 : 0;
  const fallbackPenalty = matchedQuery !== normalizedQuery ? 1.5 : 0;
  const distancePenalty = computeLevenshteinDistance(normalizedQuery, normalizedTitle.slice(0, normalizedQuery.length || normalizedTitle.length));

  return tokenHits * 8 + prefixBonus + substringBonus - fallbackPenalty - distancePenalty;
};

const fetchMovieSearchPage = async (searchTerm, options = {}) => {
  const { type, year, page = 1 } = options;
  const params = new URLSearchParams({
    apikey: process.env.REACT_APP_OMDB_API,
    s: searchTerm,
    page: page.toString()
  });

  if (type) params.append('type', type);
  if (year) params.append('y', year);

  const response = await fetch(`https://www.omdbapi.com/?${params}`);
  return response.json();
};

// Add a new function for searching multiple movies
export const searchMultipleMovies = async (searchTerm, options = {}) => {
  const normalizedSearchTerm = typeof searchTerm === 'string' ? searchTerm.trim() : '';

  if (!normalizedSearchTerm) {
    return {
      Response: 'False',
      Error: 'Movie not found!'
    };
  }

  const primaryResult = await fetchMovieSearchPage(normalizedSearchTerm, options);

  if (primaryResult?.Response === 'True' || options.page > 1) {
    return primaryResult;
  }

  const fallbackQueries = buildFallbackQueries(normalizedSearchTerm).filter(
    (query) => query !== normalizeSearchValue(normalizedSearchTerm)
  );

  if (fallbackQueries.length === 0) {
    return primaryResult;
  }

  const merged = new Map();

  for (const query of fallbackQueries) {
    try {
      const fallbackResult = await fetchMovieSearchPage(query, { ...options, page: 1 });
      if (fallbackResult?.Response !== 'True' || !Array.isArray(fallbackResult.Search)) {
        continue;
      }

      fallbackResult.Search.forEach((movie) => {
        if (!movie?.imdbID || merged.has(movie.imdbID)) {
          return;
        }

        merged.set(movie.imdbID, {
          ...movie,
          __score: scoreSearchCandidate(normalizedSearchTerm, movie, query),
        });
      });
    } catch {
      // Keep primary result behavior if fallback requests fail.
    }
  }

  const rankedResults = Array.from(merged.values())
    .sort((left, right) => right.__score - left.__score)
    .slice(0, 10)
    .map(({ __score, ...movie }) => movie);

  if (rankedResults.length === 0) {
    return primaryResult;
  }

  return {
    Response: 'True',
    Search: rankedResults,
    totalResults: String(rankedResults.length),
  };
};

export const parseMovieYear = (yearString) => {
  if (!yearString || typeof yearString !== 'string') return null;
  const match = yearString.match(/\b(\d{4})\b/);
  if (!match) return null;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) ? parsed : null;
};

export const isLikelyContentTitle = (title) => {
  if (!title || typeof title !== 'string') return false;
  const normalized = title.toLowerCase();
  const noisyPatterns = [
    'trailer',
    'teaser',
    'behind the scenes',
    'making of',
  ];
  return !noisyPatterns.some((pattern) => normalized.includes(pattern));
};

export const searchMoviesByQueries = async (queries, options = {}) => {
  const { type, year, pages = 1 } = options;
  const safeQueries = Array.isArray(queries) ? queries.filter(Boolean) : [];
  const maxPages = Math.max(1, Number.parseInt(pages, 10) || 1);

  const merged = new Map();

  for (const query of safeQueries) {
    for (let page = 1; page <= maxPages; page += 1) {
      try {
        const result = await searchMultipleMovies(query, { type, year, page });
        if (result.Response !== 'True' || !Array.isArray(result.Search)) continue;

        result.Search.forEach((movie) => {
          if (!movie?.imdbID) return;
          if (!merged.has(movie.imdbID)) {
            merged.set(movie.imdbID, {
              ...movie,
              matchedQueries: new Set([query]),
            });
            return;
          }
          const existing = merged.get(movie.imdbID);
          existing.matchedQueries.add(query);
        });
      } catch {
        // Continue collecting partial results if one request fails.
      }
    }
  }

  return Array.from(merged.values()).map((movie) => ({
    ...movie,
    matchedQueries: Array.from(movie.matchedQueries),
  }));
};

export const getMovieById = async (imdbId) => {
  const params = new URLSearchParams({
    apikey: process.env.REACT_APP_OMDB_API,
    i:imdbId,
    plot:'full'
  });
  try {
    const url = `https://www.omdbapi.com/?${params}`;
    const response = await axios.get(url);

    if (response?.data?.Response === 'True' && !hasValidPoster(response.data.Poster)) {
      try {
        const title = typeof response.data.Title === 'string' ? response.data.Title.trim() : '';
        if (title) {
          const detailType = typeof response.data.Type === 'string' ? response.data.Type : undefined;
          const detailYear = extractYear(response.data.Year);
          const searchResult = await searchMultipleMovies(title, {
            type: detailType,
            year: detailYear || undefined,
            page: 1,
          });

          if (searchResult?.Response === 'True' && Array.isArray(searchResult.Search)) {
            const candidates = searchResult.Search;
            const fallbackById = candidates.find(
              (movie) => movie?.imdbID === response.data.imdbID && hasValidPoster(movie?.Poster)
            );

            const normalizedTitle = title.toLowerCase();
            const fallbackByTitleAndYear =
              fallbackById ||
              candidates.find((movie) => {
                if (!hasValidPoster(movie?.Poster)) return false;
                if (typeof movie?.Title !== 'string') return false;
                if (movie.Title.trim().toLowerCase() !== normalizedTitle) return false;
                if (!detailYear) return false;
                return extractYear(movie?.Year) === detailYear;
              });

            if (fallbackByTitleAndYear?.Poster) {
              response.data.Poster = fallbackByTitleAndYear.Poster;
            }
          }
        }
      } catch {
        // Keep detail response backward-compatible if enrichment fails.
      }
    }

    return response.data;
  } catch (error) {
    console.error('Error fetching movie details:', error);
    return null;
  }
};

export const getMovieSummaryById = async (imdbId) => {
  const params = new URLSearchParams({
    apikey: process.env.REACT_APP_OMDB_API,
    i: imdbId,
    plot: 'short'
  });

  try {
    const response = await fetch(`https://www.omdbapi.com/?${params}`);
    const data = await response.json();
    if (data?.Response !== 'True') return null;
    return data;
  } catch {
    return null;
  }
};

/**
 * Fetch season-specific data for a TV series
 * @param {string} imdbId - The IMDB ID of the series
 * @param {number} seasonNumber - The season number to fetch (1-indexed)
 * @returns {Promise<Object|null>} Season data with episodes, or null if not found
 */
export const getMovieSeasonData = async (imdbId, seasonNumber) => {
  if (!imdbId || !Number.isFinite(seasonNumber) || seasonNumber < 1) {
    return null;
  }

  const params = new URLSearchParams({
    apikey: process.env.REACT_APP_OMDB_API,
    i: imdbId,
    Season: String(seasonNumber),
  });

  try {
    const response = await axios.get(`https://www.omdbapi.com/?${params}`);
    
    if (response?.data?.Response === 'True') {
      return response.data;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching season ${seasonNumber} for ${imdbId}:`, error);
    return null;
  }
};

export const searchMoviesWithFilters = async (search = {}, options = {}) => {
  const page = Math.max(1, Number.parseInt(options.page, 10) || 1);
  const type = normalizeTypeFilter(search.type);
  const yearRange = parseSearchYearRange(search.yearRange);
  const keywordTokens = extractMeaningfulTokens(search.query, 3);
  const normalizedQuery = typeof search.query === 'string' ? search.query.trim() : '';
  const seedQueries = buildSeedQueries(search);
  const detailLimit = Math.min(
    ADVANCED_ENRICH_LIMIT + (page - 1) * SEARCH_PAGE_SIZE,
    ADVANCED_ENRICH_LIMIT + SEARCH_PAGE_SIZE * 2
  );
  const merged = new Map();
  const exactYear =
    yearRange.isValid && yearRange.startYear && yearRange.startYear === yearRange.endYear
      ? yearRange.startYear
      : undefined;

  const seedMovies = Array.isArray(options.seedMovies) ? options.seedMovies : [];
  seedMovies.forEach((movie) => mergeCandidateMovie(merged, movie, null, 8));

  if (normalizedQuery) {
    const primaryResults = await searchMoviesByQueries([normalizedQuery], {
      type,
      year: exactYear,
      pages: Math.min(3, page + 1),
    });
    primaryResults.forEach((movie) => mergeCandidateMovie(merged, movie, normalizedQuery, 0));
  }

  const supplementalQueries = seedQueries.filter((query) => query !== normalizedQuery);
  if (supplementalQueries.length > 0) {
    const supplementalResults = await searchMoviesByQueries(supplementalQueries, {
      type,
      year: exactYear,
      pages: 1,
    });
    supplementalResults.forEach((movie) => {
      const matchedQuery = Array.isArray(movie.matchedQueries) ? movie.matchedQueries[0] : null;
      mergeCandidateMovie(merged, movie, matchedQuery, 2);
    });
  }

  const candidatePool = Array.from(merged.values())
    .filter((movie) => matchesTypeFilter(movie, type))
    .filter((movie) => matchesYearRange(movie, yearRange))
    .map((movie) => ({
      ...movie,
      __summaryScore:
        (normalizedQuery ? scoreSearchCandidate(normalizedQuery, movie, normalizedQuery) : 0) +
        (movie.__seedBoost || 0) +
        (Array.isArray(movie.matchedQueries) ? movie.matchedQueries.length * 2 : 0),
    }))
    .sort((left, right) => right.__summaryScore - left.__summaryScore)
    .slice(0, Math.max(detailLimit, SEARCH_PAGE_SIZE));

  const enrichedCandidates = await Promise.all(
    candidatePool.map(async (movie) => {
      const details = await getMovieSummaryById(movie.imdbID);
      if (!details) {
        return movie;
      }

      return {
        ...movie,
        ...details,
        matchedQueries: movie.matchedQueries,
        __seedBoost: movie.__seedBoost,
      };
    })
  );

  const filtered = enrichedCandidates
    .filter((movie) => matchesTypeFilter(movie, type))
    .filter((movie) => matchesYearRange(movie, yearRange))
    .filter((movie) => matchesGenreFilter(movie, search.genre))
    .filter((movie) => matchesRegionFilter(movie, search.languageOrCountry))
    .filter((movie) => {
      if (!normalizedQuery) return true;
      if (!hasActiveAdvancedFilters(search) && normalizedQuery.length < 3) return true;
      return matchesKeywordIntent(movie, keywordTokens);
    })
    .map((movie) => ({
      ...movie,
      __score: scoreDetailedCandidate(movie, search, keywordTokens, yearRange),
    }))
    .sort((left, right) => right.__score - left.__score);

  const offset = (page - 1) * SEARCH_PAGE_SIZE;
  const pagedResults = filtered.slice(offset, offset + SEARCH_PAGE_SIZE).map(
    ({ __score, __seedBoost, __summaryScore, ...movie }) => movie
  );

  if (pagedResults.length === 0) {
    return {
      Response: 'False',
      Error: yearRange.isValid ? 'No matches found.' : 'Enter a year like 2019 or 2019-2022.',
      Search: [],
      totalResults: '0',
    };
  }

  return {
    Response: 'True',
    Search: pagedResults,
    totalResults: String(filtered.length),
  };
};