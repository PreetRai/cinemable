import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import {getMovieById} from '../services/omdbApi';
import Navbar from './Navbar';
import WatchlistButton from '../components/WatchlistButton';
import RecommendButton from '../components/RecommendButton';
const MovieDetails = () => {
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const {id} = useParams();
    const posterSrc = movie?.Poster !== 'N/A' ? movie?.Poster : 'https://via.placeholder.com/300x450?text=No+Poster';
    const playUrl = movie ? `https://www.playimdb.com/title/${movie.imdbID}/` : '';
    const genres = !movie?.Genre || movie.Genre === 'N/A'
      ? []
      : movie.Genre.split(',').map((genre) => genre.trim());

    const formatRuntime = (runtime) => {
      return runtime === '1 min' && movie?.Type === 'series'
        ? 'TV Series'
        : runtime;
    };

    useEffect(() => {
        const fetchMovieDetails = async () => {
            const result = await getMovieById(id);
            if (result && result.Response === "True") {
                setMovie(result);
            }
            setLoading(false);
        };
        fetchMovieDetails();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-[#141414] text-white">
                <Navbar/>
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
                <Navbar/>
                <div className="flex items-center justify-center px-4 py-24">
                    <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] px-6 py-5 text-lg text-white/80 shadow-2xl">
                        Movie not found
                    </div>
                </div>
            </div>
        );
    }

    const infoPills = [
      movie.Type === 'series'
        ? `Series${movie.totalSeasons ? ` • ${movie.totalSeasons} seasons` : ''}`
        : 'Feature film',
      movie.Year,
      movie.Rated,
      formatRuntime(movie.Runtime),
      movie.Released,
    ].filter(Boolean);

    const detailStats = [
      { label: 'Rating', value: movie.imdbRating && movie.imdbRating !== 'N/A' ? `${movie.imdbRating}/10` : 'N/A' },
      { label: 'Votes', value: movie.imdbVotes && movie.imdbVotes !== 'N/A' ? movie.imdbVotes : 'N/A' },
      { label: 'Country', value: movie.Country && movie.Country !== 'N/A' ? movie.Country : 'N/A' },
      { label: 'Language', value: movie.Language && movie.Language !== 'N/A' ? movie.Language : 'N/A' },
    ];

    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <Navbar/>
        <div className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0">
            <img
              src={posterSrc}
              alt=""
              className="absolute inset-0 h-full w-full object-cover scale-110 blur-3xl opacity-10"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[#141414]/20 via-[#141414]/80 to-[#141414]" />
          </div>

          <div className="relative mx-auto max-w-7xl px-4 py-6 pb-24 md:px-6 md:py-10">
            <div className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/45">
              {infoPills.map((pill) => (
                <span key={pill} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-[0.18em] text-white/70">
                  {pill}
                </span>
              ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(280px,360px)_1fr]">
              <div className="lg:sticky lg:top-24 self-start">
                <div className="overflow-hidden rounded-3xl border border-white/5 bg-[#1a1a1a] shadow-[0_24px_80px_rgba(0,0,0,0.45)]">
                  <img
                    src={posterSrc}
                    alt={movie.Title}
                    className="aspect-[2/3] w-full object-cover"
                  />
                </div>
                <div className="mt-4 flex flex-col gap-3 sm:flex-row lg:flex-col">
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
                  <WatchlistButton movie={movie}/>
                  <RecommendButton movie={movie}/>
                </div>
              </div>

              <div className="space-y-6">
                <section className="rounded-3xl border border-white/5 bg-[#1a1a1a]/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-6">
                  <div className="flex flex-wrap gap-2">
                    {genres.map((genre) => (
                      <span key={genre} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/75">
                        {genre}
                      </span>
                    ))}
                  </div>

                  <h1 className="mt-4 text-4xl font-black leading-tight md:text-6xl">
                    {movie.Title}
                  </h1>

                  <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/75 md:text-lg">
                    {movie.Plot}
                  </p>

                  <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {detailStats.map((stat) => (
                      <div key={stat.label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                        <p className="text-xs uppercase tracking-[0.22em] text-white/45">{stat.label}</p>
                        <p className="mt-2 text-base font-semibold text-white">{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-3xl border border-white/5 bg-[#1a1a1a]/90 p-5 backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">Credits</p>
                    <h2 className="mt-2 text-xl font-bold">{movie.Type === 'series' ? 'Creator' : 'Director'}</h2>
                    <p className="mt-3 text-white/75">
                      {movie.Type === 'series' ? movie.Writer : movie.Director}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/5 bg-[#1a1a1a]/90 p-5 backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">Cast</p>
                    <h2 className="mt-2 text-xl font-bold">Featured performers</h2>
                    <p className="mt-3 text-white/75">
                      {movie.Actors}
                    </p>
                  </div>

                  <div className="rounded-3xl border border-white/5 bg-[#1a1a1a]/90 p-5 backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.22em] text-white/45">Details</p>
                    <h2 className="mt-2 text-xl font-bold">Release info</h2>
                    <div className="mt-3 space-y-2 text-white/75">
                      {movie.Type === 'series' && movie.totalSeasons && (
                        <div>Seasons: {movie.totalSeasons}</div>
                      )}
                      <div>Runtime: {formatRuntime(movie.Runtime)}</div>
                      <div>Released: {movie.Released}</div>
                      <div>Rated: {movie.Rated}</div>
                    </div>
                  </div>

                  {movie.Awards !== 'N/A' && (
                    <div className="rounded-3xl border border-white/5 bg-[#1a1a1a]/90 p-5 backdrop-blur-xl">
                      <p className="text-xs uppercase tracking-[0.22em] text-white/45">Awards</p>
                      <h2 className="mt-2 text-xl font-bold">Recognition</h2>
                      <p className="mt-3 text-white/75">
                        {movie.Awards}
                      </p>
                    </div>
                  )}
                </section>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
};

export default MovieDetails