import axios from 'axios';

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

const coerceIntegerYear = (value) => {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
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
