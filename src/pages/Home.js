import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { searchMultipleMovies } from "../services/omdbApi";
import Navbar from "../components/Navbar";
import MovieCard from "../components/MovieCard";
import SearchAutocomplete from "../components/SearchAutocomplete";

const CompactSkeletonCard = () => (
  <div className="flex-shrink-0 w-36 md:w-44 h-52 md:h-64 rounded-lg animate-pulse bg-[#2a2a2a]" />
);

const HeroSkeleton = () => (
  <div className="w-full h-[70vh] animate-pulse bg-[#2a2a2a]" />
);

const GridSkeletonCard = () => (
  <div className="animate-pulse bg-[#2a2a2a] rounded-lg overflow-hidden">
    <div className="h-64 bg-[#353535]" />
    <div className="p-3 space-y-2">
      <div className="h-3 bg-[#353535] rounded w-3/4" />
      <div className="h-3 bg-[#353535] rounded w-1/2" />
    </div>
  </div>
);

const ShelfRow = ({ label, movies, loading }) => {
  const rowRef = useRef(null);
  const scroll = (dir) => {
    if (rowRef.current) {
      rowRef.current.scrollBy({ left: dir === "left" ? -480 : 480, behavior: "smooth" });
    }
  };
  return (
    <section className="mb-10">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-3 px-4 md:px-8 tracking-wide">
        {label}
      </h2>
      <div className="relative group/shelf">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-10 w-10 md:w-14 flex items-center justify-center bg-gradient-to-r from-[#141414] to-transparent opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-200"
          aria-label="Scroll left"
        >
          <span className="text-white text-2xl font-bold">&#8249;</span>
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-10 w-10 md:w-14 flex items-center justify-center bg-gradient-to-l from-[#141414] to-transparent opacity-0 group-hover/shelf:opacity-100 transition-opacity duration-200"
          aria-label="Scroll right"
        >
          <span className="text-white text-2xl font-bold">&#8250;</span>
        </button>
        <div
          ref={rowRef}
          className="flex gap-3 overflow-x-auto px-4 md:px-8 pb-2"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <CompactSkeletonCard key={i} />)
            : movies.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} compact />
              ))}
        </div>
      </div>
    </section>
  );
};

const HeroBanner = ({ movie }) => {
  const navigate = useNavigate();
  if (!movie) return <HeroSkeleton />;
  const poster =
    movie.Poster !== "N/A"
      ? movie.Poster
      : "https://via.placeholder.com/300x450?text=No+Poster";
  return (
    <div className="relative w-full h-[70vh] overflow-hidden">
      <img
        src={poster}
        alt={movie.Title}
        className="absolute inset-0 w-full h-full object-cover scale-110 blur-sm opacity-40"
      />
      <img
        src={poster}
        alt={movie.Title}
        className="absolute inset-0 w-full h-full object-contain"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#141414] via-transparent to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-transparent to-transparent" />
      <div className="absolute bottom-16 left-6 md:left-12 max-w-lg">
        <span className="inline-block bg-[#e50914] text-white text-xs font-bold uppercase tracking-widest px-2 py-1 rounded mb-3">
          {movie.Type || "movie"}
        </span>
        <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 leading-tight drop-shadow-lg">
          {movie.Title}
        </h1>
        <p className="text-gray-300 text-sm mb-5">{movie.Year}</p>
        <button
          onClick={() => navigate("/movie/" + movie.imdbID)}
          className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-gray-200 transition-colors text-sm md:text-base"
        >
          View Details
        </button>
      </div>
    </div>
  );
};

const SHELF_CATEGORIES = [
  { key: "action", label: "Action" },
  { key: "marvel", label: "Marvel Universe" },
  { key: "thriller", label: "Thriller" },
  { key: "animated", label: "Animation" },
];

const TYPE_PILLS = [
  { value: "all", label: "All" },
  { value: "movie", label: "Movies" },
  { value: "series", label: "Series" },
];

const Home = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [type, setType] = useState("all");
  const [page, setPage] = useState(1);

  const [searchMovies, setSearchMovies] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchTotal, setSearchTotal] = useState(0);
  const [searchError, setSearchError] = useState(null);

  const [shelfData, setShelfData] = useState({});
  const [shelfLoading, setShelfLoading] = useState(true);

  const autocompleteRef = useRef(null);
  const isSearchActive = searchTerm.length >= 2;

  useEffect(() => {
    const fetchShelves = async () => {
      setShelfLoading(true);
      try {
        const results = await Promise.all(
          SHELF_CATEGORIES.map(({ key }) =>
            searchMultipleMovies(key, { page: 1 }).catch(() => ({ Response: "False" }))
          )
        );
        const data = {};
        SHELF_CATEGORIES.forEach(({ key }, i) => {
          data[key] = results[i].Response === "True" ? results[i].Search || [] : [];
        });
        setShelfData(data);
      } catch {
        setShelfData({});
      }
      setShelfLoading(false);
    };
    fetchShelves();
  }, []);

  useEffect(() => {
    if (!isSearchActive) {
      setSearchMovies([]);
      setSearchTotal(0);
      setSearchError(null);
      return;
    }
    const fetchSearch = async () => {
      setSearchLoading(true);
      setSearchError(null);
      try {
        const result = await searchMultipleMovies(searchTerm, {
          type: type !== "all" ? type : undefined,
          page,
        });
        if (result.Response === "True") {
          setSearchMovies((prev) =>
            page === 1 ? result.Search : [...prev, ...result.Search]
          );
          setSearchTotal(parseInt(result.totalResults));
        } else {
          if (result.Error !== "Too many results.") setSearchError(result.Error);
          if (page === 1) { setSearchMovies([]); setSearchTotal(0); }
        }
      } catch {
        setSearchError("Failed to fetch movies");
      }
      setSearchLoading(false);
    };
    const id = setTimeout(fetchSearch, 300);
    return () => clearTimeout(id);
  }, [searchTerm, type, page, isSearchActive]);

  const handleSearchChange = (e) => { setSearchTerm(e.target.value); setPage(1); };
  const handleInputKeyDown = (e) => {
    if (autocompleteRef.current) autocompleteRef.current.handleKeyDown(e);
  };

  const heroMovie = (() => {
    for (const { key } of SHELF_CATEGORIES) {
      if (shelfData[key] && shelfData[key].length > 0) return shelfData[key][0];
    }
    return null;
  })();

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />

      {!isSearchActive && (
        <>
          <HeroBanner movie={heroMovie} />

          <div className="relative z-20 -mt-8 flex flex-col items-center px-4">
            <div className="w-full max-w-2xl bg-[#1a1a1a]/90 backdrop-blur-sm rounded-xl p-4 shadow-2xl">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search movies or series..."
                  className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e50914] text-base placeholder-gray-500 transition-shadow"
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onKeyDown={handleInputKeyDown}
                  autoComplete="off"
                />
                <SearchAutocomplete
                  ref={autocompleteRef}
                  searchTerm={searchTerm}
                  type={type}
                  onSelectMovie={(movie) => { setSearchTerm(movie.Title); setPage(1); }}
                />
              </div>
              <div className="flex gap-2 mt-3 justify-center">
                {TYPE_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    onClick={() => { setType(pill.value); setPage(1); }}
                    className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (type === pill.value ? "bg-[#e50914] text-white" : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]")}
                  >
                    {pill.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-10">
            {SHELF_CATEGORIES.map(({ key, label }) => (
              <ShelfRow
                key={key}
                label={label}
                movies={shelfData[key] || []}
                loading={shelfLoading}
              />
            ))}
          </div>
        </>
      )}

      {isSearchActive && (
        <div className="container mx-auto px-4 pt-6 pb-8">
          <div className="flex flex-col items-center mb-8">
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="Search movies or series..."
                className="w-full px-5 py-4 rounded-xl bg-[#1a1a1a] text-white border border-gray-700 focus:outline-none focus:ring-2 focus:ring-[#e50914] text-lg placeholder-gray-500 shadow-[0_0_20px_rgba(229,9,20,0.15)] transition-shadow"
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={handleInputKeyDown}
                autoComplete="off"
              />
              <SearchAutocomplete
                ref={autocompleteRef}
                searchTerm={searchTerm}
                type={type}
                onSelectMovie={(movie) => { setSearchTerm(movie.Title); setPage(1); }}
              />
            </div>
            <div className="flex gap-2 mt-3">
              {TYPE_PILLS.map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => { setType(pill.value); setPage(1); }}
                  className={"px-4 py-1.5 rounded-full text-sm font-medium transition-colors " + (type === pill.value ? "bg-[#e50914] text-white" : "bg-[#2a2a2a] text-gray-300 hover:bg-[#3a3a3a]")}
                >
                  {pill.label}
                </button>
              ))}
            </div>
            {searchTotal > 0 && (
              <p className="text-sm text-gray-400 mt-3">
                Found <span className="text-white font-semibold">{searchTotal}</span> results for &ldquo;{searchTerm}&rdquo;
              </p>
            )}
          </div>

          {searchError && (
            <div className="text-center text-red-500 mb-4">{searchError}</div>
          )}

          {searchLoading && searchMovies.length === 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {Array.from({ length: 10 }).map((_, i) => <GridSkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {searchMovies.map((movie) => (
                <MovieCard key={movie.imdbID} movie={movie} />
              ))}
            </div>
          )}

          {searchMovies.length > 0 && searchMovies.length < searchTotal && (
            <div className="text-center mt-8">
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={searchLoading}
                className="bg-[#e50914] text-white px-8 py-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors"
              >
                {searchLoading ? "Loading..." : "Load More"}
              </button>
            </div>
          )}
        </div>
      )}

      <div className="h-16" />
    </div>
  );
};

export default Home;
