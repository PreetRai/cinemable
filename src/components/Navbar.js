import React, { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
  const displayName = useMemo(() => {
    return user?.displayName?.split(' ')[0] || user?.email?.split('@')[0] || 'Profile';
  }, [user]);

  const closeMenus = () => {
    setIsOpen(false);
    setShowDropdown(false);
  };

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname === path || location.pathname.startsWith(`${path}/`);
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
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
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

      <div className="h-16 md:h-0" />

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
