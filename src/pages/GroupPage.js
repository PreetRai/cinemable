import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import Navbar from '../components/Navbar';
import MovieCard from '../components/MovieCard';

const GroupPage = () => {
    const { groupId } = useParams();
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [groupDetails, setGroupDetails] = useState(null);
    const [memberDetails, setMemberDetails] = useState({});
    const [selectedGenre, setSelectedGenre] = useState('all');
    const [genres, setGenres] = useState([]);
    const [showUserFilter, setShowUserFilter] = useState(false);
    const [selectedUsers, setSelectedUsers] = useState([]);

    
    useEffect(() => {
      const fetchData = async () => {
        try {
          // Fetch group details
          const groupRef = doc(db, 'groups', groupId);
          const groupDoc = await getDoc(groupRef);
          
          if (groupDoc.exists()) {
            setGroupDetails(groupDoc.data());
            
            // Fetch member details
            const members = groupDoc.data().members;
            const memberData = {};
            await Promise.all(
              members.map(async (member) => {
                const userRef = doc(db, 'users', member.userId);
                const userDoc = await getDoc(userRef);
                if (userDoc.exists()) {
                  memberData[member.userId] = {
                    name: userDoc.data().name,
                    email: userDoc.data().email,
                    role: member.role
                  };
                }
              })
            );
            setMemberDetails(memberData);
          }
  
          // Fetch recommendations
          const recommendationsRef = collection(db, 'recommendations');
          const q = query(recommendationsRef, where('groupId', '==', groupId));
          const querySnapshot = await getDocs(q);
          
          // Group recommendations by movieId
          const movieRecommendations = {};
          querySnapshot.docs.forEach(doc => {
            const rec = { id: doc.id, ...doc.data() };
            if (!movieRecommendations[rec.movieId]) {
              movieRecommendations[rec.movieId] = {
                ...rec,
                recommenders: [rec.recommendedBy]
              };
            } else {
              movieRecommendations[rec.movieId].recommenders.push(rec.recommendedBy);
            }
          });
          
          const recs = Object.values(movieRecommendations);
          setRecommendations(recs);
    
          // Process genres
          const uniqueGenres = new Set();
          recs.forEach(rec => {
            rec.movie.genre.split(',').forEach(genre => 
              uniqueGenres.add(genre.trim())
            );
          });
          setGenres(['all', ...Array.from(uniqueGenres)]);
          
        } catch (error) {
          console.error('Error fetching data:', error);
        }
        setLoading(false);
      };
    
      fetchData();
    }, [groupId]);

   const getFilteredRecommendations = () => {
    const matchesGenre = (rec) => 
      selectedGenre === 'all' || rec.movie.genre.includes(selectedGenre);

    if (selectedUsers.length === 0) {
      return {
        combined: [],
        individual: recommendations.filter(rec => matchesGenre(rec))
      };
    }

    const filtered = recommendations.filter(rec => matchesGenre(rec));
    
    return {
      combined: filtered.filter(rec => 
        selectedUsers.every(userId => rec.recommendedBy.includes(userId))
      ),
      individual: filtered.filter(rec => 
        selectedUsers.some(userId => rec.recommendedBy.includes(userId)) &&
        !selectedUsers.every(userId => rec.recommendedBy.includes(userId))
      )
    };
  };
    
    
  if (loading) {
    return (
      <div className="min-h-screen bg-[#141414] text-white">
        <Navbar />
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
          <div className="rounded-3xl border border-white/5 bg-[#1a1a1a] px-6 py-5 shadow-2xl">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-[#e50914]" />
            <p className="mt-3 text-sm text-white/70">Loading group...</p>
          </div>
        </div>
      </div>
    );
  }

  const filteredRecs = getFilteredRecommendations();

  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10 lg:px-8">
        
        {groupDetails &&  (
          
          <section className="mb-8 rounded-3xl border border-white/5 bg-[#1a1a1a] shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
            <div className="p-5 md:p-6">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="space-y-3">
                  <div className="inline-flex rounded-full border border-[#e50914]/30 bg-[#e50914]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb3b7]">
                    Group
                  </div>
                  <div>
                    <h1 className="text-3xl font-black tracking-tight md:text-5xl">{groupDetails.name}</h1>
                    <p className="mt-2 max-w-3xl text-sm text-white/70 md:text-base">{groupDetails.description}</p>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-white/70">
                  <div className="text-xs uppercase tracking-[0.2em] text-white/50">Created</div>
                  <div className="mt-1 font-medium text-white">
                    {groupDetails.createdAt?.seconds
                      ? new Date(groupDetails.createdAt.seconds * 1000).toLocaleDateString()
                      : 'Unknown'}
                  </div>
                </div>
              </div>

              <div className="mt-5 border-t border-white/5 pt-5">
                <h2 className="text-lg font-semibold md:text-xl">Members</h2>
                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {groupDetails.members.map((member) => (
                    <div 
                      key={member.userId}
                      className="rounded-2xl border border-white/5 bg-[#141414] p-4"
                    >
                      <div className="font-medium text-white">
                        {memberDetails[member.userId]?.name || 'Loading...'}
                      </div>
                      <div className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
                        {member.role}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>
        )}

        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-2xl font-bold md:text-3xl">Recommended Movies</h2>
            <p className="mt-1 text-sm text-white/60">Filter by who recommended the title and by genre.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative">
              <button
                onClick={() => setShowUserFilter(!showUserFilter)}
                className="inline-flex w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white/85 transition hover:bg-white/5 sm:w-auto"
              >
                <span>
                  {selectedUsers.length === 0 
                    ? 'All Recommendations' 
                    : `${selectedUsers.length} Selected`}
                </span>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {showUserFilter && (
                <div className="absolute z-50 mt-2 w-full min-w-64 overflow-hidden rounded-2xl border border-white/5 bg-[#1a1a1a] shadow-2xl">
                  <div className="p-2">
                    {Object.entries(memberDetails)
                      .filter(([userId]) => 
                        recommendations.some(rec => 
                          rec.recommendedBy && rec.recommendedBy.includes(userId)
                        )
                      )
                      .map(([userId, user]) => (
                        <label key={userId} className="flex items-center rounded-xl px-3 py-2 text-sm transition hover:bg-white/5">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(userId)}
                            onChange={() => {
                              setSelectedUsers(prev => 
                                prev.includes(userId)
                                  ? prev.filter(id => id !== userId)
                                  : [...prev, userId]
                              );
                            }}
                            className="mr-3 accent-[#e50914]"
                          />
                          <span>{user.name}</span>
                        </label>
                      ))}
                  </div>
                </div>
              )}
            </div>

            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full rounded-full border border-white/10 bg-[#1a1a1a] px-4 py-3 text-sm text-white focus:border-[#e50914] focus:outline-none sm:w-auto"
            >
              <option value="all">All Genres</option>
              {genres.filter(genre => genre !== 'all').map(genre => (
                <option key={genre} value={genre}>
                  {genre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="space-y-8">
          {filteredRecs.combined.length > 0 && (
            <section>
              <h3 className="mb-4 text-xl font-semibold">Shared Recommendations</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {filteredRecs.combined.map(rec => (
                  <MovieCard
                    key={rec.id}
                    movie={{
                      imdbID: rec.movieId,
                      Title: rec.movie.title,
                      Poster: rec.movie.poster,
                      Type: rec.movie.type,
                      Year: rec.movie.year
                    }}
                    recommendedBy={rec.recommendedBy.map(userId => 
                      memberDetails[userId]?.name
                    ).filter(Boolean)}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredRecs.individual.length > 0 && (
            <section>
              <h3 className="mb-4 text-xl font-semibold">Individual Recommendations</h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                {filteredRecs.individual.map(rec => (
                  <MovieCard
                    key={rec.id}
                    movie={{
                      imdbID: rec.movieId,
                      Title: rec.movie.title,
                      Poster: rec.movie.poster,
                      Type: rec.movie.type,
                      Year: rec.movie.year
                    }}
                    recommendedBy={rec.recommendedBy.map(userId => 
                      memberDetails[userId]?.name
                    ).filter(Boolean)}
                  />
                ))}
              </div>
            </section>
          )}

          {filteredRecs.combined.length === 0 && filteredRecs.individual.length === 0 && (
            <div className="rounded-3xl border border-white/5 bg-[#1a1a1a] px-6 py-10 text-center shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
              <div className="text-lg font-semibold md:text-xl">No movies found with selected filters</div>
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};
export default GroupPage;







