// src/pages/Wishlist.js
import React, { useState, useEffect, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import WishlistCard from './WishlistCard';
const Wishlist = () => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [groupedMovies, setGroupedMovies] = useState({});
  const [isWatched, setIsWatched] = useState(false);

  const fetchMovies = useCallback(async () => {
    if (user) {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const watchlist = userDoc.data()?.watchlist || [];
      const watched = userDoc.data()?.watchedMovies || [];
      
      setWishlist(watchlist);
      setWatchedMovies(watched);
      
      // Group current list by genre
      const currentList = isWatched ? watched : watchlist;
      const grouped = currentList.reduce((acc, movie) => {
        const genres = movie.genre?.split(',') || ['Uncategorized'];
        genres.forEach(genre => {
          const trimmedGenre = genre.trim();
          if (!acc[trimmedGenre]) {
            acc[trimmedGenre] = [];
          }
          acc[trimmedGenre].push(movie);
        });
        return acc;
      }, {});
      setGroupedMovies(grouped);
    }
  }, [user, isWatched]);

  useEffect(() => {
    fetchMovies();
  }, [fetchMovies]);


  const filteredMovies = () => {
    let filtered = isWatched ? watchedMovies : wishlist;
    
    if (selectedGenre !== 'all') {
      filtered = filtered.filter(movie => 
        movie.genre?.toLowerCase().includes(selectedGenre.toLowerCase())
      );
    }
    
    return filtered;
  };

  const visibleMovies = filteredMovies();

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 pb-24 md:px-6 md:py-10">
        <section className="rounded-3xl border border-white/5 bg-[#1a1a1a]/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] backdrop-blur-xl md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/45">Personal shelf</p>
              <h1 className="mt-2 text-3xl font-black md:text-5xl">My Watchlist</h1>
              <p className="mt-3 max-w-2xl text-sm text-white/70 md:text-base">
                Keep track of what you want to watch next and what you’ve already finished.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-white/70">
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {wishlist.length} saved
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-4 py-2">
                {watchedMovies.length} watched
              </span>
              <span className="rounded-full border border-[#e50914]/20 bg-[#e50914]/10 px-4 py-2 text-[#ffb3b7]">
                {visibleMovies.length} visible
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className={`${!isWatched ? 'text-white' : 'text-white/45'}`}>Watchlist</span>
              <button
                type="button"
                className="relative h-7 w-14 rounded-full bg-[#141414] ring-1 ring-white/10"
                onClick={() => setIsWatched(!isWatched)}
                aria-label="Toggle watched filter"
              >
                <span
                  className={`absolute top-1 left-1 h-5 w-5 rounded-full bg-[#e50914] transition-transform duration-200 ${
                    isWatched ? 'translate-x-7' : ''
                  }`}
                />
              </button>
              <span className={`${isWatched ? 'text-white' : 'text-white/45'}`}>Watched</span>
            </div>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <span className="text-sm text-white/70">Genre</span>
              <select
                className="min-w-40 bg-transparent text-white outline-none"
                value={selectedGenre}
                onChange={(e) => setSelectedGenre(e.target.value)}
              >
                <option className="bg-[#141414]" value="all">All Genres</option>
                {Object.keys(groupedMovies).map(genre => (
                  <option className="bg-[#141414]" key={genre} value={genre}>{genre}</option>
                ))}
              </select>
            </label>
          </div>
        </section>

        {visibleMovies.length > 0 ? (
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {visibleMovies.map((movie) => (
              <WishlistCard 
                key={movie.movieId} 
                movie={movie} 
                onUpdate={fetchMovies}
                isWatched={isWatched}
              />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-3xl border border-white/5 bg-[#1a1a1a] px-6 py-16 text-center shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <p className="text-2xl font-bold">
              {isWatched ? 'No watched movies yet' : 'Your watchlist is empty'}
            </p>
            <p className="mt-3 text-white/65">
              Add titles from the home page or open a movie detail page to save it here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};


export default Wishlist;
