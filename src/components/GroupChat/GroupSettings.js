import React, { useState, useEffect } from 'react';
import { ref, update, remove, get, child, set } from 'firebase/database';
import { database } from '../../firebase/config';
import { 
  FaTimes, 
  FaUserShield, 
  FaUserMinus, 
  FaPlus, 
  FaLock, 
  FaUnlock,
  FaTrash,
  FaCrown
} from 'react-icons/fa';
import './GroupSettings.css';

export default function GroupSettings({ group, currentUser, onClose }) {
  const [groupName, setGroupName] = useState(group.name || '');
  const [groupDescription, setGroupDescription] = useState(group.description || '');
  const [adminOnly, setAdminOnly] = useState(group.adminOnly || false);
  const [searchEmail, setSearchEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [members, setMembers] = useState([]);

  const isCurrentUserAdmin = group.admins && group.admins[currentUser.uid];
  const isCurrentUserCreator = group.createdBy === currentUser.uid;

  useEffect(() => {
    loadMemberDetails();
  }, [group]);

  const loadMemberDetails = async () => {
    try {
      const memberIds = Object.keys(group.members || {});
      const memberDetails = [];

      for (const memberId of memberIds) {
        const userSnapshot = await get(child(ref(database), `users/${memberId}`));
        if (userSnapshot.exists()) {
          const userData = userSnapshot.val();
          memberDetails.push({
            uid: memberId,
            name: userData.username,
            email: userData.email,
            isAdmin: group.admins && group.admins[memberId],
            isCreator: group.createdBy === memberId
          });
        }
      }

      setMembers(memberDetails);
    } catch (error) {
      console.error('Error loading member details:', error);
    }
  };

  const updateGroupSettings = async () => {
    if (!isCurrentUserAdmin) {
      alert('Only admins can update group settings');
      return;
    }

    setLoading(true);
    try {
      await update(ref(database, `groups/${group.id}`), {
        name: groupName,
        description: groupDescription,
        adminOnly: adminOnly
      });
      alert('Group settings updated successfully!');
    } catch (error) {
      console.error('Error updating group:', error);
      alert('Failed to update group settings');
    }
    setLoading(false);
  };

  const addMember = async () => {
    if (!isCurrentUserAdmin) {
      alert('Only admins can add members');
      return;
    }

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
        // Check if already a member
        if (group.members[foundUser.uid]) {
          alert('User is already a member of this group');
          return;
        }

        // Add to group members
        await update(ref(database, `groups/${group.id}/members`), {
          [foundUser.uid]: foundUser.name
        });

        // Add group to user's group list
        await set(ref(database, `users/${foundUser.uid}/groups/${group.id}`), true);

        setSearchEmail('');
        loadMemberDetails();
        alert('Member added successfully!');
      } else {
        alert('User not found');
      }
    } catch (error) {
      console.error('Error adding member:', error);
      alert('Failed to add member');
    }
  };

  const removeMember = async (memberId) => {
    if (!isCurrentUserAdmin) {
      alert('Only admins can remove members');
      return;
    }

    if (memberId === group.createdBy) {
      alert('Cannot remove the group creator');
      return;
    }

    if (window.confirm('Are you sure you want to remove this member?')) {
      try {
        // Remove from group members
        await remove(ref(database, `groups/${group.id}/members/${memberId}`));
        
        // Remove from admins if they were admin
        if (group.admins && group.admins[memberId]) {
          await remove(ref(database, `groups/${group.id}/admins/${memberId}`));
        }

        // Remove group from user's group list
        await remove(ref(database, `users/${memberId}/groups/${group.id}`));

        loadMemberDetails();
        alert('Member removed successfully!');
      } catch (error) {
        console.error('Error removing member:', error);
        alert('Failed to remove member');
      }
    }
  };

  const toggleAdmin = async (memberId) => {
    if (!isCurrentUserCreator && !isCurrentUserAdmin) {
      alert('Only the creator or admins can manage admin roles');
      return;
    }

    if (memberId === group.createdBy) {
      alert('Cannot change creator admin status');
      return;
    }

    try {
      const isCurrentlyAdmin = group.admins && group.admins[memberId];
      
      if (isCurrentlyAdmin) {
        // Remove admin
        await remove(ref(database, `groups/${group.id}/admins/${memberId}`));
        alert('Admin privileges removed');
      } else {
        // Make admin
        await update(ref(database, `groups/${group.id}/admins`), {
          [memberId]: true
        });
        alert('User promoted to admin');
      }

      loadMemberDetails();
    } catch (error) {
      console.error('Error toggling admin:', error);
      alert('Failed to update admin status');
    }
  };

  const deleteGroup = async () => {
    if (!isCurrentUserCreator) {
      alert('Only the group creator can delete the group');
      return;
    }

    if (window.confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        // Remove group from all members' group lists
        const memberIds = Object.keys(group.members || {});
        for (const memberId of memberIds) {
          await remove(ref(database, `users/${memberId}/groups/${group.id}`));
        }

        // Delete the group
        await remove(ref(database, `groups/${group.id}`));

        alert('Group deleted successfully!');
        onClose();
      } catch (error) {
        console.error('Error deleting group:', error);
        alert('Failed to delete group');
      }
    }
  };

  const leaveGroup = async () => {
    if (isCurrentUserCreator) {
      alert('Group creator cannot leave the group. Please delete the group or transfer ownership first.');
      return;
    }

    if (window.confirm('Are you sure you want to leave this group?')) {
      try {
        // Remove from group members
        await remove(ref(database, `groups/${group.id}/members/${currentUser.uid}`));
        
        // Remove from admins if they were admin
        if (group.admins && group.admins[currentUser.uid]) {
          await remove(ref(database, `groups/${group.id}/admins/${currentUser.uid}`));
        }

        // Remove group from user's group list
        await remove(ref(database, `users/${currentUser.uid}/groups/${group.id}`));

        alert('You have left the group');
        onClose();
      } catch (error) {
        console.error('Error leaving group:', error);
        alert('Failed to leave group');
      }
    }
  };

  return (
    <div className="group-settings-overlay">
      <div className="group-settings-modal">
        <div className="modal-header">
          <h2>Group Settings</h2>
          <button onClick={onClose} className="close-btn">
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          {/* Group Info */}
          <div className="settings-section">
            <h3>Group Information</h3>
            <div className="form-group">
              <label>Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                disabled={!isCurrentUserAdmin}
                placeholder="Enter group name"
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                value={groupDescription}
                onChange={(e) => setGroupDescription(e.target.value)}
                disabled={!isCurrentUserAdmin}
                placeholder="Enter group description"
                rows={3}
              />
            </div>

            <div className="form-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={adminOnly}
                  onChange={(e) => setAdminOnly(e.target.checked)}
                  disabled={!isCurrentUserAdmin}
                />
                <span className="checkbox-text">
                  {adminOnly ? <FaLock /> : <FaUnlock />}
                  Only admins can send messages
                </span>
              </label>
            </div>

            {isCurrentUserAdmin && (
              <button onClick={updateGroupSettings} className="update-btn" disabled={loading}>
                {loading ? 'Updating...' : 'Update Settings'}
              </button>
            )}
          </div>

          {/* Add Members */}
          {isCurrentUserAdmin && (
            <div className="settings-section">
              <h3>Add Members</h3>
              <div className="add-member-input">
                <input
                  type="email"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="Enter member's email"
                  onKeyDown={(e) => e.key === 'Enter' && addMember()}
                />
                <button onClick={addMember} className="add-member-btn">
                  <FaPlus />
                </button>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="settings-section">
            <h3>Members ({members.length})</h3>
            <div className="members-list">
              {members.map(member => (
                <div key={member.uid} className="member-item">
                  <div className="member-info">
                    <div className="member-name">
                      {member.name}
                      {member.isCreator && <FaCrown className="creator-badge" />}
                      {member.isAdmin && !member.isCreator && <FaUserShield className="admin-badge" />}
                    </div>
                    <div className="member-email">{member.email}</div>
                  </div>

                  {isCurrentUserAdmin && member.uid !== currentUser.uid && (
                    <div className="member-actions">
                      {!member.isCreator && (
                        <button
                          onClick={() => toggleAdmin(member.uid)}
                          className={`action-btn ${member.isAdmin ? 'remove-admin' : 'make-admin'}`}
                          title={member.isAdmin ? 'Remove admin' : 'Make admin'}
                        >
                          <FaUserShield />
                        </button>
                      )}
                      
                      {!member.isCreator && (
                        <button
                          onClick={() => removeMember(member.uid)}
                          className="action-btn remove-member"
                          title="Remove member"
                        >
                          <FaUserMinus />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Danger Zone */}
          <div className="settings-section danger-zone">
            <h3>Danger Zone</h3>
            <div className="danger-actions">
              {isCurrentUserCreator ? (
                <button onClick={deleteGroup} className="danger-btn">
                  <FaTrash /> Delete Group
                </button>
              ) : (
                <button onClick={leaveGroup} className="danger-btn">
                  <FaUserMinus /> Leave Group
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}