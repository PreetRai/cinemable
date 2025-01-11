// src/pages/Wishlist.js
import React, { useState, useEffect,useCallback } from 'react';
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

  return (
    <div className="min-h-screen bg-[#353535] text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <h1 className="text-4xl font-bold">My Watch list</h1>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Toggle Switch */}
            <div className="flex items-center gap-2">
              <span className={`${!isWatched ? 'text-blue-500' : 'text-gray-400'}`}>
                Watchlist
              </span>
              <div 
                className="relative w-14 h-7 bg-[#1a1a1a] rounded-full cursor-pointer"
                onClick={() => setIsWatched(!isWatched)}
              >
                <div className={`absolute top-1 left-1 w-5 h-5 bg-blue-500 rounded-full transition-transform duration-200 ease-in-out ${
                  isWatched ? 'transform translate-x-7' : ''
                }`} />
              </div>
              <span className={`${isWatched ? 'text-blue-500' : 'text-gray-400'}`}>
                Watched
              </span>
            </div>
            
            <select
              className="p-4 rounded-lg bg-[#1a1a1a] text-white border-none"
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
            >
              <option value="all">All Genres</option>
              {Object.keys(groupedMovies).map(genre => (
                <option key={genre} value={genre}>{genre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredMovies().map((movie) => (
            <WishlistCard 
              key={movie.movieId} 
              movie={movie} 
              onUpdate={fetchMovies}
              isWatched={isWatched}
            />
          ))}
        </div>

        {filteredMovies().length === 0 && (
          <div className="text-center text-xl opacity-75 mt-12">
            {isWatched ? "No watched movies yet" : "Your watchlist is empty"}
          </div>
        )}
      </div>
    </div>
  );
};


export default Wishlist;
