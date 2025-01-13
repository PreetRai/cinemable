import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
const MovieCard = ({ movie, recommendedBy }) => {
  const navigate = useNavigate();
  const [showAllRecommenders, setShowAllRecommenders] = useState(false);
  
  const renderRecommenders = () => {
    if (!recommendedBy || recommendedBy.length === 0) return null;
    
    // Ensure we're working with an array of strings (names)
    const recommenderNames = recommendedBy.filter(Boolean);
    
    if (recommenderNames.length === 1) {
      return (
        <span className="text-xs bg-[#353535] px-2 py-1 rounded-full whitespace-nowrap">
          by {recommenderNames[0]}
        </span>
      );
    }
    
    return (
      <div className="relative">
        <div 
          className="flex items-center gap-1 cursor-pointer group"
          onClick={(e) => {
            e.stopPropagation();
            setShowAllRecommenders(!showAllRecommenders);
          }}
        >
          <span className="text-xs bg-[#353535] px-2 py-1 rounded-full whitespace-nowrap">
            {recommenderNames.length} recommendations
          </span>
        </div>
        
        {showAllRecommenders && (
          <div 
            className="absolute right-0 mt-1 w-40 bg-[#1a1a1a] rounded-lg shadow-xl z-50 border border-gray-700"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-2">
              <ul className="space-y-1">
                {recommenderNames.map((name, index) => (
                  <li key={index} className="text-xs px-2 py-1 hover:bg-[#2a2a2a] rounded">
                    {name}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  };
  return (
    <div 
      className="relative overflow-hidden rounded-lg bg-[#1a1a1a] text-white hover:scale-105 transition-transform duration-300 z-0"
      onClick={() => navigate(`/movie/${movie.imdbID}`)}
    > 
      <div className="relative h-[400px]">
        <img 
          src={movie.Poster !== 'N/A' ? movie.Poster : 'https://via.placeholder.com/300x450?text=No+Poster'} 
          alt={movie.Title} 
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black to-transparent"></div>
      </div>
      
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm uppercase tracking-wider opacity-75">
            {movie.Type}
          </span>
          {renderRecommenders()}
        </div>
        <h2 className="text-2xl font-bold mb-2 line-clamp-2">{movie.Title}</h2>
        <div className="flex items-center justify-between">
          <span className="text-lg">{movie.Year}</span>
        </div>
      </div>
    </div>
  );
};


export default MovieCard;
