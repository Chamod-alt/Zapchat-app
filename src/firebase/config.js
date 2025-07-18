// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

//
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBi7VaAlAqFFUk3Ij3RMBUUAlQewkEk4RU",
  authDomain: "zapchats.firebaseapp.com",
  databaseURL: "https://zapchats-default-rtdb.firebaseio.com",
  projectId: "zapchats",
  storageBucket: "zapchats.firebasestorage.app",
  messagingSenderId: "659911619227",
  appId: "1:659911619227:web:bd15274cfe57311c63cc3e",
  measurementId: "G-E8880QNFEQ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const database = getDatabase(app);

export { auth, database, analytics };

//

export const storage = getStorage(app);
//
export default app;

/*
{
  "rules": {
    ".read": "now < 1755109800000",  // 2025-8-14
    ".write": "now < 1755109800000",  // 2025-8-14
  }
}
  */