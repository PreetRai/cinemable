import React, { useMemo, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import SearchAutocomplete from './SearchAutocomplete';

const Navbar = ({
  searchTerm = '',
  searchType = 'all',
  searchFilters = {},
  searchGenreOptions = [],
  onSearchChange = null,
  onSearchTypeChange = null,
  onSearchFilterChange = null,
  onSearchSubmit = null,
  onSearchSelectMovie = null,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const autocompleteRef = useRef(null);

  const location = useLocation();
  const displayName = useMemo(() => {
    return user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Profile';
  }, [user]);

  const searchInputId = 'navbar-search-input';
  const isSearchEnabled = typeof onSearchChange === 'function' && typeof onSearchTypeChange === 'function';
  const activeFilterCount = useMemo(() => {
    return [
      searchFilters?.genre,
      searchFilters?.yearRange,
      searchFilters?.languageOrCountry,
    ].filter((value) => typeof value === 'string' && value.trim()).length;
  }, [searchFilters]);

  const closeMenus = () => {
    setIsOpen(false);
    setShowDropdown(false);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
  };

  const ctaLinks = [
    { to: '/', label: 'Home', active: isActive('/') },
    ...(user
      ? [
          { to: '/wishlist', label: 'Watchlist', active: isActive('/wishlist') },
          { to: '/groups', label: 'Groups', active: isActive('/groups') },
          { to: '/profile', label: 'Profile', active: isActive('/profile') },
        ]
      : [
          { to: '/login', label: 'Login', active: isActive('/login') },
          { to: '/signup', label: 'Sign Up', active: isActive('/signup') },
        ]),
  ];

  const handleSearchKeyDown = (event) => {
    if (autocompleteRef.current?.handleKeyDown) {
      autocompleteRef.current.handleKeyDown(event);
    }

    if (event.defaultPrevented) {
      return;
    }

    if (event.key === 'Enter' && typeof onSearchSubmit === 'function') {
      event.preventDefault();
      onSearchSubmit(searchTerm);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Failed to log out');
    }
  };

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#141414]/90 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 py-2 sm:py-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="md:hidden">
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className="rounded-full border border-white/10 bg-white/5 p-2 text-white/90 transition hover:bg-white/10"
                  aria-label="Open navigation menu"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>

              <Link to="/" className="text-xl font-extrabold tracking-wide text-white md:text-2xl">
                CinemAble
              </Link>
            </div>

            <div className="hidden lg:flex lg:flex-1 lg:justify-center">
              <div className="flex flex-wrap items-center justify-center gap-2 text-sm">
                {ctaLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    className={
                      'rounded-full border px-3 py-1.5 transition ' +
                      (link.active
                        ? 'border-[#e50914]/50 bg-[#e50914]/15 text-[#ffd3d6]'
                        : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white')
                    }
                    onClick={closeMenus}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-white/90 transition hover:bg-white/10 focus:outline-none"
              >
                {user ? (
                  <>
                    <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-3 w-52 overflow-hidden rounded-2xl border border-white/5 bg-[#1a1a1a] shadow-2xl z-50">
                  {user ? (
                    <>
                      <div className="border-b border-white/5 px-4 py-3 text-sm text-white/70">
                        Signed in as<br />
                        <span className="font-medium text-white">{user.email}</span>
                      </div>
                      <Link
                        to="/profile"
                        className="block w-full px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
                        onClick={closeMenus}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="block w-full px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
                      >
                        Logout
                      </button>
                    </>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        className="block px-4 py-3 text-sm text-white transition hover:bg-white/5"
                        onClick={closeMenus}
                      >
                        Login
                      </Link>
                      <Link
                        to="/signup"
                        className="block px-4 py-3 text-sm text-white transition hover:bg-white/5"
                        onClick={closeMenus}
                      >
                        Sign Up
                      </Link>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-2 sm:mt-3 flex flex-col gap-2 sm:gap-3 lg:mt-4 lg:flex-row lg:items-center">
            {isSearchEnabled && (
              <div className="flex-1">
                <div className="flex flex-row gap-2 items-stretch">
                  <div className="relative flex-1 min-w-0">
                    <label htmlFor={searchInputId} className="sr-only">
                      Search movies or series
                    </label>
                    <input
                      id={searchInputId}
                      type="text"
                      placeholder="Search titles or plot keywords..."
                      className="w-full rounded-2xl border border-white/10 bg-[#0f0f0f] px-3 py-2 sm:px-4 sm:py-3.5 text-sm sm:text-base text-white shadow-[0_0_22px_rgba(229,9,20,0.12)] outline-none transition placeholder:text-white/35 focus:border-[#e50914]/50 focus:ring-2 focus:ring-[#e50914]/35"
                      value={searchTerm}
                      onChange={isSearchEnabled ? onSearchChange : undefined}
                      onKeyDown={handleSearchKeyDown}
                      autoComplete="off"
                    />
                    <SearchAutocomplete
                      ref={autocompleteRef}
                      searchTerm={searchTerm}
                      type={searchType}
                      onSelectMovie={onSearchSelectMovie}
                    />
                  </div>

                  <div className="flex gap-2 items-stretch flex-shrink-0">
                    <div className="w-20 sm:w-40">
                      <label className="sr-only" htmlFor="navbar-search-type">
                        Search type
                      </label>
                      <select
                        id="navbar-search-type"
                        value={searchType}
                        onChange={(event) => {
                          if (typeof onSearchTypeChange === 'function') {
                            onSearchTypeChange(event.target.value);
                          }
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-[#111111] px-2 py-2 sm:px-4 sm:py-3.5 text-sm font-medium text-white outline-none transition focus:border-[#e50914]/50 focus:ring-2 focus:ring-[#e50914]/35"
                      >
                        <option value="all">All</option>
                        <option value="movie">Movies</option>
                        <option value="series">Series</option>
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowAdvancedFilters((prev) => !prev)}
                      className="flex-shrink-0 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 sm:px-4 sm:py-3 text-sm font-medium text-white/85 transition hover:bg-white/10 focus:border-[#e50914]/50 focus:outline-none focus:ring-2 focus:ring-[#e50914]/35"
                    >
                      <span className="hidden sm:inline">Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
                      <span className="sm:hidden" aria-hidden="true">
                        <svg className="w-4 h-4 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
                        </svg>
                        {activeFilterCount > 0 && <span className="ml-1">{activeFilterCount}</span>}
                      </span>
                      <span className="sr-only sm:hidden">Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}</span>
                    </button>
                  </div>
                </div>

                {(showAdvancedFilters || activeFilterCount > 0) && (
                  <div className="grid gap-3 rounded-2xl border border-white/8 bg-white/[0.03] p-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45" htmlFor="navbar-search-genre">
                        Genre
                      </label>
                      <select
                        id="navbar-search-genre"
                        value={searchFilters?.genre || ''}
                        onChange={(event) => {
                          if (typeof onSearchFilterChange === 'function') {
                            onSearchFilterChange('genre', event.target.value);
                          }
                        }}
                        className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition focus:border-[#e50914]/50 focus:ring-2 focus:ring-[#e50914]/35"
                      >
                        <option value="">Any genre</option>
                        {searchGenreOptions.map((genre) => (
                          <option key={genre} value={genre}>
                            {genre}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45" htmlFor="navbar-search-year-range">
                        Year or range
                      </label>
                      <input
                        id="navbar-search-year-range"
                        type="text"
                        value={searchFilters?.yearRange || ''}
                        onChange={(event) => {
                          if (typeof onSearchFilterChange === 'function') {
                            onSearchFilterChange('yearRange', event.target.value);
                          }
                        }}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="2019 or 2019-2022"
                        className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#e50914]/50 focus:ring-2 focus:ring-[#e50914]/35"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.2em] text-white/45" htmlFor="navbar-search-region">
                        Language or country
                      </label>
                      <input
                        id="navbar-search-region"
                        type="text"
                        value={searchFilters?.languageOrCountry || ''}
                        onChange={(event) => {
                          if (typeof onSearchFilterChange === 'function') {
                            onSearchFilterChange('languageOrCountry', event.target.value);
                          }
                        }}
                        onKeyDown={handleSearchKeyDown}
                        placeholder="English, Korea, Japan"
                        className="w-full rounded-2xl border border-white/10 bg-[#111111] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/35 focus:border-[#e50914]/50 focus:ring-2 focus:ring-[#e50914]/35"
                      />
                    </div>
                  </div>
                )}

                <p className="hidden sm:block text-xs text-white/40">
                  Suggestions stay title-focused. Press Enter to run the richer search with filters and keyword ranking.
                </p>
              </div>
            )}

            <div className="hidden md:flex flex-wrap gap-2 text-sm lg:hidden">
              {ctaLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className={
                    'rounded-full border px-3 py-1.5 transition ' +
                    (link.active
                      ? 'border-[#e50914]/50 bg-[#e50914]/15 text-[#ffd3d6]'
                      : 'border-white/10 bg-white/5 text-white/75 hover:border-white/20 hover:bg-white/10 hover:text-white')
                  }
                  onClick={closeMenus}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </nav>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/5 bg-[#141414]/95 backdrop-blur-xl md:hidden">
        <div className="flex h-16 items-center justify-around">
          <Link
            to="/"
            className={`flex h-full w-full flex-col items-center justify-center ${
              isActive('/') ? 'text-[#e50914]' : 'text-white/70'
            }`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span className="text-xs mt-1">Home</span>
          </Link>

          {user && (
            <>
              <Link
                to="/wishlist"
                className={`flex h-full w-full flex-col items-center justify-center ${
                  isActive('/wishlist') ? 'text-[#e50914]' : 'text-white/70'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                <span className="text-xs mt-1">Watchlist</span>
              </Link>

              <Link
                to="/groups"
                className={`flex h-full w-full flex-col items-center justify-center ${
                  isActive('/groups') ? 'text-[#e50914]' : 'text-white/70'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="text-xs mt-1">Groups</span>
              </Link>

              <Link
                to="/profile"
                className={`flex h-full w-full flex-col items-center justify-center ${
                  isActive('/profile') ? 'text-[#e50914]' : 'text-white/70'
                }`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.121 17.804A7.968 7.968 0 0112 14a7.968 7.968 0 016.879 3.804M15 9a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-xs mt-1">Profile</span>
              </Link>
            </>
          )}

          {!user && (
            <Link
              to="/login"
              className={`flex h-full w-full flex-col items-center justify-center ${
                isActive('/login') ? 'text-[#e50914]' : 'text-white/70'
              }`}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <span className="text-xs mt-1">Login</span>
            </Link>
          )}
        </div>
      </nav>

      <div className="h-[6.5rem] sm:h-32 md:h-36 lg:h-32" />

      <div
        className={`fixed top-0 left-0 h-full w-72 bg-[#141414] transform transition-transform duration-300 ease-in-out z-50 border-r border-white/5 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 pt-6">
          <button
            onClick={closeMenus}
            className="absolute top-4 right-4 rounded-full border border-white/10 bg-white/5 p-2 text-white/90"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="mt-10 space-y-2 text-white">
            <Link to="/" onClick={closeMenus} className="block rounded-xl px-3 py-3 transition hover:bg-white/5">Home</Link>
            {user && (
              <>
                <Link to="/wishlist" onClick={closeMenus} className="block rounded-xl px-3 py-3 transition hover:bg-white/5">My Watchlist</Link>
                <Link to="/groups" onClick={closeMenus} className="block rounded-xl px-3 py-3 transition hover:bg-white/5">My Groups</Link>
                <Link to="/profile" onClick={closeMenus} className="block rounded-xl px-3 py-3 transition hover:bg-white/5">My Profile</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {(isOpen || showDropdown) && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={closeMenus}
        />
      )}
    </>
  );
};

export default Navbar;
