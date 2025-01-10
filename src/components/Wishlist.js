// src/pages/Wishlist.js
import React, { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import WishlistCard from './WishlistCard';

const Wishlist = () => {
  const { user } = useAuth();
  const [wishlist, setWishlist] = useState([]);
  const [searchTerm] = useState('');
  const [selectedGenre, setSelectedGenre] = useState('all');
  const [groupedMovies, setGroupedMovies] = useState({});

  useEffect(() => {
    const fetchWishlist = async () => {
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userRef);
        const watchlist = userDoc.data()?.watchlist || [];
        setWishlist(watchlist);
        
        // Group movies by genre
        const grouped = watchlist.reduce((acc, movie) => {
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
    };
    fetchWishlist();
  }, [user]);

  const filteredMovies = () => {
    let filtered = wishlist;
    
    if (searchTerm) {
      filtered = filtered.filter(movie => 
        movie.title.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
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
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-bold">My Watchlist</h1>
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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8">
          {filteredMovies().map((movie) => (
            <WishlistCard key={movie.movieId} movie={movie} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default Wishlist;
