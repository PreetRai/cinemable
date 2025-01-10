import React, {useState, useEffect} from 'react';
import {useParams} from 'react-router-dom';
import {getMovieById} from '../services/omdbApi';
import Navbar from './Navbar';
import WatchlistButton from '../components/WatchlistButton';
import RecommendButton from '../components/RecommendButton';
const MovieDetails = () => {
    const [movie, setMovie] = useState(null);
    const [loading, setLoading] = useState(true);
    const {id} = useParams();

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
            <div className="min-h-screen bg-[#353535] text-white">
                <Navbar/>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-2xl">Loading...</div>
                </div>
            </div>
        );
    }

    if (!movie) {
        return (
            <div className="min-h-screen bg-[#353535] text-white">
                <Navbar/>
                <div className="flex items-center justify-center h-screen">
                    <div className="text-2xl">Movie not found</div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#353535] text-white">
          <Navbar/>
          <div className="container mx-auto px-4 py-4 md:py-8">
            {/* Movie Header - Made responsive */}
            <div className="mb-6 md:mb-8">
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div className='flex flex-col'>
                  <div className="text-sm uppercase tracking-wider opacity-75">{movie.Type}</div>
                  <h1 className="text-3xl md:text-5xl font-bold mb-2">{movie.Title}</h1>
                  <div className="text-xl md:text-2xl opacity-75">{movie.Year}</div>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <WatchlistButton movie={movie}/>
                  <RecommendButton movie={movie}/>
                </div>
              </div>
            </div>
    
            {/* Main Content - Adjusted for mobile */}
            <div className="flex flex-col lg:flex-row gap-6 md:gap-8">
              {/* Poster - Made responsive */}
              <div className="lg:w-1/3">
                <img
                  src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450'}
                  alt={movie.Title}
                  className="w-full max-w-sm mx-auto lg:max-w-none rounded-lg shadow-2xl"
                />
              </div>
    
              {/* Details Section - Adjusted spacing */}
              <div className="lg:w-2/3">
                {/* Rating Box - Made compact on mobile */}
                <div className="bg-[#1a1a1a] p-4 md:p-6 rounded-lg mb-6 md:mb-8 inline-block">
                  <div className="text-lg md:text-xl mb-1 md:mb-2">IMDB RATING</div>
                  <div className="text-3xl md:text-4xl font-bold">{movie.imdbRating}/10</div>
                  <div className="text-xs md:text-sm opacity-75">{movie.imdbVotes} votes</div>
                </div>
    
                {/* Plot - Adjusted text size */}
                <div className="mb-6 md:mb-8">
                  <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4">Plot</h2>
                  <p className="text-base md:text-lg leading-relaxed opacity-90">{movie.Plot}</p>
                </div>
    
                {/* Details Grid - Made responsive */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                  {/* Genre */}
                  <div>
                    <h3 className="text-base md:text-lg font-semibold mb-2">Genre</h3>
                    <div className="flex flex-wrap gap-2">
                      {movie.Genre.split(',').map(genre => (
                        <span key={genre} className="px-3 py-1 bg-[#1a1a1a] rounded-full text-sm">
                          {genre.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
    
                  {/* Other sections with adjusted spacing */}
                  <div>
                    <h3 className="text-base md:text-lg font-semibold mb-2">Details</h3>
                    <div className="space-y-1 opacity-90 text-sm md:text-base">
                      <div>Runtime: {movie.Runtime}</div>
                      <div>Released: {movie.Released}</div>
                      <div>Rated: {movie.Rated}</div>
                    </div>
                  </div>
    
                  <div>
                    <h3 className="text-base md:text-lg font-semibold mb-2">Director</h3>
                    <div className="opacity-90 text-sm md:text-base">{movie.Director}</div>
                  </div>
    
                  <div>
                    <h3 className="text-base md:text-lg font-semibold mb-2">Writers</h3>
                    <div className="opacity-90 text-sm md:text-base">{movie.Writer}</div>
                  </div>
    
                  <div className="md:col-span-2">
                    <h3 className="text-base md:text-lg font-semibold mb-2">Cast</h3>
                    <div className="opacity-90 text-sm md:text-base">{movie.Actors}</div>
                  </div>
    
                  {movie.Awards !== "N/A" && (
                    <div className="md:col-span-2">
                      <h3 className="text-base md:text-lg font-semibold mb-2">Awards</h3>
                      <div className="opacity-90 text-sm md:text-base">{movie.Awards}</div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    };

export default MovieDetails