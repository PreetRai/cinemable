import axios from 'axios';

const hasValidPoster = (poster) =>
  typeof poster === 'string' && poster.trim() !== '' && poster !== 'N/A';

const extractYear = (yearString) => {
  if (!yearString || typeof yearString !== 'string') return null;
  const match = yearString.match(/\b(\d{4})\b/);
  return match ? match[1] : null;
};

// Add a new function for searching multiple movies
export const searchMultipleMovies = async (searchTerm, options = {}) => {
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