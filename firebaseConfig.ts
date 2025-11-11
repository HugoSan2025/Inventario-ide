import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAahoWKk0CtXyEFsnANhMvP_TlAnuHBOgM",
  authDomain: "bd-de-inmunologia-especial.firebaseapp.com",
  projectId: "bd-de-inmunologia-especial",
  storageBucket: "bd-de-inmunologia-especial.appspot.com",
  messagingSenderId: "537643010999",
  appId: "1:537643010999:web:c5766c894f2af41a5ab632"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
