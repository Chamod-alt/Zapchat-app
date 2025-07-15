

//  Firebase Chat App: Add Friends by Email with Search

import React, { useState, useEffect } from "react";
import {
  FaPaperPlane,
  FaTrash,
  FaImage,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaUserPlus,
} from "react-icons/fa";
import { useAuth } from "../contexts/AuthContext";
import {
  ref,
  onValue,
  push,
  remove,
  set,
  get,
  child,
} from "firebase/database";
import { database } from "../firebase/config";
import "./Singlechat.css";
//
import { Link } from "react-router-dom";

export default function Chat() {
  const { currentUser, logout } = useAuth();
  const [darkMode, setDarkMode] = useState(false);
  const [friends, setFriends] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [image, setImage] = useState(null);
  const [searchEmail, setSearchEmail] = useState("");

  

  useEffect(() => {
    const userFriendsRef = ref(database, `users/${currentUser.uid}/friends`);
    onValue(userFriendsRef, (snapshot) => {
      const data = snapshot.val() || {};
      const loaded = Object.keys(data).map((uid) => ({
        id: uid,
        name: data[uid],
        hasNewMessages: false,
      }));
      setFriends(loaded);
      if (!selectedUserId && loaded.length > 0) {
        setSelectedUserId(loaded[0].id);
      }
    });
  }, [currentUser.uid]);

  useEffect(() => {
    if (!selectedUserId) return;
    const convoId = getConversationId(currentUser.uid, selectedUserId);
    const messagesRef = ref(database, `conversations/${convoId}/messages`);
    onValue(messagesRef, (snapshot) => {
      const data = snapshot.val();
      const loaded = [];
      for (let msgId in data) {
        loaded.push({ id: msgId, ...data[msgId] });
      }
      setMessages(loaded);
    });
  }, [selectedUserId, currentUser.uid]);

  const getConversationId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  const sendMessage = async () => {
    if (!newMsg && !image) return;
    const convoId = getConversationId(currentUser.uid, selectedUserId);
    const msgRef = push(ref(database, `conversations/${convoId}/messages`));
    const message = {
      text: newMsg,
      senderId: currentUser.uid,
      timestamp: Date.now(),
      imageUrl: image ? URL.createObjectURL(image) : null,
    };
    await set(msgRef, message);
    setNewMsg("");
    setImage(null);
  };

  const deleteMessage = async (msgId) => {
    const convoId = getConversationId(currentUser.uid, selectedUserId);
    await remove(ref(database, `conversations/${convoId}/messages/${msgId}`));
  };

  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  const handleLogout = async () => {
    await logout();
  };

  const searchAndAddUser = async () => {
    if (!searchEmail) return;
    const snapshot = await get(child(ref(database), "users"));
    const usersData = snapshot.val();
    let foundUser = null;
    for (let uid in usersData) {
      if (usersData[uid].email === searchEmail && uid !== currentUser.uid) {
        foundUser = { uid, name: usersData[uid].username };
        break;
      }
    }
    if (foundUser) {
      // Add to current user's friends
      await set(ref(database, `users/${currentUser.uid}/friends/${foundUser.uid}`), foundUser.name);
      // Add current user to other user's friends too
      await set(ref(database, `users/${foundUser.uid}/friends/${currentUser.uid}`), usersData[currentUser.uid].username);
      setSearchEmail("");
    } else {
      alert("User not found");
    }
  };

  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      <aside className="sidebar">
        <div className="sidebar-header">CloudChat</div>

        <div className="add-friend">
          <input
            type="text"
            placeholder="Add friend by email"
            value={searchEmail}
            onChange={(e) => setSearchEmail(e.target.value)}
          />
          <button className="btn add-btn" onClick={searchAndAddUser}>
            <FaUserPlus />
          </button>
        </div>

        <ul className="user-list">
          {friends.map((user) => (
            <li
              key={user.id}
              className={`user-item ${selectedUserId === user.id ? "active" : ""}`}
              onClick={() => setSelectedUserId(user.id)}
            >
              {user.name}
              {user.hasNewMessages && <span className="notification-badge" />}
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
           
           <Link to="/profile">User profile</Link>

          <button className="btn logout-btn" onClick={handleLogout}>
            <FaSignOutAlt /> Logout
          </button>
          <button className="btn darkmode-btn" onClick={toggleDarkMode}>
            {darkMode ? <FaSun /> : <FaMoon />}
          </button>
        </div>
      </aside>

      <main className="chat-main">
        <div className="chat-header">
          Chat with {friends.find((u) => u.id === selectedUserId)?.name || "User"}
        </div>

        <div className="chat-area">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`message-bubble ${
                msg.senderId === currentUser.uid ? "message-me" : "message-other"
              }`}
            >
              {msg.imageUrl && (
                <img src={msg.imageUrl} alt="upload" className="message-image" />
              )}
              <div className="message-text">{msg.text}</div>
              <div className="message-timestamp">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
              {msg.senderId === currentUser.uid && (
                <button
                  onClick={() => deleteMessage(msg.id)}
                  className="delete-button"
                  title="Delete message"
                >
                  <FaTrash size={12} />
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="chat-input-area">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="file-input"
            id="imgUpload"
          />
          <label htmlFor="imgUpload" className="image-upload-label" title="Upload Image">
            <FaImage size={20} />
          </label>
          <input
            type="text"
            className="message-input"
            placeholder="Type a message"
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button onClick={sendMessage} className="send-button" title="Send message">
            <FaPaperPlane />
          </button>
        </div>
      </main>
    </div>
  );
}
