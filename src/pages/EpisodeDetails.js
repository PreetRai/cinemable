import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { getMovieById, getMovieSeasonData } from '../services/omdbApi';

const FALLBACK_POSTER = 'https://via.placeholder.com/300x450?text=No+Poster';

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

const EpisodeWatchlistButton = ({ episode, series }) => {
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [episodeItem, setEpisodeItem] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();

        const watchlist = userData?.watchlist || [];
        const watchedMovies = userData?.watchedMovies || [];

        const watchlistItem = watchlist.find(
          (item) =>
            item.type === 'episode' &&
            item.imdbID === episode.imdbID &&
            item.seasonNumber === episode.seasonNumber &&
            item.episodeNumber === episode.episodeNumber
        );
        const watchedItem = watchedMovies.find(
          (item) =>
            item.type === 'episode' &&
            item.imdbID === episode.imdbID &&
            item.seasonNumber === episode.seasonNumber &&
            item.episodeNumber === episode.episodeNumber
        );

        setIsInWatchlist(!!watchlistItem);
        setIsWatched(!!watchedItem);
        setEpisodeItem(watchlistItem || watchedItem);
      }
    };
    checkStatus();
  }, [user, episode.imdbID, episode.seasonNumber, episode.episodeNumber]);

  const handleToggle = async () => {
    const userRef = doc(db, 'users', user.uid);
    const newItem = {
      type: 'episode',
      imdbID: episode.imdbID,
      seasonNumber: episode.seasonNumber,
      episodeNumber: episode.episodeNumber,
      addedAt: new Date(),
      title: episode.Title,
      seriesTitle: series?.Title || 'Unknown Series',
      rating: episode.imdbRating,
      aired: episode.Released,
      runtime: episode.Runtime,
      plot: episode.Plot,
    };

    if (isWatched) {
      // Move from watched to watchlist
      await updateDoc(userRef, {
        watchedMovies: arrayRemove(episodeItem),
        watchlist: arrayUnion(newItem),
      });
      setIsWatched(false);
      setIsInWatchlist(true);
    } else if (isInWatchlist) {
      // Move from watchlist to watched
      await updateDoc(userRef, {
        watchlist: arrayRemove(episodeItem),
        watchedMovies: arrayUnion(newItem),
      });
      setIsInWatchlist(false);
      setIsWatched(true);
    } else {
      // Add to watchlist
      await updateDoc(userRef, {
        watchlist: arrayUnion(newItem),
      });
      setIsInWatchlist(true);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        onClick={handleToggle}
        className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
          isInWatchlist
            ? 'bg-[#e50914] text-white hover:bg-[#ffb3b7] hover:text-black'
            : 'border border-[#e50914] text-[#e50914] hover:bg-[#e50914] hover:text-white'
        }`}
      >
        {isInWatchlist ? '✓ Added to Watchlist' : '+ Watchlist'}
      </button>
      {isInWatchlist && (
        <button
          onClick={handleToggle}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white/70 transition hover:bg-white/10"
        >
          ✓ Watched
        </button>
      )}
    </div>
  );
};

const EpisodeDetails = () => {
  const { imdbID, seasonNumber, episodeNumber } = useParams();
  const navigate = useNavigate();
  const [series, setSeries] = useState(null);
  const [seasonData, setSeasonData] = useState(null);
  const [episode, setEpisode] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const seasonNum = parseInt(seasonNumber, 10);
  const episodeNum = parseInt(episodeNumber, 10);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch series data
        const seriesData = await getMovieById(imdbID);
        if (!seriesData || seriesData.Response !== 'True') {
          setError('Series not found');
          return;
        }
        setSeries(seriesData);

        // Fetch season data
        const season = await getMovieSeasonData(imdbID, seasonNum);
        if (!season || season.Response !== 'True') {
          setError('Season not found');
          return;
        }
        setSeasonData(season);

        // Find the episode
        const foundEpisode = season.Episodes?.find(
          (ep) => parseInt(ep.Episode, 10) === episodeNum
        );
        if (!foundEpisode) {
          setError('Episode not found');
          return;
        }
        setEpisode(foundEpisode);
      } catch (err) {
        console.error('Error loading episode details:', err);
        setError('Failed to load episode details');
      } finally {
        setLoading(false);
      }
    };

    if (imdbID && seasonNum && episodeNum) {
      loadData();
    }
  }, [imdbID, seasonNum, episodeNum]);

  const handlePrevEpisode = () => {
    if (episodeNum > 1) {
      navigate(`/episode/${imdbID}/${seasonNum}/${episodeNum - 1}`);
    }
  };

  const handleNextEpisode = () => {
    if (seasonData && episodeNum < seasonData.Episodes.length) {
      navigate(`/episode/${imdbID}/${seasonNum}/${episodeNum + 1}`);
    }
  };

  const handleBackToSeries = () => {
    navigate(`/movie/${imdbID}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414]">
        <Navbar />
        <div className="flex items-center justify-center pt-32">
          <div className="text-white">Loading episode details...</div>
        </div>
      </div>
    );
  }

  if (error || !episode || !series) {
    return (
      <div className="min-h-screen bg-[#141414]">
        <Navbar />
        <div className="flex flex-col items-center justify-center pt-32">
          <div className="text-white/70 text-lg">{error || 'Episode not found'}</div>
          <button
            onClick={handleBackToSeries}
            className="mt-4 rounded-lg bg-[#e50914] px-6 py-2 text-white font-semibold hover:bg-[#ffb3b7] hover:text-black transition"
          >
            Back to Series
          </button>
        </div>
      </div>
    );
  }

  const posterUrl = normalizePosterUrl(series.Poster);
  const actors = splitList(episode.Actors);
  const directors = splitList(episode.Director);
  const writers = splitList(episode.Writer);

  const canGoPrev = episodeNum > 1;
  const canGoNext = seasonData && episodeNum < seasonData.Episodes.length;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />

      {/* Breadcrumb Navigation */}
      <div className="border-b border-white/10 bg-black/40">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2 text-sm text-white/70">
            <button
              onClick={handleBackToSeries}
              className="hover:text-white transition"
            >
              {series.Title}
            </button>
            <span>/</span>
            <span>Season {seasonNum}</span>
            <span>/</span>
            <span className="text-white font-semibold">{episode.Title}</span>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Poster */}
          <div className="md:col-span-1">
            <img
              src={posterUrl}
              alt={series.Title}
              className="w-full rounded-2xl shadow-2xl"
            />
          </div>

          {/* Details */}
          <div className="md:col-span-2">
            {/* Episode Header */}
            <div className="mb-6">
              <div className="flex items-baseline gap-3 mb-2">
                <span className="inline-block rounded-lg bg-[#e50914] px-3 py-1 text-sm font-bold text-white">
                  Season {seasonNum}, Episode {String(episodeNum).padStart(2, '0')}
                </span>
                <span className="text-white/60 text-sm">Episode</span>
              </div>
              <h1 className="text-4xl font-bold text-white mb-2">{episode.Title}</h1>
              <div className="flex flex-wrap items-center gap-4 text-white/70 text-sm">
                {episode.Released && episode.Released !== 'N/A' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[#e50914]">📅</span>
                    {episode.Released}
                  </div>
                )}
                {episode.Runtime && episode.Runtime !== 'N/A' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[#e50914]">⏱️</span>
                    {episode.Runtime}
                  </div>
                )}
                {episode.imdbRating && episode.imdbRating !== 'N/A' && (
                  <div className="flex items-center gap-1">
                    <span className="text-[#e50914]">★</span>
                    <span className="font-semibold">{episode.imdbRating}</span>
                    {episode.imdbVotes && episode.imdbVotes !== 'N/A' && (
                      <span className="text-white/50">({episode.imdbVotes.toLocaleString()} votes)</span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Watchlist Button */}
            <div className="mb-8">
              <EpisodeWatchlistButton episode={{ imdbID, seasonNumber: seasonNum, episodeNumber: episodeNum, ...episode }} series={series} />
            </div>

            {/* Plot */}
            {episode.Plot && episode.Plot !== 'N/A' && (
              <div className="mb-8">
                <h2 className="text-xl font-bold text-white mb-3">Plot Summary</h2>
                <p className="text-white/80 leading-relaxed">{episode.Plot}</p>
              </div>
            )}

            {/* Directors */}
            {directors.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">Director{directors.length > 1 ? 's' : ''}</h3>
                <div className="flex flex-wrap gap-2">
                  {directors.map((director) => (
                    <span key={director} className="rounded-lg bg-white/5 px-3 py-1 text-white/80">
                      {director}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Writers */}
            {writers.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-2">Writer{writers.length > 1 ? 's' : ''}</h3>
                <div className="flex flex-wrap gap-2">
                  {writers.map((writer) => (
                    <span key={writer} className="rounded-lg bg-white/5 px-3 py-1 text-white/80">
                      {writer}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Cast */}
            {actors.length > 0 && (
              <div className="mb-8">
                <h3 className="text-sm font-semibold text-white/60 uppercase tracking-wider mb-3">Cast</h3>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {actors.map((actor) => (
                    <div key={actor} className="rounded-lg bg-white/5 px-3 py-2 text-white/80 text-sm">
                      {actor}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="mt-12 flex gap-4 border-t border-white/10 pt-8">
          <button
            onClick={handlePrevEpisode}
            disabled={!canGoPrev}
            className={`flex-1 rounded-lg px-6 py-3 text-center font-semibold transition ${
              canGoPrev
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-white/5 text-white/40 cursor-not-allowed'
            }`}
          >
            ← Previous Episode
          </button>
          <button
            onClick={handleBackToSeries}
            className="flex-1 rounded-lg bg-[#e50914] px-6 py-3 text-center font-semibold text-white hover:bg-[#ffb3b7] hover:text-black transition"
          >
            Back to Series
          </button>
          <button
            onClick={handleNextEpisode}
            disabled={!canGoNext}
            className={`flex-1 rounded-lg px-6 py-3 text-center font-semibold transition ${
              canGoNext
                ? 'bg-white/10 text-white hover:bg-white/20'
                : 'bg-white/5 text-white/40 cursor-not-allowed'
            }`}
          >
            Next Episode →
          </button>
        </div>
      </div>
    </div>
  );
};

export default EpisodeDetails;
