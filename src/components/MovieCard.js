import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const MovieCard = ({ movie, recommendedBy, compact = false }) => {
  const navigate = useNavigate();
  const [showAllRecommenders, setShowAllRecommenders] = useState(false);

  const posterSrc =
    movie.Poster !== 'N/A'
      ? movie.Poster
      : 'https://via.placeholder.com/300x450?text=No+Poster';
  const playUrl = `https://www.playimdb.com/title/${movie.imdbID}/`;

  const renderRecommenders = () => {
    if (!recommendedBy || recommendedBy.length === 0) return null;
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

  /* Compact card (shelf rows) */
  if (compact) {
    return (
      <div
        className="relative flex-shrink-0 w-36 md:w-44 h-52 md:h-64 rounded-2xl overflow-hidden cursor-pointer group border border-white/5 bg-[#1a1a1a] shadow-[0_12px_40px_rgba(0,0,0,0.35)] transition-transform duration-300 hover:-translate-y-1 hover:border-[#e50914]/40"
        onClick={() => navigate(`/movie/${movie.imdbID}`)}
      >
        <img
          src={posterSrc}
          alt={movie.Title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
          <p className="text-white text-xs font-semibold line-clamp-2 mb-1">{movie.Title}</p>
          <p className="text-gray-400 text-xs mb-2">{movie.Year}</p>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              window.open(playUrl, '_blank', 'noopener,noreferrer');
            }}
            className="flex items-center gap-1 bg-[#e50914] text-white text-xs font-bold px-3 py-1.5 rounded-full w-fit hover:bg-[#c40812] transition-colors shadow-lg shadow-[#e50914]/20"
          >
            &#9654; Play
          </button>
        </div>
      </div>
    );
  }

  /* Full-size card (default / existing) */
  return (
    <div
      className="relative overflow-hidden rounded-2xl bg-[#1a1a1a] text-white transition-all duration-300 z-0 border border-white/5 hover:border-[#e50914]/40 hover:-translate-y-1 cursor-pointer shadow-[0_12px_40px_rgba(0,0,0,0.35)]"
      onClick={() => navigate(`/movie/${movie.imdbID}`)}
    >
      <div className="relative h-[400px]">
        <img
          src={posterSrc}
          alt={movie.Title}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent"></div>
      </div>
      <div className="absolute top-0 left-0 right-0 p-6">
        <div className="flex justify-end items-center mb-2">
          {renderRecommenders()}
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm uppercase tracking-[0.18em] opacity-70 text-white/70">{movie.Type}</span>
        </div>
        <h2 className="text-2xl font-bold mb-2 line-clamp-2 leading-tight">{movie.Title}</h2>
        <div className="flex items-center justify-between text-white/75">
          <span className="text-sm md:text-base">{movie.Year}</span>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
