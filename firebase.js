import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCfc8phLaKAEFD_ugIaXDhuXtB6dijni80",
  authDomain: "beach-2x2.firebaseapp.com",
  projectId: "beach-2x2",
  storageBucket: "beach-2x2.firebasestorage.app",
  messagingSenderId: "929920343242",
  appId: "1:929920343242:web:43b65a4274c5bec2b2e833",
  measurementId: "G-2GKE928TKX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
