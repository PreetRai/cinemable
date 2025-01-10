import React, { useState, useEffect } from 'react';
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
          group.members.some(member => member.userId === user.uid)
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
    <div className="min-h-screen bg-[#353535] text-white">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">My Groups</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {groups.map(group => (
  <div key={group.id} 
       className="bg-[#1a1a1a] p-6 rounded-lg hover:scale-105 transition-transform duration-300 relative"
  >
    {/* Options Button */}
    <div className="absolute top-4 right-4 options-container" onClick={(e) => e.stopPropagation()}>
      <div className="relative">
        <button 
          onClick={() => setOpenOptionsId(openOptionsId === group.id ? null : group.id)}
          className="p-2 hover:bg-[#2a2a2a] rounded-full"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
          </svg>
        </button>
        
        {openOptionsId === group.id && (
          <div className="absolute right-0 mt-2 w-48 bg-[#1a1a1a] rounded-lg shadow-xl z-50 border border-gray-700">
            <button
              onClick={() => {
                setShowEditModal(true);
                setEditingGroup(group);
                setOpenOptionsId(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-[#2a2a2a] rounded-t-lg"
            >
              Edit Group
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(group.inviteCode);
                setOpenOptionsId(null);
              }}
              className="w-full text-left px-4 py-2 hover:bg-[#2a2a2a]"
            >
              Copy Invite Code
            </button>
            {group.members.find(member => 
              member.userId === user.uid && member.role === 'admin'
            ) ? (
              <button
                onClick={() => {
                  handleDeleteGroup(group.id);
                  setOpenOptionsId(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-red-600 rounded-b-lg text-red-500 hover:text-white"
              >
                Delete Group
              </button>
            ) : (
              <button
                onClick={() => {
                  handleExitGroup(group.id);
                  setOpenOptionsId(null);
                }}
                className="w-full text-left px-4 py-2 hover:bg-red-600 rounded-b-lg text-red-500 hover:text-white"
              >
                Exit Group
              </button>
            )}
          </div>
        )}
      </div>
    </div>

    {/* Card Content - Clickable for navigation */}
    <div onClick={() => navigate(`/group/${group.id}`)} className="cursor-pointer">
      <h2 className="text-2xl font-bold mb-2">{group.name}</h2>
      <p className="text-sm opacity-75 mb-4">{group.description}</p>
      <div className="flex justify-between items-center text-sm opacity-75">
        <span>{group.members?.length || 1} members</span>
        <span className="bg-[#353535] px-3 py-1 rounded-full">
          {recommendationCounts[group.id] || 0} movies
        </span>
      </div>
    </div>
  </div>
))}

          
          <div 
            onClick={() => setShowCreateModal(true)}
            className="bg-[#1a1a1a] p-6 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#2a2a2a] hover:scale-105 transition-all duration-300"
          >
            <span className="text-2xl font-bold flex items-center gap-2">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Create Group
            </span>
          </div>
          <div 
    onClick={() => setShowJoinModal(true)}
    className="bg-[#1a1a1a] p-6 rounded-lg flex items-center justify-center cursor-pointer hover:bg-[#2a2a2a] hover:scale-105 transition-all duration-300"
  >
    <span className="text-2xl font-bold flex items-center gap-2">
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
      </svg>
      Join Group
    </span>
  </div>
        </div>
      </div>
{/* Join Group Modal */}
{showJoinModal && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-[#1a1a1a] p-8 rounded-lg w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6">Join Group</h2>
      {joinError && (
        <div className="bg-red-500 bg-opacity-10 border border-red-500 text-red-500 px-4 py-2 rounded mb-4">
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
            className="w-full p-3 rounded bg-[#353535] text-white border-none uppercase"
            placeholder="Enter invite code"
            required
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700"
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
            className="flex-1 bg-gray-600 text-white p-3 rounded font-semibold hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  </div>
)}

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#1a1a1a] p-8 rounded-lg w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">Create New Group</h2>
            <form onSubmit={handleCreateGroup} className="space-y-4">
              <div>
                <label className="block mb-2">Group Name</label>
                <input
                  type="text"
                  value={newGroup.name}
                  onChange={(e) => setNewGroup({...newGroup, name: e.target.value})}
                  className="w-full p-3 rounded bg-[#353535] text-white border-none"
                  required
                />
              </div>
              <div>
                <label className="block mb-2">Description</label>
                <textarea
                  value={newGroup.description}
                  onChange={(e) => setNewGroup({...newGroup, description: e.target.value})}
                  className="w-full p-3 rounded bg-[#353535] text-white border-none"
                  rows="3"
                  required
                />
              </div>
              <div className="flex gap-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700"
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-600 text-white p-3 rounded font-semibold hover:bg-gray-700"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showEditModal && editingGroup && (
  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div className="bg-[#1a1a1a] p-8 rounded-lg w-full max-w-md">
      <h2 className="text-2xl font-bold mb-6">Edit Group</h2>
      <form onSubmit={handleEditGroup} className="space-y-4">
        <div>
          <label className="block mb-2">Group Name</label>
          <input
            type="text"
            value={editingGroup.name}
            onChange={(e) => setEditingGroup({...editingGroup, name: e.target.value})}
            className="w-full p-3 rounded bg-[#353535] text-white border-none"
            required
          />
        </div>
        <div>
          <label className="block mb-2">Description</label>
          <textarea
            value={editingGroup.description}
            onChange={(e) => setEditingGroup({...editingGroup, description: e.target.value})}
            className="w-full p-3 rounded bg-[#353535] text-white border-none"
            rows="3"
            required
          />
        </div>
        <div className="flex gap-4">
          <button
            type="submit"
            className="flex-1 bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700"
          >
            Save Changes
          </button>
          <button
            type="button"
            onClick={() => {
              setShowEditModal(false);
              setEditingGroup(null);
            }}
            className="flex-1 bg-gray-600 text-white p-3 rounded font-semibold hover:bg-gray-700"
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
