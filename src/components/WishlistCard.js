import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, updateDoc, arrayRemove,arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const WishlistCard = ({ movie, onUpdate,isWatched }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showOptions, setShowOptions] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowOptions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleToggleWatched = async (e) => {
    e.stopPropagation();
    try {
      const userRef = doc(db, 'users', user.uid);
      
      if (isWatched) {
        // Move from watched to watchlist
        await updateDoc(userRef, {
          watchedMovies: arrayRemove(movie),
          watchlist: arrayUnion({
            ...movie,
            addedAt: Timestamp.now()
          })
        });
      } else {
        // Move from watchlist to watched
        await updateDoc(userRef, {
          watchlist: arrayRemove(movie),
          watchedMovies: arrayUnion({
            ...movie,
            watchedAt: Timestamp.now()
          })
        });
      }
      
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error toggling watched status:', error);
    }
    setShowOptions(false);
  };

  const handleRemove = async (e) => {
    e.stopPropagation();
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        [isWatched ? 'watchedMovies' : 'watchlist']: arrayRemove(movie)
      });
      onUpdate && onUpdate();
    } catch (error) {
      console.error('Error removing movie:', error);
    }
    setShowOptions(false);
  };
  return (
    <div 
    className="relative overflow-hidden rounded-2xl bg-[#1a1a1a] text-white transition-transform duration-300 z-0 border border-white/5 hover:-translate-y-1 hover:border-[#e50914]/40 shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
    onClick={() => navigate(`/movie/${movie.movieId}`)}
  > 
    {/* Options Button */}
    <div 
      className="absolute top-4 right-4 z-10 options-container"
      ref={dropdownRef}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={() => setShowOptions(!showOptions)}
        className="p-2 hover:bg-white/10 rounded-full bg-black/40 backdrop-blur text-white border border-white/10"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z"
          />
        </svg>
      </button>

      {showOptions && (
        <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] rounded-2xl shadow-xl z-50 border border-white/5 overflow-hidden">
          <button
            onClick={handleToggleWatched}
            className="w-full text-left px-4 py-3 hover:bg-white/5"
          >
            {isWatched ? 'Mark as Unwatched' : 'Mark as Watched'}
          </button>
          <button
            onClick={handleRemove}
            className="w-full text-left px-4 py-3 hover:bg-[#e50914] text-[#ff9aa0] hover:text-white border-t border-white/5"
          >
            Remove {isWatched ? 'from Watched' : 'from Watchlist'}
          </button>
        </div>
      )}
      </div>

      {/* Movie Image */}
      <div className="relative aspect-[2/3]">
        <img 
          src={movie.poster !== 'N/A' ? movie.poster : 'https://via.placeholder.com/300x450?text=No+Poster'} 
          alt={movie.title} 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
      </div>
      
      {/* Movie Details */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mb-2 text-xs uppercase tracking-[0.18em] text-white/70">
          {movie.type}
        </div>
        <h2 className="text-2xl font-bold mb-2 leading-tight">{movie.title}</h2>
        <div className="flex items-center justify-between text-white/75">
          <span className="text-sm md:text-base">{movie.year}</span>
          {movie.rating && (
            <span className="text-sm md:text-base">★ {movie.rating}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default WishlistCard;
