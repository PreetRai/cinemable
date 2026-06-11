import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);

      // Check if user document exists
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      
      if (!userDoc.exists()) {
        // Create new user document if it doesn't exist
        await setDoc(doc(db, 'users', user.uid), {
          name: user.displayName,
          email: user.email,
          watchlist: [],
          createdAt: new Date(),
          lastLogin: new Date()
        });
      }

      navigate('/');
    } catch (error) {
      console.error('Google login error:', error);
      setError('Failed to sign in with Google');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (error) {
      setError('Failed to sign in. Please check your credentials.');
    }
    setLoading(false);
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#141414] text-white">
      <div className="absolute inset-0">
        <div className="absolute left-0 top-0 h-80 w-80 rounded-full bg-[#e50914]/20 blur-3xl" />
        <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.04),transparent_35%)]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-7xl items-center gap-10 px-4 py-8 md:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <div className="hidden lg:block">
          <p className="text-xs uppercase tracking-[0.35em] text-white/45">Cinemable</p>
          <h1 className="mt-5 max-w-xl text-5xl font-black leading-tight xl:text-6xl">
            A sharper way to save, share, and recommend movies.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/70">
            Sign in to continue your watchlist, jump back into group recommendations, and keep the home page experience consistent everywhere.
          </p>

          <div className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-3">
            {[
              'Dark, cinematic layout',
              'Fast watchlist access',
              'Group recommendations',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-white/5 bg-white/5 p-4 text-sm text-white/75 backdrop-blur-xl">
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mx-auto w-full max-w-md rounded-[2rem] border border-white/5 bg-[#1a1a1a]/95 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.55)] backdrop-blur-xl md:p-8">
          <div className="mb-8">
            <p className="text-xs uppercase tracking-[0.35em] text-white/45">Welcome back</p>
            <h2 className="mt-3 text-3xl font-black">Login</h2>
            <p className="mt-2 text-sm text-white/60">
              Use Google or your email to get back into Cinemable.
            </p>
          </div>

          {error && (
            <div className="mb-4 rounded-2xl border border-[#e50914]/30 bg-[#e50914]/10 px-4 py-3 text-sm text-[#ffb3b7]">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            className="mb-6 flex w-full items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white px-4 py-3 font-semibold text-[#111111] transition hover:bg-gray-100"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="rounded-full bg-[#1a1a1a] px-3 text-white/45">Or login with email</span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#e50914]"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-white/80">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-[#141414] px-4 py-3 text-white outline-none transition placeholder:text-white/30 focus:border-[#e50914]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-[#e50914] px-4 py-3 font-semibold text-white shadow-lg shadow-[#e50914]/20 transition hover:bg-[#c40812] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="mt-5 text-center text-sm text-white/65">
            <Link to="/forgot-password" className="text-[#ffb3b7] transition hover:text-white">
              Forgot Password?
            </Link>
          </div>

          <div className="mt-4 text-center text-sm text-white/65">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="text-[#ffb3b7] transition hover:text-white">
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;


