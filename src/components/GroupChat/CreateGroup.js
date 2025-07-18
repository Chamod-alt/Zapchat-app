import React, { useState } from 'react';
import { ref, push, set, get, child } from 'firebase/database';
import { database } from '../../firebase/config';
import { FaTimes, FaPlus, FaTrash } from 'react-icons/fa';
import './CreateGroup.css';

export default function CreateGroup({ onClose, currentUser }) {
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [searchEmail, setSearchEmail] = useState('');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const searchAndAddMember = async () => {
    if (!searchEmail.trim()) return;

    try {
      const snapshot = await get(child(ref(database), 'users'));
      const usersData = snapshot.val();
      let foundUser = null;

      for (let uid in usersData) {
        if (usersData[uid].email === searchEmail && uid !== currentUser.uid) {
          foundUser = { 
            uid, 
            name: usersData[uid].username,
            email: usersData[uid].email 
          };
          break;
        }
      }

      if (foundUser) {
        // Check if already added
        if (!selectedMembers.find(member => member.uid === foundUser.uid)) {
          setSelectedMembers(prev => [...prev, foundUser]);
          setSearchEmail('');
        } else {
          alert('User already added to the group');
        }
      } else {
        alert('User not found');
      }
    } catch (error) {
      console.error('Error searching user:', error);
      alert('Error searching for user');
    }
  };

  const removeMember = (uid) => {
    setSelectedMembers(prev => prev.filter(member => member.uid !== uid));
  };

  const createGroup = async () => {
    if (!groupName.trim()) {
      alert('Please enter a group name');
      return;
    }

    if (selectedMembers.length === 0) {
      alert('Please add at least one member');
      return;
    }

    setLoading(true);

    try {
      // Create group
      const groupsRef = ref(database, 'groups');
      const newGroupRef = push(groupsRef);
      const groupId = newGroupRef.key;

      // Prepare members object (including creator)
      const members = {
        [currentUser.uid]: currentUser.displayName || currentUser.email.split('@')[0]
      };

      selectedMembers.forEach(member => {
        members[member.uid] = member.name;
      });

      // Prepare admins object (creator is admin by default)
      const admins = {
        [currentUser.uid]: true
      };

      const groupData = {
        name: groupName,
        description: groupDescription,
        createdBy: currentUser.uid,
        createdAt: Date.now(),
        members: members,
        admins: admins,
        adminOnly: false
      };

      await set(newGroupRef, groupData);

      // Add group to each member's group list
      const memberIds = [currentUser.uid, ...selectedMembers.map(m => m.uid)];
      
      for (const memberId of memberIds) {
        await set(ref(database, `users/${memberId}/groups/${groupId}`), true);
      }

      alert('Group created successfully!');
      onClose();
    } catch (error) {
      console.error('Error creating group:', error);
      alert('Failed to create group');
    }

    setLoading(false);
  };

  return (
    <div className="create-group-overlay">
      <div className="create-group-modal">
        <div className="modal-header">
          <h2>Create New Group</h2>
          <button onClick={onClose} className="close-btn">
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          <div className="form-group">
            <label>Group Name *</label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="Enter group name"
              maxLength={50}
            />
          </div>

          <div className="form-group">
            <label>Description (Optional)</label>
            <textarea
              value={groupDescription}
              onChange={(e) => setGroupDescription(e.target.value)}
              placeholder="Enter group description"
              rows={3}
              maxLength={200}
            />
          </div>

          <div className="form-group">
            <label>Add Members</label>
            <div className="add-member-input">
              <input
                type="email"
                value={searchEmail}
                onChange={(e) => setSearchEmail(e.target.value)}
                placeholder="Enter member's email"
                onKeyDown={(e) => e.key === 'Enter' && searchAndAddMember()}
              />
              <button 
                onClick={searchAndAddMember}
                className="add-member-btn"
                type="button"
              >
                <FaPlus />
              </button>
            </div>
          </div>

          {selectedMembers.length > 0 && (
            <div className="selected-members">
              <h4>Selected Members ({selectedMembers.length})</h4>
              <div className="members-list">
                {selectedMembers.map(member => (
                  <div key={member.uid} className="member-item">
                    <div className="member-info">
                      <span className="member-name">{member.name}</span>
                      <span className="member-email">{member.email}</span>
                    </div>
                    <button
                      onClick={() => removeMember(member.uid)}
                      className="remove-member-btn"
                    >
                      <FaTrash />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="cancel-btn">
            Cancel
          </button>
          <button 
            onClick={createGroup} 
            className="create-btn"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Group'}
          </button>
        </div>
      </div>
    </div>
  );
}