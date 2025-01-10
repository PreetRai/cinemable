import React, { useState, useEffect } from 'react';
import { searchMovies, searchMultipleMovies } from '../services/omdbApi';
import Navbar from '../components/Navbar';
import MovieCard from '../components/MovieCard';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [type, setType] = useState('movie');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchMovies = async () => {
      if (searchTerm) {
        setIsLoading(true);
        try {
          const detailedResult = await searchMovies(searchTerm, type);
          const multipleResults = await searchMultipleMovies(searchTerm, type);
          
          let combinedResults = [];
          if (detailedResult?.Search?.length > 0) {
            combinedResults = detailedResult.Search;
          }
          
          if (multipleResults?.Search) {
            const newResults = multipleResults.Search.filter(
              movie => !combinedResults.some(m => m.imdbID === movie.imdbID)
            );
            combinedResults = [...combinedResults, ...newResults];
          }
          
          setMovies(combinedResults);
        } catch (error) {
          console.error('Error:', error);
        }
        setIsLoading(false);
      }
    };

    const timeoutId = setTimeout(fetchMovies, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, type]);

  return (
    <div className="min-h-screen bg-[#353535] text-white">
      <Navbar />
      {/* Add top spacing for mobile navbar */}
      <div className="">
        <div className="container mx-auto px-4 py-4 md:py-8">
          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 md:mb-8">
            <input
              type="text"
              placeholder="Search movies or series..."
              className="w-full sm:flex-grow p-3 md:p-4 rounded-lg bg-[#1a1a1a] text-white border-none 
                       focus:ring-2 focus:ring-gray-500 text-base md:text-lg"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <select
              className="w-full sm:w-auto p-3 md:p-4 rounded-lg bg-[#1a1a1a] text-white border-none text-base md:text-lg"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="movie">Movies</option>
              <option value="series">Series</option>
            </select>
          </div>

          {isLoading ? (
            <div className="text-center text-xl md:text-2xl">Loading...</div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8">
              {movies.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} />
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Add bottom spacing for mobile navbar */}
      <div className="h-16 md:h-0"></div>
    </div>
  );
};


export default Home;
