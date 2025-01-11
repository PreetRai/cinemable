// src/components/WatchlistButton.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const WatchlistButton = ({ movie }) => {
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isWatched, setIsWatched] = useState(false);
  const [movieItem, setMovieItem] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const userData = userDoc.data();
        
        const watchlist = userData?.watchlist || [];
        const watchedMovies = userData?.watchedMovies || [];
        
        const watchlistItem = watchlist.find(item => item.movieId === movie.imdbID);
        const watchedItem = watchedMovies.find(item => item.movieId === movie.imdbID);
        
        setIsInWatchlist(!!watchlistItem);
        setIsWatched(!!watchedItem);
        setMovieItem(watchlistItem || watchedItem);
      }
    };
    checkStatus();
  }, [user, movie.imdbID]);

  const handleToggle = async () => {
    const userRef = doc(db, 'users', user.uid);
    const newItem = {
      movieId: movie.imdbID,
      addedAt: new Date(),
      title: movie.Title,
      poster: movie.Poster,
      type: movie.Type,
      genre: movie.Genre,
      rating: movie.imdbRating,
      year: movie.Year,
      runtime: movie.Runtime,
      plot: movie.Plot
    };

    if (isWatched) {
      // Move from watched to watchlist
      await updateDoc(userRef, {
        watchedMovies: arrayRemove(movieItem),
        watchlist: arrayUnion(newItem)
      });
      setIsWatched(false);
      setIsInWatchlist(true);
    } else if (isInWatchlist) {
      // Move from watchlist to watched
      await updateDoc(userRef, {
        watchlist: arrayRemove(movieItem),
        watchedMovies: arrayUnion(newItem)
      });
      setIsInWatchlist(false);
      setIsWatched(true);
    } else {
      // Add to watchlist
      await updateDoc(userRef, {
        watchlist: arrayUnion(newItem)
      });
      setIsInWatchlist(true);
    }
    setMovieItem(newItem);
  };

  return (
    <button
      onClick={handleToggle}
      className={`px-6 py-3 rounded-lg transition-colors duration-300 flex items-center gap-2
        ${isWatched 
          ? 'bg-green-600 hover:bg-green-700' 
          : 'bg-[#1a1a1a] hover:bg-[#2a2a2a]'} text-white`}
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {isWatched ? (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M5 13l4 4L19 7"
          />
        ) : isInWatchlist ? (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        ) : (
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 4v16m8-8H4"
          />
        )}
      </svg>
      {isWatched ? 'Watched' : isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
    </button>
  );
};

  

export default WatchlistButton;
