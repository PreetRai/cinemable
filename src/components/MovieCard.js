import React from 'react';
import { useNavigate } from 'react-router-dom';
const MovieCard = ({ movie }) => {
  const navigate = useNavigate();
  return (
    <div className="relative overflow-hidden rounded-lg bg-[#1a1a1a] text-white hover:scale-105 transition-transform duration-300 z-0"  onClick={() => navigate(`/movie/${movie.imdbID}`)}> 
      <div className="relative h-[400px]">
        <img 
          src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'} 
          alt={movie.Title} 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="mb-2 text-sm uppercase tracking-wider opacity-75">
          {movie.Type}
        </div>
        <h2 className="text-2xl font-bold mb-2">{movie.Title}</h2>
        <div className="flex items-center justify-between">
          <span className="text-lg">{movie.Year}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
