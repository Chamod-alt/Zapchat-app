import React, { useState, useEffect } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '../../firebase/config';
import { FaTimes, FaCheck } from 'react-icons/fa';
import './MessageInfo.css';

export default function MessageInfo({ message, group, onClose }) {
  const [memberDetails, setMemberDetails] = useState({});
  const [messageStatus, setMessageStatus] = useState(null);

  useEffect(() => {
    loadMemberDetails();
    loadMessageStatus();
  }, [message, group]);

  const loadMemberDetails = async () => {
    const members = {};
    const memberIds = Object.keys(group.members || {});
    
    for (const memberId of memberIds) {
      if (memberId !== message.senderId) {
        const userRef = ref(database, `users/${memberId}`);
        onValue(userRef, (snapshot) => {
          if (snapshot.exists()) {
            const userData = snapshot.val();
            members[memberId] = {
              name: userData.username,
              email: userData.email
            };
            setMemberDetails(prev => ({ ...prev, ...members }));
          }
        });
      }
    }
  };

  const loadMessageStatus = () => {
    const messageRef = ref(database, `groups/${group.id}/messages/${message.id}/status`);
    onValue(messageRef, (snapshot) => {
      if (snapshot.exists()) {
        setMessageStatus(snapshot.val());
      }
    });
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return 'Not available';
    return new Date(timestamp).toLocaleString();
  };

  const getDeliveredMembers = () => {
    if (!messageStatus?.delivered) return [];
    return Object.keys(messageStatus.delivered).map(memberId => ({
      id: memberId,
      name: memberDetails[memberId]?.name || 'Unknown',
      time: messageStatus.delivered[memberId]
    }));
  };

  const getReadMembers = () => {
    if (!messageStatus?.read) return [];
    return Object.keys(messageStatus.read).map(memberId => ({
      id: memberId,
      name: memberDetails[memberId]?.name || 'Unknown',
      time: messageStatus.read[memberId]
    }));
  };

  const deliveredMembers = getDeliveredMembers();
  const readMembers = getReadMembers();
  const totalMembers = Object.keys(group.members || {}).length - 1; // Exclude sender

  return (
    <div className="message-info-overlay">
      <div className="message-info-modal">
        <div className="modal-header">
          <h2>Message Info</h2>
          <button onClick={onClose} className="close-btn">
            <FaTimes />
          </button>
        </div>

        <div className="modal-content">
          <div className="message-preview">
            <div className="message-text">{message.text}</div>
            <div className="message-meta">
              <span>Sent: {formatTime(message.timestamp)}</span>
            </div>
          </div>

          <div className="status-section">
            <div className="status-item">
              <div className="status-header">
                <FaCheck className="status-icon" />
                <span>Delivered to {deliveredMembers.length} of {totalMembers}</span>
              </div>
              <div className="member-list">
                {deliveredMembers.map(member => (
                  <div key={member.id} className="member-item">
                    <span className="member-name">{member.name}</span>
                    <span className="member-time">{formatTime(member.time)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="status-item">
              <div className="status-header">
                <div className="double-check">
                  <FaCheck className="check1" />
                  <FaCheck className="check2 blue" />
                </div>
                <span>Read by {readMembers.length} of {totalMembers}</span>
              </div>
              <div className="member-list">
                {readMembers.map(member => (
                  <div key={member.id} className="member-item">
                    <span className="member-name">{member.name}</span>
                    <span className="member-time">{formatTime(member.time)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}