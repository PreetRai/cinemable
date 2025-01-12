import React, { useState, useEffect } from 'react';
import { searchMultipleMovies } from '../services/omdbApi';
import Navbar from '../components/Navbar';
import MovieCard from '../components/MovieCard';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [error, setError] = useState(null);
  const [type, setType] = useState('all'); // Changed default to 'all'

  useEffect(() => {
    const fetchMovies = async () => {
      if (searchTerm.length < 3) {
        setMovies([]);
        setTotalResults(0);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        // Only pass type if it's not 'all'
        const searchResult = await searchMultipleMovies(searchTerm, {
          type: type !== 'all' ? type : undefined,
          page
        });

        if (searchResult.Response === "True") {
          setMovies(prevMovies => 
            page === 1 ? searchResult.Search : [...prevMovies, ...searchResult.Search]
          );
          setTotalResults(parseInt(searchResult.totalResults));
        } else {
          setError(searchResult.Error);
          setMovies([]);
          setTotalResults(0);
        }
      } catch (error) {
        setError('Failed to fetch movies');
      }
      setIsLoading(false);
    };

    const timeoutId = setTimeout(fetchMovies, 500);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, type, page]);


  const handleLoadMore = () => {
    if (!isLoading && movies.length < totalResults) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="min-h-screen bg-[#353535] text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-4 md:py-8">
        <div className="flex flex-col gap-4 mb-6">
          {/* Search Controls */}
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Search movies or series (min. 3 characters)..."
              className="w-full sm:flex-grow p-3 md:p-4 rounded-lg bg-[#1a1a1a] text-white border-none 
                       focus:ring-2 focus:ring-gray-500 text-base md:text-lg"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
            />
            <div className="flex gap-2">
              <select
                className="w-full sm:w-auto p-3 md:p-4 rounded-lg bg-[#1a1a1a] text-white border-none"
                value={type}
                onChange={(e) => {
                  setType(e.target.value);
                  setPage(1);
                }}
              > <option value="">All</option>
                <option value="movie">Movies</option>
                <option value="series">Series</option>
              </select>
            
            </div>
          </div>

          {/* Search Stats */}
          {totalResults > 0 && (
            <div className="text-sm text-gray-400">
              Found {totalResults} results
            </div>
          )}
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-center text-red-500 mb-4">
            {error}
          </div>
        )}

        {/* Results Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-8">
          {movies.map((movie) => (
            <MovieCard key={movie.imdbID} movie={movie} />
          ))}
        </div>

        {/* Load More Button */}
        {movies.length > 0 && movies.length < totalResults && (
          <div className="text-center mt-8">
            <button
              onClick={handleLoadMore}
              disabled={isLoading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 
                       disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}

        {/* Loading Indicator */}
        {isLoading && movies.length === 0 && (
          <div className="text-center text-xl md:text-2xl">
            Loading...
          </div>
        )}
      </div>
      <div className="h-16 md:h-0"></div>
    </div>
  );
};



export default Home;
