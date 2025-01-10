// src/components/WatchlistButton.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const WatchlistButton = ({ movie }) => {
  const { user } = useAuth();
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [watchlistItem, setWatchlistItem] = useState(null);

  useEffect(() => {
    const checkWatchlist = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const watchlist = userDoc.data()?.watchlist || [];
        const item = watchlist.find(item => item.movieId === movie.imdbID);
        if (item) {
          setIsInWatchlist(true);
          setWatchlistItem(item);
        }
      }
    };
    checkWatchlist();
  }, [user, movie.imdbID]);

  const handleWatchlist = async () => {
    const userRef = doc(db, 'users', user.uid);
    if (isInWatchlist && watchlistItem) {
      await updateDoc(userRef, {
        watchlist: arrayRemove(watchlistItem)
      });
      setIsInWatchlist(false);
      setWatchlistItem(null);
    } else {
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
      await updateDoc(userRef, {
        watchlist: arrayUnion(newItem)
      });
      setIsInWatchlist(true);
      setWatchlistItem(newItem);
    }
  };

  return (
    <button
      onClick={handleWatchlist}
      className="bg-[#1a1a1a] text-white px-6 py-3 rounded-lg hover:bg-[#2a2a2a] transition-colors duration-300 flex items-center gap-2"
    >
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          strokeWidth="2" 
          d={isInWatchlist 
            ? "M5 13l4 4L19 7"
            : "M12 4v16m8-8H4"} 
        />
      </svg>
      {isInWatchlist ? 'In Watchlist' : 'Add to Watchlist'}
    </button>
  );
};

  

export default WatchlistButton;
