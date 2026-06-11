import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import Navbar from '../components/Navbar';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

const GENRE_OPTIONS = [
  'Action',
  'Comedy',
  'Drama',
  'Thriller',
  'Sci-Fi',
  'Animation',
  'Romance',
  'Horror',
  'Documentary'
];

const DEFAULT_PREFERENCES = {
  favoriteGenres: [],
  preferredTypes: 'both',
  discoverFreshOnly: false
};

const getMillis = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.seconds) return value.seconds * 1000;
  if (typeof value?.toDate === 'function') return value.toDate().getTime();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const formatJoinDate = (creationTime) => {
  if (!creationTime) return 'Unknown';
  const date = new Date(creationTime);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString();
};

const Profile = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [watchlist, setWatchlist] = useState([]);
  const [watchedMovies, setWatchedMovies] = useState([]);
  const [groupCount, setGroupCount] = useState(0);
  const [groupRecommendations, setGroupRecommendations] = useState([]);
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);

  useEffect(() => {
    let isMounted = true;

    const initializeAndFetch = async () => {
      if (!user) {
        if (isMounted) {
          setLoading(false);
          setError('No active user session found.');
        }
        return;
      }

      try {
        const userRef = doc(db, 'users', user.uid);
        let userSnapshot = await getDoc(userRef);

        if (!userSnapshot.exists()) {
          await setDoc(userRef, {
            name: user.displayName || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            watchlist: [],
            watchedMovies: [],
            preferences: DEFAULT_PREFERENCES,
            createdAt: new Date(),
            updatedAt: new Date()
          });
          userSnapshot = await getDoc(userRef);
        }

        const userData = userSnapshot.data() || {};
        const safeWatchlist = Array.isArray(userData.watchlist) ? userData.watchlist : [];
        const safeWatched = Array.isArray(userData.watchedMovies) ? userData.watchedMovies : [];
        const storedPreferences = userData.preferences || {};

        const resolvedPreferences = {
          favoriteGenres: Array.isArray(storedPreferences.favoriteGenres)
            ? storedPreferences.favoriteGenres.filter((genre) => GENRE_OPTIONS.includes(genre))
            : [],
          preferredTypes: ['movie', 'series', 'both'].includes(storedPreferences.preferredTypes)
            ? storedPreferences.preferredTypes
            : 'both',
          discoverFreshOnly: Boolean(storedPreferences.discoverFreshOnly)
        };

        const [groupsSnapshot, recommendationSnapshot] = await Promise.all([
          getDocs(collection(db, 'groups')),
          getDocs(query(collection(db, 'recommendations'), where('recommendedBy', 'array-contains', user.uid)))
        ]);

        const joinedGroups = groupsSnapshot.docs
          .map((groupDoc) => ({ id: groupDoc.id, ...groupDoc.data() }))
          .filter((group) =>
            Array.isArray(group.members) &&
            group.members.some((member) => member?.userId === user.uid)
          );

        const joinedGroupsById = joinedGroups.reduce((acc, group) => {
          acc[group.id] = group.name || 'Group';
          return acc;
        }, {});

        const recentRecommendations = recommendationSnapshot.docs
          .map((recDoc) => ({ id: recDoc.id, ...recDoc.data() }))
          .sort((a, b) => getMillis(b.recommendedAt) - getMillis(a.recommendedAt));

        if (isMounted) {
          setDisplayName(user.displayName || userData.name || user.email?.split('@')[0] || 'User');
          setEmail(user.email || userData.email || '');
          setWatchlist(safeWatchlist);
          setWatchedMovies(safeWatched);
          setGroupCount(joinedGroups.length);
          setGroupRecommendations(
            recentRecommendations.map((rec) => ({
              id: rec.id,
              title: rec.movie?.title || 'Untitled recommendation',
              groupName: joinedGroupsById[rec.groupId] || 'Group',
              recommendedAt: rec.recommendedAt
            }))
          );
          setPreferences(resolvedPreferences);
          setError('');
        }
      } catch (fetchError) {
        console.error('Failed to load profile data:', fetchError);
        if (isMounted) {
          setError('Failed to load profile information. Please refresh.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAndFetch();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const avatarInitials = useMemo(() => {
    const source = displayName || email || 'User';
    const parts = source.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }, [displayName, email]);

  const recentWatchlist = useMemo(() => {
    return [...watchlist]
      .sort((a, b) => getMillis(b.addedAt) - getMillis(a.addedAt))
      .slice(0, 6);
  }, [watchlist]);

  const recentRecommendationsPreview = useMemo(() => {
    return groupRecommendations.slice(0, 3);
  }, [groupRecommendations]);

  const handleGenreToggle = (genre) => {
    setPreferences((prev) => {
      const exists = prev.favoriteGenres.includes(genre);
      return {
        ...prev,
        favoriteGenres: exists
          ? prev.favoriteGenres.filter((item) => item !== genre)
          : [...prev.favoriteGenres, genre]
      };
    });
  };

  const handleSavePreferences = async () => {
    if (!user) return;
    setSaveLoading(true);
    setFeedback({ type: '', message: '' });

    try {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(
        userRef,
        {
          name: displayName || user.displayName || user.email?.split('@')[0] || 'User',
          email: email || user.email || '',
          preferences: {
            favoriteGenres: preferences.favoriteGenres,
            preferredTypes: preferences.preferredTypes,
            discoverFreshOnly: preferences.discoverFreshOnly
          },
          updatedAt: new Date()
        },
        { merge: true }
      );
      setFeedback({ type: 'success', message: 'Preferences saved successfully.' });
    } catch (saveError) {
      console.error('Failed to save preferences:', saveError);
      setFeedback({ type: 'error', message: 'Could not save preferences. Please try again.' });
    } finally {
      setSaveLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <Navbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="rounded-3xl border border-white/5 bg-[#1a1a1a] px-6 py-5 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#e50914]" />
            <p className="mt-3 text-sm text-white/70">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />

      <div className="mx-auto max-w-7xl px-4 py-6 pb-24 md:px-6 md:py-10 lg:px-8">
        <section className="mb-8 rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4 md:gap-5">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#e50914]/15 text-xl font-black text-[#ffb3b7] ring-1 ring-[#e50914]/30 md:h-20 md:w-20 md:text-2xl">
                {avatarInitials}
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-white/45">Profile</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight md:text-4xl">{displayName}</h1>
                <p className="mt-1 text-sm text-white/70">{email || 'No email available'}</p>
                <p className="mt-1 text-xs text-white/45">
                  Joined {formatJoinDate(user?.metadata?.creationTime)}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                to="/wishlist"
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 transition hover:bg-white/10"
              >
                Open Watchlist
              </Link>
              <Link
                to="/groups"
                className="rounded-full border border-[#e50914]/30 bg-[#e50914]/10 px-4 py-2 text-[#ffb3b7] transition hover:bg-[#e50914]/20"
              >
                Open Groups
              </Link>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-2xl border border-[#e50914]/30 bg-[#e50914]/10 px-4 py-3 text-sm text-[#ffb3b7]">
              {error}
            </div>
          )}
        </section>

        <section className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Watchlist</p>
            <p className="mt-2 text-3xl font-black">{watchlist.length}</p>
            <p className="mt-1 text-sm text-white/60">Titles saved for later</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Watched</p>
            <p className="mt-2 text-3xl font-black">{watchedMovies.length}</p>
            <p className="mt-1 text-sm text-white/60">Completed titles</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-[#1a1a1a] p-5">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Groups</p>
            <p className="mt-2 text-3xl font-black">{groupCount}</p>
            <p className="mt-1 text-sm text-white/60">Participating groups</p>
          </div>
        </section>

        <section className="mb-8 rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)] md:p-8">
          <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-2xl font-black tracking-tight">Preferences</h2>
              <p className="mt-1 text-sm text-white/60">Personalization-ready settings saved to your profile document.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <p className="mb-3 text-sm font-semibold text-white/85">Favorite Genres</p>
              <div className="flex flex-wrap gap-2">
                {GENRE_OPTIONS.map((genre) => {
                  const selected = preferences.favoriteGenres.includes(genre);
                  return (
                    <button
                      key={genre}
                      type="button"
                      onClick={() => handleGenreToggle(genre)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        selected
                          ? 'border-[#e50914]/40 bg-[#e50914]/15 text-[#ffb3b7]'
                          : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {genre}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="mb-3 text-sm font-semibold text-white/85">Preferred Content Type</p>
              <div className="flex flex-wrap gap-2">
                {['movie', 'series', 'both'].map((type) => {
                  const active = preferences.preferredTypes === type;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setPreferences((prev) => ({ ...prev, preferredTypes: type }))}
                      className={`rounded-full border px-4 py-2 text-sm capitalize transition ${
                        active
                          ? 'border-[#e50914]/40 bg-[#e50914]/15 text-[#ffb3b7]'
                          : 'border-white/10 bg-white/5 text-white/75 hover:bg-white/10'
                      }`}
                    >
                      {type}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-white/85">Discover Fresh Only</p>
                <p className="text-xs text-white/55">Prioritize newer releases in future personalization.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setPreferences((prev) => ({
                    ...prev,
                    discoverFreshOnly: !prev.discoverFreshOnly
                  }))
                }
                className="relative h-7 w-14 rounded-full bg-[#141414] ring-1 ring-white/15"
                aria-label="Toggle discover fresh only"
              >
                <span
                  className={`absolute top-1 h-5 w-5 rounded-full bg-[#e50914] transition-transform duration-200 ${
                    preferences.discoverFreshOnly ? 'left-8' : 'left-1'
                  }`}
                />
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleSavePreferences}
                disabled={saveLoading}
                className="rounded-full bg-[#e50914] px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-[#e50914]/20 transition hover:bg-[#c40812] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saveLoading ? 'Saving...' : 'Save Preferences'}
              </button>
              {feedback.message && (
                <p
                  className={`text-sm ${
                    feedback.type === 'success' ? 'text-emerald-300' : 'text-[#ff9aa0]'
                  }`}
                >
                  {feedback.message}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 xl:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Recent Watchlist Activity</h3>
              <Link to="/wishlist" className="text-sm text-[#ffb3b7] transition hover:text-white">
                View full watchlist
              </Link>
            </div>

            {recentWatchlist.length > 0 ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {recentWatchlist.map((item, index) => (
                  <Link
                    key={`${item.movieId || item.id || 'movie'}-${index}`}
                    to={item.movieId ? `/movie/${item.movieId}` : '/wishlist'}
                    className="group overflow-hidden rounded-2xl border border-white/5 bg-[#141414] transition hover:border-[#e50914]/40"
                  >
                    <div className="aspect-[2/3] bg-[#202020]">
                      <img
                        src={item.poster && item.poster !== 'N/A' ? item.poster : 'https://via.placeholder.com/300x450?text=No+Poster'}
                        alt={item.title || 'Watchlist item'}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-sm font-semibold text-white">{item.title || 'Untitled'}</p>
                      <p className="mt-1 text-xs text-white/55">{item.year || item.type || 'Saved'}</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-white/5 bg-[#141414] px-4 py-8 text-center text-sm text-white/60">
                No watchlist history yet.
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 xl:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-xl font-bold">Group Interactions</h3>
              <Link to="/groups" className="text-sm text-[#ffb3b7] transition hover:text-white">
                View groups
              </Link>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/45">Recommendations</p>
              <p className="mt-2 text-3xl font-black">{groupRecommendations.length}</p>
              <p className="mt-1 text-sm text-white/60">Movies recommended by you in groups</p>
            </div>

            {recentRecommendationsPreview.length > 0 ? (
              <div className="mt-4 space-y-2">
                {recentRecommendationsPreview.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-white/5 bg-[#141414] px-3 py-3">
                    <p className="line-clamp-1 text-sm font-medium text-white">{item.title}</p>
                    <p className="mt-1 text-xs text-white/55">
                      {item.groupName} • {formatJoinDate(item.recommendedAt?.seconds ? item.recommendedAt.seconds * 1000 : item.recommendedAt)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-4 text-sm text-white/60">No recent group recommendations.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Profile;
  