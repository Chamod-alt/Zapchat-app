import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { 
  ref, 
  onValue, 
  push, 
  set, 
  remove, 
  get, 
  child,
  update,
  serverTimestamp
} from 'firebase/database';
import { database } from '../../firebase/config';
import {
  FaPaperPlane,
  FaTrash,
  FaImage,
  FaPlus,
  FaUsers,
  FaCog,
  FaReply,
  FaUserShield,
  FaUserMinus,
  FaLock,
  FaUnlock,
  FaBars,
  FaInfo,
  FaCheck,
  FaTimes
} from 'react-icons/fa';
import GroupSettings from './GroupSettings';
import CreateGroup from './CreateGroup';
import MessageInfo from './MessageInfo';
import './GroupChat.css';

export default function GroupChat() {
  const { currentUser } = useAuth();
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState('');
  const [image, setImage] = useState(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showGroupSettings, setShowGroupSettings] = useState(false);
  const [showMessageInfo, setShowMessageInfo] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [replyingTo, setReplyingTo] = useState(null);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [showMentions, setShowMentions] = useState(false);
  const [currentGroup, setCurrentGroup] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState({});
  const bottomRef = useRef(null);
  const messageInputRef = useRef(null);
  const [currentUserData, setCurrentUserData] = useState(null);

  // Track online users
  useEffect(() => {
    if (!currentUser) return;

    const userOnlineRef = ref(database, `users/${currentUser.uid}/online`);
    set(userOnlineRef, true);

    // Set offline when user leaves
    const handleBeforeUnload = () => {
      set(userOnlineRef, false);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    // Listen to all users online status
    const usersRef = ref(database, 'users');
    onValue(usersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const online = {};
      Object.keys(data).forEach(uid => {
        online[uid] = data[uid].online || false;
      });
      setOnlineUsers(online);
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      set(userOnlineRef, false);
    };
  }, [currentUser]);

  // Load current user data
  useEffect(() => {
    if (!currentUser) return;

    const userRef = ref(database, `users/${currentUser.uid}`);
    onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentUserData(snapshot.val());
      }
    });
  }, [currentUser]);

  // Load user's groups
  useEffect(() => {
    if (!currentUser) return;

    const userGroupsRef = ref(database, `users/${currentUser.uid}/groups`);
    onValue(userGroupsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const groupIds = Object.keys(data);
      
      if (groupIds.length === 0) {
        setGroups([]);
        return;
      }

      // Load group details
      const groupPromises = groupIds.map(async (groupId) => {
        const groupSnapshot = await get(child(ref(database), `groups/${groupId}`));
        if (groupSnapshot.exists()) {
          return { id: groupId, ...groupSnapshot.val() };
        }
        return null;
      });

      Promise.all(groupPromises).then((loadedGroups) => {
        const validGroups = loadedGroups.filter(group => group !== null);
        setGroups(validGroups);
        
        if (!selectedGroupId && validGroups.length > 0) {
          setSelectedGroupId(validGroups[0].id);
        }
      });
    });
  }, [currentUser]);

  // Load messages for selected group
  useEffect(() => {
    if (!selectedGroupId) return;

    const messagesRef = ref(database, `groups/${selectedGroupId}/messages`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val() || {};
      const loadedMessages = Object.keys(data).map(msgId => ({
        id: msgId,
        ...data[msgId]
      })).sort((a, b) => a.timestamp - b.timestamp);
      
      setMessages(loadedMessages);

      // Mark messages as delivered for current user
      loadedMessages.forEach(msg => {
        if (msg.senderId !== currentUser.uid) {
          const deliveredRef = ref(database, `groups/${selectedGroupId}/messages/${msg.id}/status/delivered/${currentUser.uid}`);
          set(deliveredRef, Date.now());
        }
      });
    });

    // Load current group details
    const groupRef = ref(database, `groups/${selectedGroupId}`);
    onValue(groupRef, (snapshot) => {
      if (snapshot.exists()) {
        setCurrentGroup({ id: selectedGroupId, ...snapshot.val() });
      }
    });
  }, [selectedGroupId]);

  // Mark messages as read when user is viewing
  useEffect(() => {
    if (!selectedGroupId || !currentUser) return;

    const markAsRead = () => {
      messages.forEach(msg => {
        if (msg.senderId !== currentUser.uid) {
          const readRef = ref(database, `groups/${selectedGroupId}/messages/${msg.id}/status/read/${currentUser.uid}`);
          set(readRef, Date.now());
        }
      });
    };

    const timer = setTimeout(markAsRead, 1000);
    return () => clearTimeout(timer);
  }, [messages, selectedGroupId, currentUser]);

  // Auto scroll to bottom
  useEffect(() => {
    setTimeout(() => {
      if (bottomRef.current) {
        bottomRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  }, [messages]);

  // Auto-hide sidebar on mobile
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarVisible(false);
      } else {
        setSidebarVisible(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Check if we should show sender name (first message in sequence or after time gap)
  const shouldShowSenderName = (message, index) => {
    if (index === 0) return true;
    
    const prevMessage = messages[index - 1];
    const timeDiff = message.timestamp - prevMessage.timestamp;
    const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
    
    // Show name if different sender, time gap > 5 minutes, or if replying
    return prevMessage.senderId !== message.senderId || 
           timeDiff > fiveMinutes || 
           message.replyTo;
  };

  // Group consecutive messages by same sender
  const groupMessages = (messages) => {
    const grouped = [];
    let currentGroup = null;

    messages.forEach((message, index) => {
      const showName = shouldShowSenderName(message, index);
      
      if (showName || !currentGroup || currentGroup.senderId !== message.senderId) {
        // Start new group
        currentGroup = {
          senderId: message.senderId,
          senderName: message.senderName,
          messages: [{ ...message, showName }],
          isCurrentUser: message.senderId === currentUser.uid
        };
        grouped.push(currentGroup);
      } else {
        // Add to current group
        currentGroup.messages.push({ ...message, showName: false });
      }
    });

    return grouped;
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleMentionInput = (text) => {
    const mentionMatch = text.match(/@(\w*)$/);
    if (mentionMatch && currentGroup) {
      const query = mentionMatch[1].toLowerCase();
      const members = Object.keys(currentGroup.members || {});
      
      const suggestions = members
        .filter(memberId => {
          const memberName = currentGroup.members[memberId].toLowerCase();
          return memberName.includes(query) && memberId !== currentUser.uid;
        })
        .map(memberId => ({
          id: memberId,
          name: currentGroup.members[memberId]
        }));
      
      setMentionSuggestions(suggestions);
      setShowMentions(suggestions.length > 0);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (member) => {
    const text = newMsg;
    const mentionMatch = text.match(/@(\w*)$/);
    if (mentionMatch) {
      const newText = text.replace(/@(\w*)$/, `@${member.name} `);
      setNewMsg(newText);
    }
    setShowMentions(false);
    messageInputRef.current?.focus();
  };

  const sendMessage = async () => {
    if (!newMsg.trim() && !image) return;
    if (!currentGroup) return;

    // Check if only admins can message and user is not admin
    if (currentGroup.adminOnly && !isUserAdmin(currentUser.uid)) {
      alert('Only admins can send messages in this group');
      return;
    }

    const messagesRef = ref(database, `groups/${selectedGroupId}/messages`);
    const newMessageRef = push(messagesRef);

    let base64Image = null;
    if (image) {
      base64Image = await convertToBase64(image);
    }

    // Extract mentions from message
    const mentions = [];
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(newMsg)) !== null) {
      const mentionedName = match[1];
      const mentionedMember = Object.keys(currentGroup.members || {}).find(
        memberId => currentGroup.members[memberId].toLowerCase() === mentionedName.toLowerCase()
      );
      if (mentionedMember) {
        mentions.push(mentionedMember);
      }
    }

    const message = {
      text: newMsg,
      senderId: currentUser.uid,
      senderName: currentUserData?.username || currentGroup.members[currentUser.uid] || 'Unknown',
      timestamp: Date.now(),
      imageUrl: base64Image,
      mentions: mentions,
      replyTo: replyingTo,
      status: {
        sent: Date.now(),
        delivered: {},
        read: {}
      }
    };

    await set(newMessageRef, message);

    setNewMsg('');
    setImage(null);
    setReplyingTo(null);
  };

  const deleteMessage = async (msgId) => {
    if (!isUserAdmin(currentUser.uid)) {
      alert('Only admins can delete messages');
      return;
    }

    if (window.confirm('Are you sure you want to delete this message?')) {
      await remove(ref(database, `groups/${selectedGroupId}/messages/${msgId}`));
    }
  };

  const isUserAdmin = (userId) => {
    return currentGroup?.admins && currentGroup.admins[userId] === true;
  };

  const isUserCreator = (userId) => {
    return currentGroup?.createdBy === userId;
  };

  const handleReply = (message) => {
    setReplyingTo(message);
    messageInputRef.current?.focus();
  };

  const cancelReply = () => {
    setReplyingTo(null);
  };

  const formatMessage = (text) => {
    if (!text) return '';
    
    // Replace mentions with styled spans
    return text.replace(/@(\w+)/g, '<span class="mention">@$1</span>');
  };

  const getRepliedMessage = (replyToId) => {
    return messages.find(msg => msg.id === replyToId);
  };

  const getMessageStatus = (message) => {
    if (!message.status || message.senderId !== currentUser.uid) return null;

    const groupMembers = Object.keys(currentGroup?.members || {}).filter(id => id !== currentUser.uid);
    const deliveredCount = Object.keys(message.status.delivered || {}).length;
    const readCount = Object.keys(message.status.read || {}).length;

    if (readCount === groupMembers.length) {
      return { type: 'read', icon: 'double-check-blue' };
    } else if (deliveredCount === groupMembers.length) {
      return { type: 'delivered', icon: 'double-check' };
    } else if (deliveredCount > 0) {
      return { type: 'sent', icon: 'single-check' };
    }
    return { type: 'sending', icon: 'clock' };
  };

  const handleMessageInfo = (message) => {
    setSelectedMessage(message);
    setShowMessageInfo(true);
  };

  const toggleSidebar = () => {
    setSidebarVisible(!sidebarVisible);
  };

  return (
    <div className={`group-chat-container ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      <aside className={`group-sidebar ${!sidebarVisible ? 'hidden' : ''}`}>
        <div className="group-sidebar-header">
          <h3>Groups</h3>
          <div className="header-buttons">
            <button 
              className="btn create-group-btn"
              onClick={() => setShowCreateGroup(true)}
            >
              <FaPlus />
            </button>
            <button 
              className="btn toggle-sidebar-btn"
              onClick={toggleSidebar}
            >
              <FaTimes />
            </button>
          </div>
        </div>

        <div className="group-list">
          {groups.map(group => (
            <div
              key={group.id}
              className={`group-item ${selectedGroupId === group.id ? 'active' : ''}`}
              onClick={() => setSelectedGroupId(group.id)}
            >
              <div className="group-avatar">
                <FaUsers />
              </div>
              <div className="group-info">
                <div className="group-name">{group.name}</div>
                <div className="group-members">
                  {Object.keys(group.members || {}).length} members
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="group-chat-main">
        {selectedGroupId && currentGroup ? (
          <>
            <div className="group-chat-header">
              {!sidebarVisible && (
                <button 
                  className="btn toggle-sidebar-btn mobile-toggle"
                  onClick={toggleSidebar}
                >
                  <FaBars />
                </button>
              )}
              <div className="group-header-info">
                <h3>{currentGroup.name}</h3>
                <span className="member-count">
                  {Object.keys(currentGroup.members || {}).length} members
                  {currentGroup.adminOnly && <FaLock className="admin-only-icon" />}
                </span>
              </div>
              <button
                className="btn settings-btn"
                onClick={() => setShowGroupSettings(true)}
              >
                <FaCog />
              </button>
            </div>

            <div className="group-messages-area">
              {groupMessages(messages).map((group, groupIndex) => (
                <div key={`group-${groupIndex}`} className={`message-group ${group.isCurrentUser ? 'own-messages' : 'other-messages'}`}>
                  {group.messages[0].showName && !group.isCurrentUser && (
                    <div className="sender-name-header">
                      <span className="sender-name">
                        {String(group.senderName)}
                        {isUserAdmin(group.senderId) && (
                          <FaUserShield className="admin-badge" />
                        )}
                      </span>
                    </div>
                  )}
                  
                  {group.messages.map((message, messageIndex) => (
                    <div key={message.id} className={`message-bubble ${group.isCurrentUser ? 'own-message' : 'other-message'}`}>
                      {message.replyTo && (
                        <div className="reply-context">
                          <div className="reply-line"></div>
                          <div className="reply-content">
                            {(() => {
                              const repliedMsg = getRepliedMessage(message.replyTo.id);
                              return repliedMsg ? (
                                <>
                                  <span className="reply-sender">{String(repliedMsg.senderName)}</span>
                                  <span className="reply-text">{repliedMsg.text}</span>
                                </>
                              ) : (
                                <span className="reply-deleted">Message deleted</span>
                              );
                            })()}
                          </div>
                        </div>
                      )}

                      {message.imageUrl && (
                        <img 
                          src={message.imageUrl} 
                          alt="upload" 
                          className="message-image" 
                        />
                      )}

                      {message.text && (
                        <div 
                          className="message-text"
                          dangerouslySetInnerHTML={{ __html: formatMessage(message.text) }}
                        />
                      )}

                      <div className="message-footer">
                        <span className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        
                        {message.senderId === currentUser.uid && (
                          <div className="message-status">
                            {(() => {
                              const status = getMessageStatus(message);
                              if (!status) return null;
                              
                              return (
                                <span className={`status-icon ${status.type}`}>
                                  {status.icon === 'double-check-blue' && <><FaCheck className="check1" /><FaCheck className="check2 blue" /></>}
                                  }
                                  {status.icon === 'double-check' && <><FaCheck className="check1" /><FaCheck className="check2" /></>}
                                  }
                                  {status.icon === 'single-check' && <FaCheck />}
                                </span>
                              );
                            })()}
                          </div>
                        )}
                      </div>

                      <div className="message-actions">
                        <button
                          className="action-btn"
                          onClick={() => handleReply(message)}
                        >
                          <FaReply />
                        </button>
                        {message.senderId === currentUser.uid && (
                          <button
                            className="action-btn"
                            onClick={() => handleMessageInfo(message)}
                          >
                            <FaInfo />
                          </button>
                        )}
                        {(isUserAdmin(currentUser.uid) || message.senderId === currentUser.uid) && (
                          <button
                            className="action-btn delete-btn"
                            onClick={() => deleteMessage(message.id)}
                          >
                            <FaTrash />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
              <div ref={bottomRef}></div>
            </div>

            <div className="group-input-area">
              {replyingTo && (
                <div className="reply-preview">
                  <div className="reply-info">
                    <FaReply />
                    <span>Replying to {String(replyingTo.senderName)}</span>
                    <button onClick={cancelReply} className="cancel-reply">×</button>
                  </div>
                  <div className="reply-message">{replyingTo.text}</div>
                </div>
              )}

              {showMentions && (
                <div className="mention-suggestions">
                  {mentionSuggestions.map(member => (
                    <div
                      key={member.id}
                      className="mention-item"
                      onClick={() => insertMention(member)}
                    >
                      @{member.name}
                    </div>
                  ))}
                </div>
              )}

              <div className="input-controls">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setImage(e.target.files[0])}
                  className="file-input"
                  id="groupImgUpload"
                />
                <label htmlFor="groupImgUpload" className="image-upload-label">
                  <FaImage />
                </label>

                <input
                  ref={messageInputRef}
                  type="text"
                  className="group-message-input"
                  placeholder="Type a message... (use @ to mention)"
                  value={newMsg}
                  onChange={(e) => {
                    setNewMsg(e.target.value);
                    handleMentionInput(e.target.value);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                />

                <button onClick={sendMessage} className="group-send-button">
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="no-group-selected">
            {!sidebarVisible && (
              <button 
                className="btn toggle-sidebar-btn mobile-toggle"
                onClick={toggleSidebar}
              >
                <FaBars />
              </button>
            )}
            <FaUsers size={64} />
            <h3>Select a group to start chatting</h3>
            <p>Choose a group from the sidebar or create a new one</p>
          </div>
        )}
      </main>

      {showCreateGroup && (
        <CreateGroup 
          onClose={() => setShowCreateGroup(false)}
          currentUser={currentUser}
        />
      )}

      {showGroupSettings && currentGroup && (
        <GroupSettings
          group={currentGroup}
          currentUser={currentUser}
          onClose={() => setShowGroupSettings(false)}
        />
      )}

      {showMessageInfo && selectedMessage && (
        <MessageInfo
          message={selectedMessage}
          group={currentGroup}
          onClose={() => setShowMessageInfo(false)}
        />
      )}
    </div>
  );
}