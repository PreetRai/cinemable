// src/components/RecommendButton.js
import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, Timestamp, where, query, deleteDoc, doc,arrayUnion, arrayRemove, updateDoc } from 'firebase/firestore';

import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const RecommendButton = ({ movie }) => {
    const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [recommendedGroups, setRecommendedGroups] = useState([]);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const fetchGroups = async () => {
      // Fetch groups and existing recommendations for this movie
      const [groupDocs, movieRecommendations] = await Promise.all([
        getDocs(collection(db, 'groups')),
        getDocs(
          query(
            collection(db, 'recommendations'),
            where('movieId', '==', movie.imdbID)
          )
        )
      ]);

      // Get groups where user is a member
      const groupList = groupDocs.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(group => 
          group.members.some(member => member.userId === user.uid)
        );

      // Store all recommendations for this movie
      const recs = movieRecommendations.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRecommendations(recs);

      // Get groups where movie is already recommended by current user
      const userRecommendedGroups = recs
        .filter(rec => rec.recommendedBy.includes(user.uid))
        .map(rec => rec.groupId);
      setRecommendedGroups(userRecommendedGroups);
      
      setGroups(groupList);
    };

    fetchGroups();
  }, [user, movie.imdbID]);

  const handleRecommend = async () => {
    if (!selectedGroupId) return;

    try {
      // Check if movie is already recommended in this group
      const existingRec = recommendations.find(r => r.groupId === selectedGroupId);

      if (existingRec) {
        // Update existing recommendation to add current user
        const recRef = doc(db, 'recommendations', existingRec.id);
        await updateDoc(recRef, {
          recommendedBy: arrayUnion(user.uid)
        });

        setRecommendations(recommendations.map(r => 
          r.id === existingRec.id 
            ? {...r, recommendedBy: [...r.recommendedBy, user.uid]}
            : r
        ));
      } else {
        // Create new recommendation
        const recommendationRef = collection(db, 'recommendations');
        const newRec = await addDoc(recommendationRef, {
          groupId: selectedGroupId,
          movieId: movie.imdbID,
          recommendedBy: [user.uid],
          recommendedAt: Timestamp.now(),
          movie: {
            title: movie.Title,
            poster: movie.Poster,
            year: movie.Year,
            genre: movie.Genre,
            rating: movie.imdbRating,
            plot: movie.Plot,
            type: movie.Type
          }
        });

        setRecommendations([...recommendations, {
          id: newRec.id,
          groupId: selectedGroupId,
          recommendedBy: [user.uid]
        }]);
      }

      setRecommendedGroups([...recommendedGroups, selectedGroupId]);
      setShowModal(false);
      setSelectedGroupId('');
    } catch (error) {
      console.error('Error recommending movie:', error);
    }
  };

  const handleRemoveRecommendation = async (groupId) => {
    try {
      const rec = recommendations.find(r => r.groupId === groupId);
      if (rec) {
        if (rec.recommendedBy.length === 1) {
          // If last recommender, delete the recommendation
          await deleteDoc(doc(db, 'recommendations', rec.id));
          setRecommendations(recommendations.filter(r => r.id !== rec.id));
        } else {
          // Remove current user from recommendedBy array
          await updateDoc(doc(db, 'recommendations', rec.id), {
            recommendedBy: arrayRemove(user.uid)
          });
          setRecommendations(recommendations.map(r => 
            r.id === rec.id 
              ? {...r, recommendedBy: r.recommendedBy.filter(id => id !== user.uid)}
              : r
          ));
        }
        setRecommendedGroups(recommendedGroups.filter(id => id !== groupId));
      }
    } catch (error) {
      console.error('Error removing recommendation:', error);
    }
  };
  
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="bg-[#1a1a1a] text-white px-6 py-3 rounded-lg hover:bg-[#2a2a2a] 
                     transition-colors duration-300 flex items-center gap-2 ml-4"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          Recommend
        </button>
  
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-[#1a1a1a] p-8 rounded-lg w-full max-w-md">
              <h2 className="text-2xl font-bold mb-6">Manage Recommendations</h2>
              <div className="space-y-4">
                {recommendedGroups.length > 0 && (
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold mb-2">Already Recommended to:</h3>
                    {groups.filter(g => recommendedGroups.includes(g.id)).map(group => (
                      <div key={group.id} className="flex justify-between items-center p-2 bg-[#2a2a2a] rounded mb-2">
                        <span>{group.name}</span>
                        <button
                          onClick={() => handleRemoveRecommendation(group.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}
  
                <div>
                  <h3 className="text-lg font-semibold mb-2">Recommend to New Group:</h3>
                  <select
                    value={selectedGroupId}
                    onChange={(e) => setSelectedGroupId(e.target.value)}
                    className="w-full p-3 rounded bg-[#353535] text-white border-none"
                  >
                    <option value="">Select a group</option>
                    {groups
                      .filter(group => !recommendedGroups.includes(group.id))
                      .map(group => (
                        <option key={group.id} value={group.id}>
                          {group.name}
                        </option>
                      ))
                    }
                  </select>
                </div>
  
                <div className="flex gap-4 mt-4">
                  <button
                    onClick={handleRecommend}
                    disabled={!selectedGroupId}
                    className="flex-1 bg-blue-600 text-white p-3 rounded font-semibold 
                             hover:bg-blue-700 disabled:opacity-50"
                  >
                    Recommend
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      setSelectedGroupId('');
                    }}
                    className="flex-1 bg-gray-600 text-white p-3 rounded font-semibold hover:bg-gray-700"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };
  

export default RecommendButton;
