import React, { useEffect, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { ref, onValue, update } from "firebase/database";
import { database } from "../firebase/config";
import "./UserProfile.css";

export default function UserProfile() {
  const { currentUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({ username: "", email: "", pin: "" });

  useEffect(() => {
    if (!currentUser) return;

    const userRef = ref(database, `users/${currentUser.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const data = snapshot.val();
      setUserData(data);
      setFormData({
        username: data.username || "",
        email: data.email || "",
        pin: data.pin || "",
      });
    });

    return () => unsubscribe();
  }, [currentUser]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      await update(ref(database, `users/${currentUser.uid}`), formData);
      setEditMode(false);
      alert("Profile updated successfully!");
    } catch (error) {
      alert("Failed to update profile");
      console.error(error);
    }
  };

  if (!userData) return <div className="user-profile">Loading...</div>;

  return (
    <div className="user-profile">
      <h2>User Profile</h2>

      <div className="profile-info">
        <label>Username</label>
        <input
          type="text"
          name="username"
          value={formData.username}
          disabled={!editMode}
          onChange={handleChange}
        />

        <label>Email</label>
        <input
          type="email"
          name="email"
          value={formData.email}
          disabled
        />

        <label>PIN</label>
        <input
          type="text"
          name="pin"
          value={formData.pin}
          disabled={!editMode}
          onChange={handleChange}
        />
      </div>

      <div className="profile-actions">
        {editMode ? (
          <button className="btn" onClick={handleSave}>Save</button>
        ) : (
          <button className="btn" onClick={() => setEditMode(true)}>Edit Profile</button>
        )}
      </div>
    </div>
  );
}
