

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import  { useRef } from "react";
import {
  FaPaperPlane,
  FaTrash,
  FaImage,
  FaSignOutAlt,
  FaMoon,
  FaSun,
  FaUserPlus,
  FaBars,
  FaTimesCircle,
  FaUserCircle,
   FaCalendar
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
import UserProfile from "../components/UserProfile";

export default function Chat() {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(false);
  const [friends, setFriends] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMsg, setNewMsg] = useState("");
  const [image, setImage] = useState(null);
  const [searchEmail, setSearchEmail] = useState("");
  const [showProfile, setShowProfile] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleSidebar = () => setIsCollapsed(!isCollapsed);
  const toggleDarkMode = () => setDarkMode((prev) => !prev);

  //
  const [filterDate, setFilterDate] = useState(""); // e.g., "2025-07-15"
const [showCalendar, setShowCalendar] = useState(false);

const bottomRef = useRef(null);

  useEffect(() => {
    if (!currentUser) return;

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
  }, [currentUser]);

  useEffect(() => {
    if (!selectedUserId || !currentUser) return;

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
  }, [selectedUserId, currentUser]);

  //scroll botom

  useEffect(() => {
  // Only scroll when new messages come
  setTimeout(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, 100);
}, [messages]);


  const getConversationId = (uid1, uid2) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const sendMessage = async () => {
    if (!newMsg && !image) return;

    const convoId = getConversationId(currentUser.uid, selectedUserId);
    const newMessageRef = push(ref(database, `conversations/${convoId}/messages`));

    let base64Image = null;
    if (image) {
      base64Image = await convertToBase64(image);
    }

    const message = {
      text: newMsg,
      senderId: currentUser.uid,
      timestamp: Date.now(),
      imageUrl: base64Image,
    };

    await set(newMessageRef, message);

    setNewMsg("");
    setImage(null);
  };

  const deleteMessage = async (msgId) => {
    const convoId = getConversationId(currentUser.uid, selectedUserId);
    await remove(ref(database, `conversations/${convoId}/messages/${msgId}`));
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const searchAndAddUser = async () => {
    if (!searchEmail || !currentUser) return;

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
      await set(ref(database, `users/${currentUser.uid}/friends/${foundUser.uid}`), foundUser.name);
      await set(ref(database, `users/${foundUser.uid}/friends/${currentUser.uid}`), usersData[currentUser.uid].username);
      setSearchEmail("");
    } else {
      alert("User not found");
    }
  };

  if (!currentUser) {
    return (
      <div className="loading-screen">
        <p>Authenticating user...</p>
      </div>
    );
  }


const deleteFriend = async (friendId) => {
  if (!window.confirm("Are you sure you want to remove this friend?")) return;

  try {
    //  Remove from current user's friend list only
    await remove(ref(database, `users/${currentUser.uid}/friends/${friendId}`));

    if (selectedUserId === friendId) {
      setSelectedUserId(null);
      setMessages([]);
    }

    alert("Friend removed from your list only.");
  } catch (err) {
    console.error("Error removing friend:", err);
  }
};



// scroll to bottom
{/*
setTimeout(() => {
  if (bottomRef.current) {
    bottomRef.current.scrollIntoView({ behavior: "smooth" });
  }
}, 100); // delay to ensure messages rendered
*/}






  return (
    <div className={`app-container ${darkMode ? "dark" : ""}`}>
      <aside className={`sidebar ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <p>ZapChat</p>
          <button onClick={toggleSidebar} className="btn toggle-btn">
            <FaTimesCircle />
          </button>
        </div>
        <hr />
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
      
        
        <div style={{display:"flex",justifyContent:"space-between"}}>
        <button className="btn" onClick={() => setShowProfile(true)} style={{border:"0.5px solid black"}}>
          <FaUserCircle /> Your Profile
        </button>
       
        <div style={{ alignItems: "center", border: "0.5px solid black" }}>
         <button className="btn" onClick={() => setShowCalendar(!showCalendar)}>
       <FaCalendar /> Calendar
       </button>
  {showCalendar && (
    <input
      type="date"
      onChange={(e) => setFilterDate(e.target.value)}
      value={filterDate}
      style={{ marginTop: "5px", padding: "3px", fontSize: "14px" }}
    />
  )}
</div>

</div>
<br />
<hr />
<br />
       
    <ul className="user-list">
      {friends.map((user) => (
     <li
      key={user.id}
      className={`user-item ${selectedUserId === user.id ? "active" : ""}`}
     style={{
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "10px",
    cursor: "pointer"
   }}
   onClick={() => setSelectedUserId(user.id)} // clicking whole li
  >
  <span>{user.name}</span>

  <button
    className="btn delete-friend-btn"
    onClick={(e) => {
      e.stopPropagation(); // Stop click bubbling to li
      deleteFriend(user.id);
    }}
    title="Remove friend"
    style={{
      color: "red",
      background: "none",
      border: "none",
      cursor: "pointer"
    }}
  >
    <FaTrash />
  </button>
</li>

  ))}
</ul>



      <div className="sidebar-footer">
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
          {friends.find((u) => u.id === selectedUserId)?.name || "not Registed User"}
          <button onClick={toggleSidebar} className="btn toggle-btn" style={{float:"right"}}>
            <FaBars />
          </button>
        </div>

        <div className="chat-area">
         
          {(() => {
           const groupedByDate = {};

           messages
           .filter((msg) => {
            if (!filterDate) return true;
              const msgDate = new Date(msg.timestamp).toISOString().split("T")[0];
              return msgDate === filterDate;
            })
           .forEach((msg) => {
             const msgDate = new Date(msg.timestamp).toISOString().split("T")[0];
             if (!groupedByDate[msgDate]) groupedByDate[msgDate] = [];
             groupedByDate[msgDate].push(msg);
            });

         return Object.entries(groupedByDate).map(([date, msgs]) => (
         <div key={date}>
          <div className="chat-date-header">{date}</div>
            {msgs.map((msg) => (
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
       ));
     })()}

      <div ref={bottomRef}></div>
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

      {showProfile && <UserProfile onClose={() => setShowProfile(false)} />}
    </div>
  );
}
