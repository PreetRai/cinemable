import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getMovieById,
  parseMovieYear,
  searchMoviesByQueries,
} from '../services/omdbApi';
import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from './Navbar';
import WatchlistButton from '../components/WatchlistButton';
import RecommendButton from '../components/RecommendButton';

const FALLBACK_POSTER = 'https://via.placeholder.com/300x450?text=No+Poster';
const FALLBACK_BACKDROP = 'https://via.placeholder.com/1200x675?text=Cinemable';
const REVIEW_COLLECTION = 'movieReviews';
const STOP_WORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'from',
  'that',
  'this',
  'movie',
  'film',
  'series',
  'season',
  'part',
  'episode',
  'story',
]);

const safeArray = (value) => (Array.isArray(value) ? value : []);

const uniq = (items) => Array.from(new Set(items.filter(Boolean)));

const normalizePosterUrl = (poster) => {
  if (typeof poster !== 'string') return FALLBACK_POSTER;
  const trimmedPoster = poster.trim();
  if (!trimmedPoster || trimmedPoster === 'N/A') return FALLBACK_POSTER;

  let normalizedPoster = trimmedPoster;
  if (normalizedPoster.startsWith('http://')) {
    normalizedPoster = `https://${normalizedPoster.slice(7)}`;
  } else if (normalizedPoster.startsWith('//')) {
    normalizedPoster = `https:${normalizedPoster}`;
  }

  if (!normalizedPoster.startsWith('https://')) return FALLBACK_POSTER;
  return normalizedPoster;
};

const formatDisplayValue = (value, fallback = 'N/A') => {
  if (!value || value === 'N/A') return fallback;
  return value;
};

const splitList = (value) => {
  if (!value || value === 'N/A') return [];
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

const extractTitleKeywords = (title) => {
  if (!title || typeof title !== 'string') return [];
  return title
    .replace(/[\u2019']/g, ' ')
    .split(/[^a-zA-Z0-9]+/)
    .map((token) => token.trim().toLowerCase())
    .filter((token) => token.length > 3 && !STOP_WORDS.has(token));
};

const getRuntimeLabel = (movie) => {
  if (!movie?.Runtime || movie.Runtime === 'N/A') {
    return movie?.Type === 'series' ? 'Series runtime not listed' : 'Runtime not listed';
  }

  if (movie.Runtime === '1 min' && movie?.Type === 'series') {
    return 'TV Series';
  }

  return movie.Runtime;
};

const getYearNumber = (movie) => parseMovieYear(movie?.Year || movie?.Released || '');

const scoreRelatedMovie = (candidate, seedMovie, seedYear, seedGenres) => {
  const candidateYear = parseMovieYear(candidate.Year);
  const candidateGenres = splitList(candidate.Genre).map((genre) => genre.toLowerCase());
  const candidateTitle = (candidate.Title || '').toLowerCase();
  const seedKeywords = extractTitleKeywords(seedMovie?.Title);
  const candidateKeywords = extractTitleKeywords(candidate.Title);

  let score = 0;

  if (candidateYear && seedYear) {
    const yearGap = Math.abs(candidateYear - seedYear);
    score += Math.max(0, 28 - yearGap * 4);
  }

  const sharedGenres = seedGenres.filter((genre) => candidateGenres.includes(genre.toLowerCase()));
  score += sharedGenres.length * 16;

  const sharedKeywords = seedKeywords.filter((keyword) => candidateKeywords.includes(keyword));
  score += sharedKeywords.length * 10;

  if (seedMovie?.Type && candidate.Type === seedMovie.Type) {
    score += 8;
  }

  if (seedMovie?.Title && candidateTitle.includes(seedMovie.Title.toLowerCase())) {
    score += 8;
  }

  if (candidate.imdbRating && candidate.imdbRating !== 'N/A') {
    const rating = Number.parseFloat(candidate.imdbRating);
    if (Number.isFinite(rating)) score += Math.min(12, rating);
  }

  return score;
};

const formatTimestamp = (value) => {
  if (!value) return 'Just now';
  const millis = typeof value?.toDate === 'function' ? value.toDate().getTime() : value?.seconds ? value.seconds * 1000 : Date.now();
  const diffMinutes = Math.max(0, Math.floor((Date.now() - millis) / 60000));
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return new Date(millis).toLocaleDateString();
};

const Section = ({ eyebrow, title, description, children, className = '' }) => (
  <section className={`rounded-3xl border border-white/5 bg-[#1a1a1a]/90 shadow-[0_18px_60px_rgba(0,0,0,0.32)] backdrop-blur-xl ${className}`}>
    <div className="flex items-end justify-between gap-4 border-b border-white/5 px-5 py-4 md:px-6">
      <div>
        {eyebrow && <p className="text-[11px] uppercase tracking-[0.26em] text-white/45">{eyebrow}</p>}
        <h2 className="mt-1 text-xl font-black tracking-tight text-white md:text-2xl">{title}</h2>
        {description && <p className="mt-1 text-sm leading-relaxed text-white/60">{description}</p>}
      </div>
      {children && false}
    </div>
    <div className="px-5 py-5 md:px-6">{children}</div>
  </section>
);

const InfoChip = ({ children, tone = 'default' }) => {
  const styles = {
    default: 'border-white/10 bg-white/5 text-white/75',
    accent: 'border-[#e50914]/25 bg-[#e50914]/12 text-[#ffb3b7]',
    soft: 'border-white/10 bg-black/20 text-white/70',
    success: 'border-emerald-400/25 bg-emerald-400/10 text-emerald-100',
  };

  return (
    <span className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold ${styles[tone]}`}>
      {children}
    </span>
  );
};

const TextBlock = ({ label, value }) => (
  <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
    <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{label}</p>
    <p className="mt-2 text-sm leading-relaxed text-white/78">{value}</p>
  </div>
);

const MovieDetails = () => {
  const { user } = useAuth();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [relatedMovies, setRelatedMovies] = useState([]);
  const [communitySignals, setCommunitySignals] = useState([]);
  const [relatedInterestNotes, setRelatedInterestNotes] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [profileName, setProfileName] = useState('');
  const { id } = useParams();

  const posterSrc = normalizePosterUrl(movie?.Poster);
  const backdropSrc = normalizePosterUrl(movie?.Poster || FALLBACK_BACKDROP);
  const playUrl = movie ? `https://www.playimdb.com/title/${movie.imdbID}/` : '';

  const genres = useMemo(() => splitList(movie?.Genre), [movie?.Genre]);
  const castMembers = useMemo(() => splitList(movie?.Actors), [movie?.Actors]);
  const writers = useMemo(() => splitList(movie?.Writer), [movie?.Writer]);
  const directors = useMemo(() => splitList(movie?.Director), [movie?.Director]);
  const countries = useMemo(() => splitList(movie?.Country), [movie?.Country]);
  const languages = useMemo(() => splitList(movie?.Language), [movie?.Language]);
  const titleKeywords = useMemo(() => extractTitleKeywords(movie?.Title), [movie?.Title]);
  const yearNumber = useMemo(() => getYearNumber(movie), [movie]);
  const topCast = castMembers.slice(0, 6);
  const fullCast = castMembers.slice(6);
  const primaryCastSummary = topCast.length > 0 ? topCast.join(' • ') : 'Cast not listed';

  const infoChips = [
    movie?.Type === 'series'
      ? `Series${movie?.totalSeasons ? ` • ${movie.totalSeasons} seasons` : ''}`
      : 'Feature film',
    movie?.Year,
    movie?.Rated,
    getRuntimeLabel(movie),
    movie?.Released,
  ].filter(Boolean);

  const stats = [
    {
      label: 'IMDb rating',
      value: movie?.imdbRating && movie.imdbRating !== 'N/A' ? `${movie.imdbRating}/10` : 'Not rated',
    },
    {
      label: 'Votes',
      value: movie?.imdbVotes && movie.imdbVotes !== 'N/A' ? movie.imdbVotes : 'Not listed',
    },
    {
      label: 'Runtime',
      value: getRuntimeLabel(movie),
    },
    {
      label: 'Release',
      value: formatDisplayValue(movie?.Released, 'Not listed'),
    },
  ];

  const detailBlocks = [
    {
      label: 'Details',
      items: [
        ['Runtime', getRuntimeLabel(movie)],
        ['Released', formatDisplayValue(movie?.Released, 'Not listed')],
        ['Rated', formatDisplayValue(movie?.Rated, 'Not rated')],
        ['Genre', genres.join(', ') || 'Not listed'],
        ['Director', directors.join(', ') || 'Not listed'],
        ['Writer', writers.join(', ') || 'Not listed'],
        ['Actors', primaryCastSummary],
        ['Language', languages.join(', ') || 'Not listed'],
        ['Country', countries.join(', ') || 'Not listed'],
        ['Awards', formatDisplayValue(movie?.Awards, 'No awards listed')],
      ],
    },
    {
      label: 'Box office',
      items: [
        ['Box office', formatDisplayValue(movie?.BoxOffice, 'Not listed')],
        ['Production', formatDisplayValue(movie?.Production, 'Not listed')],
        ['DVD', formatDisplayValue(movie?.DVD, 'Not listed')],
        ['Website', movie?.Website && movie.Website !== 'N/A' ? movie.Website : 'Not listed'],
      ],
    },
    {
      label: 'Tech spec',
      items: [
        ['Type', movie?.Type || 'Not listed'],
        ['Series info', movie?.Type === 'series' ? `${movie?.totalSeasons || 'Unknown'} seasons` : 'Feature release'],
        ['Runtime', getRuntimeLabel(movie)],
        ['Language', languages.join(', ') || 'Not listed'],
        ['Country', countries.join(', ') || 'Not listed'],
        ['Aspect ratio', 'Not listed by OMDB'],
      ],
    },
  ];

  const storylineSummary = movie?.Plot && movie.Plot !== 'N/A'
    ? movie.Plot
    : 'No storyline summary is available from OMDB for this title.';

  const photos = useMemo(() => {
    const posterItems = [
      {
        id: movie?.imdbID || 'main-poster',
        src: posterSrc,
        title: movie?.Title || 'Poster',
        caption: 'Primary poster',
      },
      ...relatedMovies.slice(0, 5).map((item) => ({
        id: item.imdbID,
        src: normalizePosterUrl(item.Poster),
        title: item.Title,
        caption: 'Related title poster',
      })),
    ];

    return uniq(posterItems.map((item) => item.id)).map((idValue) => posterItems.find((item) => item.id === idValue));
  }, [movie?.imdbID, movie?.Title, posterSrc, relatedMovies]);

  useEffect(() => {
    let isMounted = true;

    const fetchMovieDetails = async () => {
      setLoading(true);
      const result = await getMovieById(id);
      if (!isMounted) return;

      if (result && result.Response === 'True') {
        setMovie(result);
      } else {
        setMovie(null);
      }
      setLoading(false);
    };

    fetchMovieDetails();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchEnrichment = async () => {
      if (!movie?.imdbID) return;

      setRelatedLoading(true);
      try {
        const queries = uniq([
          ...genres.slice(0, 4).map((genre) => genre.toLowerCase()),
          ...titleKeywords.slice(0, 4),
          movie.Title?.split(':')[0],
        ]).filter((queryValue) => typeof queryValue === 'string' && queryValue.trim().length > 1);

        const [yearMatches, generalMatches] = await Promise.all([
          searchMoviesByQueries(queries, {
            type: movie.Type === 'series' ? 'series' : 'movie',
            year: yearNumber || undefined,
            pages: 1,
          }),
          searchMoviesByQueries(queries, {
            type: movie.Type === 'series' ? 'series' : 'movie',
            pages: 1,
          }),
        ]);

        const merged = new Map();
        [...safeArray(yearMatches), ...safeArray(generalMatches)].forEach((item) => {
          if (!item?.imdbID || item.imdbID === movie.imdbID) return;
          if (!merged.has(item.imdbID)) {
            merged.set(item.imdbID, item);
          }
        });

        const ranked = Array.from(merged.values())
          .sort((a, b) => scoreRelatedMovie(b, movie, yearNumber, genres) - scoreRelatedMovie(a, movie, yearNumber, genres))
          .slice(0, 12);

        if (isMounted) {
          setRelatedMovies(ranked);
        }
      } catch (error) {
        console.error('Failed to load related titles:', error);
        if (isMounted) {
          setRelatedMovies([]);
        }
      } finally {
        if (isMounted) {
          setRelatedLoading(false);
        }
      }
    };

    const fetchCommunityData = async () => {
      if (!movie?.imdbID) return;

      try {
        const [movieRecommendationSnapshot, groupSnapshot] = await Promise.all([
          getDocs(query(collection(db, 'recommendations'), where('movieId', '==', movie.imdbID))),
          getDocs(collection(db, 'groups')),
        ]);

        const groupNameById = groupSnapshot.docs.reduce((acc, groupDoc) => {
          acc[groupDoc.id] = groupDoc.data()?.name || 'Group';
          return acc;
        }, {});

        const currentUserGroups = user
          ? groupSnapshot.docs
              .map((groupDoc) => ({ id: groupDoc.id, ...groupDoc.data() }))
              .filter((group) => Array.isArray(group.members) && group.members.some((member) => member?.userId === user.uid))
          : [];

        const allRecommendationDocs = movieRecommendationSnapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...docSnap.data(),
        }));

        const movieSignals = allRecommendationDocs.map((rec) => ({
          id: rec.id,
          groupName: groupNameById[rec.groupId] || 'Group',
          recommenderCount: safeArray(rec.recommendedBy).length,
          groupId: rec.groupId,
        }));

        const interestNotes = [];
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};
          const favorites = safeArray(userData?.preferences?.favoriteGenres);
          const watchlist = safeArray(userData?.watchlist);
          const watchedMovies = safeArray(userData?.watchedMovies);

          setProfileName(userData?.name || user.displayName || user.email?.split('@')[0] || 'You');

          const matchedFavorites = genres.filter((genre) => favorites.includes(genre));
          if (matchedFavorites.length > 0) {
            interestNotes.push(`Matches your favorite genres: ${matchedFavorites.join(', ')}`);
          }

          const watchlistOverlap = watchlist.some((item) => item?.genre && genres.some((genre) => item.genre.includes(genre)));
          if (watchlistOverlap) {
            interestNotes.push('Connects with films already sitting in your watchlist');
          }

          const watchedOverlap = watchedMovies.some((item) => item?.genre && genres.some((genre) => item.genre.includes(genre)));
          if (watchedOverlap) {
            interestNotes.push('Shares taste markers with titles you have already watched');
          }

          if (currentUserGroups.length > 0 && movieSignals.length > 0) {
            const currentGroupMatches = movieSignals.filter((signal) => currentUserGroups.some((group) => group.id === signal.groupId));
            if (currentGroupMatches.length > 0) {
              interestNotes.push(`Recommended in ${currentGroupMatches.length} of your groups`);
            }
          }
        }

        if (!interestNotes.length && movieSignals.length > 0) {
          interestNotes.push(`Community activity: ${movieSignals.length} recommendation thread${movieSignals.length === 1 ? '' : 's'}`);
        }

        if (!interestNotes.length && genres.length > 0) {
          interestNotes.push(`Relevant to fans of ${genres.slice(0, 2).join(' and ')}`);
        }

        if (isMounted) {
          setCommunitySignals(movieSignals.slice(0, 3));
          setRelatedInterestNotes(interestNotes.slice(0, 4));
        }
      } catch (error) {
        console.error('Failed to load community data:', error);
        if (isMounted) {
          setCommunitySignals([]);
          setRelatedInterestNotes([]);
        }
      }
    };

    const fetchReviews = async () => {
      if (!movie?.imdbID) return;

      try {
        const reviewSnapshot = await getDocs(query(collection(db, REVIEW_COLLECTION), where('movieId', '==', movie.imdbID)));
        const reviewList = reviewSnapshot.docs
          .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
          .sort((a, b) => {
            const aMillis = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
            const bMillis = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
            return bMillis - aMillis;
          });

        if (isMounted) {
          setReviews(reviewList);
        }
      } catch (error) {
        console.error('Failed to load reviews:', error);
        if (isMounted) {
          setReviews([]);
        }
      }
    };

    fetchEnrichment();
    fetchCommunityData();
    fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [movie, user, genres, titleKeywords, yearNumber]);

  const handleSubmitReview = async () => {
    if (!user || !movie?.imdbID || !reviewText.trim()) return;

    setReviewSaving(true);
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const userData = userDoc.exists() ? userDoc.data() : {};
      const reviewerName = userData?.name || user.displayName || user.email?.split('@')[0] || 'Anonymous';

      await addDoc(collection(db, REVIEW_COLLECTION), {
        movieId: movie.imdbID,
        movieTitle: movie.Title,
        userId: user.uid,
        userName: reviewerName,
        rating: reviewRating ? Number.parseInt(reviewRating, 10) : null,
        text: reviewText.trim(),
        createdAt: serverTimestamp(),
      });

      setReviewText('');
      setReviewRating('');

      const reviewSnapshot = await getDocs(query(collection(db, REVIEW_COLLECTION), where('movieId', '==', movie.imdbID)));
      const reviewList = reviewSnapshot.docs
        .map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => {
          const aMillis = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
          const bMillis = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
          return bMillis - aMillis;
        });
      setReviews(reviewList);
    } catch (error) {
      console.error('Failed to save review:', error);
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-24">
          <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] px-6 py-5 text-lg text-white/80 shadow-2xl">
            Loading movie details...
          </div>
        </div>
      </div>
    );
  }

  if (!movie) {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <Navbar />
        <div className="flex items-center justify-center px-4 py-24">
          <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] px-6 py-5 text-lg text-white/80 shadow-2xl">
            Movie not found
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />

      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <img
            src={backdropSrc}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-3xl opacity-15"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = FALLBACK_BACKDROP;
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.18),transparent_35%),linear-gradient(to_bottom,rgba(20,20,20,0.12),rgba(20,20,20,0.95)_55%,#141414)]" />
        </div>

        <div className="relative mx-auto max-w-7xl px-4 py-6 pb-24 md:px-6 md:py-10 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(280px,340px)_1fr]">
            <aside className="self-start lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-[2rem] border border-white/5 bg-[#1a1a1a] shadow-[0_28px_90px_rgba(0,0,0,0.5)]">
                <img
                  src={posterSrc}
                  alt={movie.Title}
                  className="aspect-[2/3] w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = FALLBACK_POSTER;
                  }}
                />
              </div>

              <div className="mt-4 flex flex-col gap-3">
                <a
                  href={playUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#e50914] px-5 py-3 font-semibold text-white shadow-lg shadow-[#e50914]/20 transition-colors hover:bg-[#c40812]"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.752 11.168l-6.518-3.755A1 1 0 007 8.277v7.446a1 1 0 001.234.97l6.518-1.78A1 1 0 0016 13.97v-1.643a1 1 0 00-.752-1.159z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 4h14v16H5z" />
                  </svg>
                  Play
                </a>
                <WatchlistButton movie={movie} />
                <RecommendButton movie={movie} />
              </div>
            </aside>

            <div className="space-y-6">
              <section className="rounded-[2rem] border border-white/5 bg-[#1a1a1a]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.4)] backdrop-blur-xl md:p-7">
                <div className="flex flex-wrap items-center gap-2">
                  {infoChips.map((chip) => (
                    <InfoChip key={chip} tone={chip === movie.Rated ? 'accent' : 'default'}>
                      {chip}
                    </InfoChip>
                  ))}
                  {movie.imdbRating && movie.imdbRating !== 'N/A' && (
                    <InfoChip tone="success">IMDb {movie.imdbRating}</InfoChip>
                  )}
                </div>

                <div className="mt-5 flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-4xl">
                    <h1 className="text-4xl font-black leading-tight tracking-tight md:text-6xl">
                      {movie.Title}
                    </h1>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {genres.map((genre) => (
                        <InfoChip key={genre} tone="soft">
                          {genre}
                        </InfoChip>
                      ))}
                    </div>

                    <p className="mt-5 max-w-4xl text-base leading-relaxed text-white/78 md:text-lg">
                      {storylineSummary}
                    </p>

                    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                      {stats.map((stat) => (
                        <div key={stat.label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">{stat.label}</p>
                          <p className="mt-2 text-sm font-semibold text-white">{stat.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="w-full max-w-md rounded-3xl border border-white/5 bg-black/20 p-4 shadow-inner shadow-black/20">
                    <p className="text-[11px] uppercase tracking-[0.25em] text-white/45">Primary cast</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {topCast.length > 0 ? topCast.map((member) => (
                        <span key={member} className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80">
                          {member}
                        </span>
                      )) : (
                        <span className="text-sm text-white/60">Cast not listed</span>
                      )}
                    </div>
                    {fullCast.length > 0 && (
                      <p className="mt-3 text-xs leading-relaxed text-white/55">
                        Additional cast: {fullCast.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-2">
                <Section
                  eyebrow="Photos"
                  title="Visual preview"
                  description="OMDB does not provide still galleries, so this strip uses the main poster and related-title posters as a visual proxy."
                >
                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="min-w-[140px] max-w-[140px] overflow-hidden rounded-2xl border border-white/5 bg-white/5"
                      >
                        <img
                          src={photo.src}
                          alt={photo.title}
                          className="h-[210px] w-full object-cover"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = FALLBACK_POSTER;
                          }}
                        />
                        <div className="p-3">
                          <p className="text-sm font-semibold text-white line-clamp-2">{photo.title}</p>
                          <p className="mt-1 text-[11px] uppercase tracking-[0.18em] text-white/45">{photo.caption}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Section>

                <Section
                  eyebrow="Related interests"
                  title="Why this title surfaces"
                  description={user ? `Personalized for ${profileName || 'your profile'} and your activity signals.` : 'Log in to see personalized taste signals.'}
                >
                  <div className="space-y-3">
                    {relatedInterestNotes.length > 0 ? relatedInterestNotes.map((note) => (
                      <div key={note} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/80">
                        {note}
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70">
                        No personalized signal is available yet.
                      </div>
                    )}

                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">Top picks / community</p>
                      <div className="mt-3 space-y-3">
                        {communitySignals.length > 0 ? communitySignals.map((signal) => (
                          <div key={`${signal.groupId}:${signal.id}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-black/20 px-3 py-2">
                            <div>
                              <p className="text-sm font-semibold text-white">{signal.groupName}</p>
                              <p className="text-xs text-white/50">{signal.recommenderCount} recommender{signal.recommenderCount === 1 ? '' : 's'}</p>
                            </div>
                            <InfoChip tone="accent">Community pick</InfoChip>
                          </div>
                        )) : (
                          <div className="text-sm text-white/65">
                            No community recommendation data is attached yet, so related titles below act as the fallback top picks.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Section>
              </div>

              <Section
                eyebrow="Storyline"
                title="Plot and summary"
                description="A cleaner read on the movie’s premise with quick context chips for skimming."
              >
                <div className="grid gap-4 lg:grid-cols-[1.3fr_0.7fr]">
                  <div>
                    <p className="text-base leading-relaxed text-white/80 md:text-lg">{storylineSummary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {[getRuntimeLabel(movie), formatDisplayValue(movie?.Rated, 'Not rated'), ...genres.slice(0, 3)].map((chip) => (
                        <InfoChip key={chip}>{chip}</InfoChip>
                      ))}
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                    <TextBlock label="Release" value={formatDisplayValue(movie?.Released, 'Not listed')} />
                    <TextBlock label="Votes" value={formatDisplayValue(movie?.imdbVotes, 'Not listed')} />
                  </div>
                </div>
              </Section>

              <Section
                eyebrow="Top cast"
                title="Featured performers"
                description="Top cast is shown first, with the remaining list collapsed into a supporting summary."
              >
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {topCast.length > 0 ? topCast.map((member, index) => (
                    <div key={member} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#e50914]/15 text-sm font-black text-[#ffb3b7] ring-1 ring-[#e50914]/25">
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{member}</p>
                          <p className="text-xs text-white/50">Top billed</p>
                        </div>
                      </div>
                    </div>
                  )) : (
                    <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/65">
                      Cast information is not available.
                    </div>
                  )}
                </div>
              </Section>

              <Section
                eyebrow="More like this"
                title="Related titles"
                description="Ranked from genre overlap, title keywords, and year proximity, excluding the current movie."
              >
                {relatedLoading && relatedMovies.length === 0 ? (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/65">
                    Building related picks...
                  </div>
                ) : relatedMovies.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {relatedMovies.slice(0, 8).map((item) => (
                      <Link
                        key={item.imdbID}
                        to={`/movie/${item.imdbID}`}
                        className="group overflow-hidden rounded-2xl border border-white/5 bg-white/5 transition hover:-translate-y-1 hover:border-[#e50914]/30"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden">
                          <img
                            src={normalizePosterUrl(item.Poster)}
                            alt={item.Title}
                            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            onError={(e) => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.src = FALLBACK_POSTER;
                            }}
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                        </div>
                        <div className="p-4">
                          <p className="line-clamp-2 text-sm font-semibold text-white">{item.Title}</p>
                          <p className="mt-1 text-xs text-white/55">{item.Year || 'Year not listed'}</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/65">
                    No related titles were found from OMDB, so this section is intentionally quiet rather than empty.
                  </div>
                )}
              </Section>

              <div className="grid gap-6 xl:grid-cols-3">
                {detailBlocks.map((block) => (
                  <Section key={block.label} eyebrow={block.label} title={block.label}>
                    <div className="space-y-3">
                      {block.items.map(([label, value]) => (
                        <div key={`${block.label}:${label}`} className="flex items-start justify-between gap-4 rounded-2xl border border-white/5 bg-white/5 px-4 py-3">
                          <div className="min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.2em] text-white/45">{label}</p>
                            <p className="mt-1 text-sm leading-relaxed text-white/80 break-words">{value}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </Section>
                ))}
              </div>

              <Section
                eyebrow="User reviews"
                title="Community reactions"
                description="A lightweight Firestore-backed review list for signed-in users. Empty state is supported and non-blocking."
              >
                <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                  <div className="rounded-3xl border border-white/5 bg-black/20 p-4">
                    {user ? (
                      <div className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 block text-xs uppercase tracking-[0.2em] text-white/45">Rating</label>
                            <select
                              value={reviewRating}
                              onChange={(e) => setReviewRating(e.target.value)}
                              className="w-full rounded-xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none transition focus:border-[#e50914]"
                            >
                              <option value="">No rating</option>
                              {Array.from({ length: 10 }).map((_, index) => (
                                <option key={index + 1} value={index + 1}>
                                  {index + 1}/10
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70">
                            Posting as <span className="font-semibold text-white">{profileName || user.displayName || user.email?.split('@')[0] || 'You'}</span>
                          </div>
                        </div>

                        <textarea
                          value={reviewText}
                          onChange={(e) => setReviewText(e.target.value)}
                          placeholder="Write a short reaction, thought, or recommendation..."
                          rows={5}
                          className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 focus:border-[#e50914]"
                        />

                        <button
                          type="button"
                          onClick={handleSubmitReview}
                          disabled={reviewSaving || !reviewText.trim()}
                          className="inline-flex items-center justify-center rounded-xl bg-[#e50914] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#c40812] disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {reviewSaving ? 'Saving...' : 'Post review'}
                        </button>
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/70">
                        Sign in to leave a review and react to this title.
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    {reviews.length > 0 ? reviews.map((review) => (
                      <div key={review.id} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-sm font-semibold text-white">{review.userName || 'Anonymous'}</p>
                            <p className="text-xs text-white/45">{formatTimestamp(review.createdAt)}</p>
                          </div>
                          {review.rating ? <InfoChip tone="accent">{review.rating}/10</InfoChip> : null}
                        </div>
                        <p className="mt-3 text-sm leading-relaxed text-white/78">{review.text}</p>
                      </div>
                    )) : (
                      <div className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/65">
                        No reviews yet. The page stays useful even without community comments.
                      </div>
                    )}
                  </div>
                </div>
              </Section>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieDetails