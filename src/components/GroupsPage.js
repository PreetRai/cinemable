import React, { useState, useEffect, useMemo } from 'react';
import { 
    collection, 
    getDocs, 
    addDoc, 
    Timestamp,
    doc, 
    deleteDoc, 
    updateDoc,
    where, 
    query,
    arrayUnion,
    getDoc
  } from 'firebase/firestore';
  
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';

const GroupsPage = () => {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newGroup, setNewGroup] = useState({ name: '', description: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null);
  const [openOptionsId, setOpenOptionsId] = useState(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [joinError, setJoinError] = useState('');
  const [recommendationCounts, setRecommendationCounts] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const fetchGroups = async () => {
      const groupsCollection = collection(db, 'groups');
      const groupDocs = await getDocs(groupsCollection);
      const groupList = groupDocs.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(group => 
          group.members?.some(member => member.userId === user.uid)
        );
      setGroups(groupList);
    };
  
    fetchGroups();
  }, [user]);
  
useEffect(() => {
  const handleClickOutside = (event) => {
    if (openOptionsId && !event.target.closest('.options-container')) {
      setOpenOptionsId(null);
    }
  }; document.addEventListener('mousedown', handleClickOutside);
  return () => document.removeEventListener('mousedown', handleClickOutside);
}, [openOptionsId]);

useEffect(() => {
    const fetchRecommendationCounts = async () => {
      const recommendationsRef = collection(db, 'recommendations');
      const recommendationsSnapshot = await getDocs(recommendationsRef);
      
      const counts = {};
      recommendationsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        counts[data.groupId] = (counts[data.groupId] || 0) + 1;
      });
      
      setRecommendationCounts(counts);
    };
  
    fetchRecommendationCounts();
  }, []);

  const totalMovies = useMemo(
    () => Object.values(recommendationCounts).reduce((sum, count) => sum + count, 0),
    [recommendationCounts]
  );

  
  const handleCreateGroup = async (e) => {
    e.preventDefault();
    const groupRef = collection(db, 'groups');
    
    // Create the new group object
    const newGroupData = {
      ...newGroup,
      createdBy: user.uid,
      createdAt: Timestamp.now(),
      members: [{
        userId: user.uid,
        role: 'admin',
        joinedAt: Timestamp.now()
      }],
      inviteCode: Math.random().toString(36).substring(2, 8).toUpperCase()
    };
  
    // Add to Firestore
    const docRef = await addDoc(groupRef, newGroupData);
    
    // Update local state with the new group
    setGroups(prevGroups => [...prevGroups, {
      id: docRef.id,
      ...newGroupData
    }]);
  
    // Reset form and close modal
    setShowCreateModal(false);
    setNewGroup({ name: '', description: '' });
  };
  
  const handleDeleteGroup = async (groupId) => {
    await deleteDoc(doc(db, 'groups', groupId));
    setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
  };

  const handleEditGroup = async (e) => {
    e.preventDefault();
    const groupRef = doc(db, 'groups', editingGroup.id);
    await updateDoc(groupRef, {
      name: editingGroup.name,
      description: editingGroup.description
    });

    setGroups(prevGroups => prevGroups.map(group => 
        group.id === editingGroup.id ? {...group, ...editingGroup} : group
      ));
      setShowEditModal(false);
      setEditingGroup(null);
    };
    


    const handleJoinGroup = async (e) => {
        e.preventDefault();
        setJoinError('');
        
        try {
          const groupsRef = collection(db, 'groups');
          const q = query(groupsRef, where('inviteCode', '==', inviteCode.toUpperCase()));
          const querySnapshot = await getDocs(q);
          
          if (querySnapshot.empty) {
            setJoinError('Invalid invite code');
            return;
          }
      
          const groupDoc = querySnapshot.docs[0];
          const groupData = groupDoc.data();
          
          // Check if user is already a member
          if (groupData.members.some(member => member.userId === user.uid)) {
            setJoinError('You are already a member of this group');
            return;
          }
      
          const newMember = {
            userId: user.uid,
            role: 'member',
            joinedAt: Timestamp.now()
          };
      
          // Update Firestore
          const groupRef = doc(db, 'groups', groupDoc.id);
          await updateDoc(groupRef, {
            members: arrayUnion(newMember)
          });
      
          // Update local state
          setGroups(prevGroups => {
            const groupExists = prevGroups.some(g => g.id === groupDoc.id);
            if (groupExists) {
              return prevGroups.map(g => 
                g.id === groupDoc.id 
                  ? {...g, members: [...g.members, newMember]}
                  : g
              );
            }
            return [...prevGroups, {
              id: groupDoc.id,
              ...groupData,
              members: [...groupData.members, newMember]
            }];
          });
      
          setShowJoinModal(false);
          setInviteCode('');
        } catch (error) {
          console.error('Join error:', error);
          setJoinError('Failed to join group');
        }
      };
      
      const handleExitGroup = async (groupId) => {
        const groupRef = doc(db, 'groups', groupId);
        const groupDoc = await getDoc(groupRef);
        const groupData = groupDoc.data();
        
        // Remove the current user from members array
        const updatedMembers = groupData.members.filter(
          member => member.userId !== user.uid
        );
        
        await updateDoc(groupRef, {
          members: updatedMembers
        });
        
        // Update local state
        setGroups(prevGroups => prevGroups.filter(group => group.id !== groupId));
      };
      
    
  return (
    <div className="min-h-screen bg-[#141414] text-white">
      <Navbar />
      <div className="mx-auto max-w-7xl px-4 py-6 pb-24 md:px-6 md:py-10 lg:px-8">
        <section className="mb-8 rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)] md:p-8">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <div className="inline-flex rounded-full border border-[#e50914]/30 bg-[#e50914]/15 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-[#ffb3b7]">
                Groups
              </div>
              <div>
                <h1 className="text-3xl font-black tracking-tight md:text-5xl">My Groups</h1>
                <p className="mt-2 max-w-2xl text-sm text-white/70 md:text-base">
                  Create rooms, share invite codes, and keep recommendations curated together.
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-white/60">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{groups.length} groups</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">{totalMovies} movies</span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 font-semibold text-white transition hover:bg-white/10"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                Create Group
              </button>

              <button
                onClick={() => setShowJoinModal(true)}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[#e50914] px-5 py-3 font-semibold text-white shadow-lg shadow-[#e50914]/20 transition hover:bg-[#c40812]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Join Group
              </button>
            </div>
          </div>
        </section>

        {groups.length === 0 ? (
          <div className="rounded-3xl border border-white/5 bg-[#1a1a1a] px-6 py-12 text-center shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
            <div className="text-2xl font-bold">No groups yet</div>
            <p className="mt-2 text-sm text-white/60">Create a group or join one with an invite code to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
            {groups.map(group => (
              <div
                key={group.id}
                className="relative overflow-hidden rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 shadow-[0_16px_50px_rgba(0,0,0,0.35)] transition duration-300 hover:-translate-y-1 hover:border-[#e50914]/40"
              >
                <div className="absolute top-4 right-4 options-container" onClick={(e) => e.stopPropagation()}>
                  <div className="relative">
                    <button
                      onClick={() => setOpenOptionsId(openOptionsId === group.id ? null : group.id)}
                      className="rounded-full border border-white/10 bg-black/30 p-2 text-white/80 backdrop-blur transition hover:bg-white/10"
                      aria-label="Group options"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                      </svg>
                    </button>

                    {openOptionsId === group.id && (
                      <div className="absolute right-0 mt-2 w-48 overflow-hidden rounded-2xl border border-white/5 bg-[#1a1a1a] shadow-2xl z-50">
                        <button
                          onClick={() => {
                            setShowEditModal(true);
                            setEditingGroup(group);
                            setOpenOptionsId(null);
                          }}
                          className="w-full px-4 py-3 text-left text-sm transition hover:bg-white/5"
                        >
                          Edit Group
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(group.inviteCode);
                            setOpenOptionsId(null);
                          }}
                          className="w-full px-4 py-3 text-left text-sm transition hover:bg-white/5"
                        >
                          Copy Invite Code
                        </button>
                        {group.members?.find(member => 
                          member.userId === user.uid && member.role === 'admin'
                        ) ? (
                          <button
                            onClick={() => {
                              handleDeleteGroup(group.id);
                              setOpenOptionsId(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-[#ff9aa0] transition hover:bg-[#e50914] hover:text-white"
                          >
                            Delete Group
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              handleExitGroup(group.id);
                              setOpenOptionsId(null);
                            }}
                            className="w-full px-4 py-3 text-left text-sm text-[#ff9aa0] transition hover:bg-[#e50914] hover:text-white"
                          >
                            Exit Group
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div onClick={() => navigate(`/group/${group.id}`)} className="cursor-pointer pt-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h2 className="text-2xl font-bold leading-tight">{group.name}</h2>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/60">
                      Group
                    </span>
                  </div>
                  <p className="text-sm leading-6 text-white/70">{group.description}</p>
                  <div className="mt-5 flex items-center justify-between text-sm text-white/70">
                    <span>{group.members?.length || 1} members</span>
                    <span className="rounded-full border border-white/10 bg-[#141414] px-3 py-1 text-white/80">
                      {recommendationCounts[group.id] || 0} movies
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showJoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 shadow-2xl md:p-8">
            <h2 className="text-2xl font-bold mb-6">Join Group</h2>
            {joinError && (
              <div className="mb-4 rounded-2xl border border-[#e50914]/30 bg-[#e50914]/10 px-4 py-2 text-[#ffb3b7]">
                {joinError}
              </div>
            )}
            <form onSubmit={handleJoinGroup} className="space-y-4">
              <div>
                <label className="block mb-2">Invite Code</label>
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#141414] p-3 uppercase text-white focus:border-[#e50914] focus:outline-none"
                  placeholder="Enter invite code"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#e50914] p-3 font-semibold text-white hover:bg-[#c40812]"
                >
                  Join
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowJoinModal(false);
                    setInviteCode('');
                    setJoinError('');
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 shadow-2xl md:p-8">
            <h2 className="text-2xl font-bold mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block mb-2">Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-[#141414] p-3 text-white focus:border-[#e50914] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-[#141414] p-3 text-white focus:border-[#e50914] focus:outline-none"
                  rows="3"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#e50914] p-3 font-semibold text-white hover:bg-[#c40812]"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/5 bg-[#1a1a1a] p-6 shadow-2xl md:p-8">
            <h2 className="text-2xl font-bold mb-6">Edit Group</h2>
            <form onSubmit={handleEditGroup} className="space-y-4">
              <div>
                <label className="block mb-2">Group Name</label>
                <input
                  type="text"
                  value={editingGroup.name}
                  onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-[#141414] p-3 text-white focus:border-[#e50914] focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Description</label>
                <textarea
                  value={editingGroup.description}
                  onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
                  className="w-full rounded-xl border border-white/10 bg-[#141414] p-3 text-white focus:border-[#e50914] focus:outline-none"
                  rows="3"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 rounded-xl bg-[#e50914] p-3 font-semibold text-white hover:bg-[#c40812]"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingGroup(null);
                  }}
                  className="flex-1 rounded-xl border border-white/10 bg-white/5 p-3 font-semibold text-white hover:bg-white/10"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupsPage;
