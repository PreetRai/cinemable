import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { collection, query, where, getDocs,doc,getDoc } from 'firebase/firestore';
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
      <div className="min-h-screen bg-[#353535] text-white">
        <Navbar />
        <div className="flex items-center justify-center h-screen">
          <div className="text-2xl">Loading...</div>
        </div>
      </div>
    );
  }

  const filteredRecs = getFilteredRecommendations();

  return (
    <div className="min-h-screen bg-[#353535] text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-4 md:py-8">
        
        {groupDetails &&  (
          
          <div className="bg-[#1a1a1a] rounded-lg p-4 md:p-6 mb-6 md:mb-8">
            <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4 mb-4 md:mb-6">
              <div>
                <h1 className="text-2xl md:text-4xl font-bold mb-2">{groupDetails.name}</h1>
                <p className="text-sm md:text-base text-gray-400">{groupDetails.description}</p>
              </div>
              <div className="text-xs md:text-sm bg-[#353535] px-3 py-1 md:px-4 md:py-2 rounded-full self-start">
                Created {new Date(groupDetails.createdAt.seconds * 1000).toLocaleDateString()}
              </div>
            </div>

            <div className="border-t border-gray-700 pt-4">
              <h2 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">Members</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
                {groupDetails.members.map((member) => (
                  <div 
                    key={member.userId}
                    className="bg-[#353535] p-3 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="font-medium text-sm md:text-base">
                        {memberDetails[member.userId]?.name || 'Loading...'}
                      </div>
                      <div className="text-xs md:text-sm text-gray-400">
                        {member.role}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
          <h2 className="text-xl md:text-2xl font-bold">Recommended Movies</h2>
          <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full md:w-auto">
          <div className="relative">
  <button
    onClick={() => setShowUserFilter(!showUserFilter)}
    className="w-full sm:w-auto bg-[#1a1a1a] text-white px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 text-sm md:text-base flex items-center justify-between"
  >
    <span>
      {selectedUsers.length === 0 
        ? 'All Recommendations' 
        : `${selectedUsers.length} Selected`}
    </span>
    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {showUserFilter && (
    <div className="absolute z-50 mt-2 w-full bg-[#1a1a1a] rounded-lg shadow-xl border border-gray-700">
      <div className="p-2">
      {Object.entries(memberDetails)
  .filter(([userId]) => 
    recommendations.some(rec => 
      rec.recommendedBy && rec.recommendedBy.includes(userId)
    )
  )
  .map(([userId, user]) => (
    <label key={userId} className="flex items-center p-2 hover:bg-[#2a2a2a] rounded">
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
        className="mr-2"
      />
      <span className="text-sm">{user.name}</span>
    </label>
  ))
}

      </div>
    </div>
  )}
</div>

            <select
              value={selectedGenre}
              onChange={(e) => setSelectedGenre(e.target.value)}
              className="w-full sm:w-auto bg-[#1a1a1a] text-white px-3 py-2 md:px-4 md:py-2 rounded-lg border border-gray-700 focus:outline-none focus:border-blue-500 text-sm md:text-base"
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
            <div>
              <h3 className="text-xl font-semibold mb-4">Shared Recommendations</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
            </div>
          )}

          {filteredRecs.individual.length > 0 && (
            <div>
              <h3 className="text-xl font-semibold mb-4">Individual Recommendations</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
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
            </div>
          )}

          {filteredRecs.combined.length === 0 && filteredRecs.individual.length === 0 && (
            <div className="text-center text-lg md:text-xl opacity-75 mt-8">
              No movies found with selected filters
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
};
export default GroupPage;







