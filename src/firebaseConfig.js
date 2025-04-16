import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyBAdQftQKnx7Kq_j9UDbl4qM26zTRXXXx0",
  authDomain: "sig-web-projek.firebaseapp.com",
  projectId:"sig-web-projek",
  storageBucket: "sig-web-projek.firebasestorage.app",
  messagingSenderId: "1089200979920",
  appId: "1:1089200979920:web:cac549b8df4473b61403d5",
  measurementId: "G-GQGLK7P382",
  databaseURL: "https://sig-web-projek-default-rtdb.asia-southeast1.firebasedatabase.app/",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const database = getDatabase(app);

export { 
  firebaseConfig, 
  app, 
  auth, 
  database,
  initializeApp 
};

console.log("Firebase API Key:", process.env.REACT_APP_FIREBASE_API_KEY);


export default firebaseConfig;