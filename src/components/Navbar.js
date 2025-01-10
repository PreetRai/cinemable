import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const location = useLocation();
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
      {/* Mobile Top Bar */}
      <nav className="md:hidden bg-[#353535] p-4 fixed top-0 left-0 right-0 z-50">
        <div className="flex justify-between items-center">
          <Link to="/" className="text-white text-xl font-bold">
            CinemAble
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-white focus:outline-none flex items-center"
            >
              {user ? (
                <div className="flex items-center">
                  <span className="mr-2">{user.displayName || user.email}</span>
                  <svg 
                    className="w-6 h-6"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                    />
                  </svg>
                </div>
              ) : (
                <svg 
                  className="w-6 h-6"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-xl py-2 z-50">
                {user ? (
                  <>
                    <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                      Signed in as<br/>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#353535]"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block px-4 py-2 text-sm text-white hover:bg-[#353535]"
                      onClick={() => setShowDropdown(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="block px-4 py-2 text-sm text-white hover:bg-[#353535]"
                      onClick={() => setShowDropdown(false)}
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

      {/* Add spacing for mobile top bar */}

      <nav className="bg-[#353535] p-4 relative z-50 hidden md:block">
        <div className="container mx-auto flex justify-between items-center">
          <div>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-white focus:outline-none"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
          
          <Link to="/" className="text-white text-2xl font-bold">
            CinemAble
          </Link>

          <div className="relative">
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              className="text-white focus:outline-none flex items-center"
            >
              {user ? (
                <div className="flex items-center">
                  <span className="mr-2">{user.displayName || user.email}</span>
                  <svg 
                    className="w-6 h-6"
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth="2" 
                      d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                    />
                  </svg>
                </div>
              ) : (
                <svg 
                  className="w-6 h-6"
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth="2" 
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" 
                  />
                </svg>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-xl py-2 z-50">
                {user ? (
                  <>
                    <div className="px-4 py-2 text-sm text-gray-300 border-b border-gray-700">
                      Signed in as<br/>
                      <span className="font-medium">{user.email}</span>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-white hover:bg-[#353535]"
                    >
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="block px-4 py-2 text-sm text-white hover:bg-[#353535]"
                      onClick={() => setShowDropdown(false)}
                    >
                      Login
                    </Link>
                    <Link
                      to="/signup"
                      className="block px-4 py-2 text-sm text-white hover:bg-[#353535]"
                      onClick={() => setShowDropdown(false)}
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
 
      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-[#1a1a1a] z-50">
        <div className="flex justify-around items-center h-16">
          <Link 
            to="/" 
            className={`flex flex-col items-center justify-center w-full h-full ${
              location.pathname === '/' ? 'text-blue-500' : 'text-white'
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
                className={`flex flex-col items-center justify-center w-full h-full ${
                  location.pathname === '/wishlist' ? 'text-blue-500' : 'text-white'
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
                className={`flex flex-col items-center justify-center w-full h-full ${
                  location.pathname === '/groups' ? 'text-blue-500' : 'text-white'
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
              className={`flex flex-col items-center justify-center w-full h-full ${
                location.pathname === '/login' ? 'text-blue-500' : 'text-white'
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

      {/* Safe area spacing for mobile */}
      <div className="h-16 md:h-0"></div>
      {/* Sliding Sidebar */}
      <div 
        className={`fixed top-0 left-0 h-full w-64 bg-[#353535] transform transition-transform duration-300 ease-in-out z-50 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4">
          <button
            onClick={() => setIsOpen(false)}
            className="absolute top-4 right-4"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
          <div className="mt-8 space-y-4 text-white">
            <Link to="/" className="block hover:text-blue-600">Home</Link>
            {user && (
              <>
                <Link to="/wishlist" className="block hover:text-blue-600">My Watchlist</Link>
                <Link to="/groups" className="block hover:text-blue-600">My Groups</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Overlay */}
      {(isOpen || showDropdown) && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => {
            setIsOpen(false);
            setShowDropdown(false);
          }}
        ></div>
      )}
    </>
  );
};

export default Navbar;
