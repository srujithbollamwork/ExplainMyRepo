import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyAld62_eJXGf0HLywbcXmz7cLxlZn2GEf4",
    authDomain: "explainmyrepo.firebaseapp.com",
    projectId: "explainmyrepo",
    storageBucket: "explainmyrepo.firebasestorage.app",
    messagingSenderId: "952021000550",
    appId: "1:952021000550:web:f48a9a204784a7e7aae8a7",
    measurementId: "G-BZYZDBH2QT"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
// export const analytics = getAnalytics(app); // Optional if you need analytics later
