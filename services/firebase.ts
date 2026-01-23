import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, setDoc } from "firebase/firestore";
import { DailyLog, UserGoal } from "../types";

const firebaseConfig = {
    apiKey: "AIzaSyAGwqgxKVFlsRSzKqSsFyYV3Fqf0M8J25A",
    authDomain: "yugeshralli-porfolio.firebaseapp.com",
    projectId: "yugeshralli-porfolio",
    storageBucket: "yugeshralli-porfolio.firebasestorage.app",
    messagingSenderId: "511197145802",
    appId: "1:511197145802:web:d76baa9eddf62914f36233"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);

// Helper functions for data persistence
const USER_ID = "default_user"; // For now, we use a single user ID. In the future, this can be dynamic.

export const loadUserData = async (): Promise<{ logs?: Record<string, DailyLog>, goal?: UserGoal } | null> => {
    try {
        const docRef = doc(db, "users", USER_ID);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data() as { logs?: Record<string, DailyLog>, goal?: UserGoal };
        }
        return null;
    } catch (error) {
        console.error("Error loading data from Firebase:", error);
        return null;
    }
};

export const saveUserData = async (data: { logs: Record<string, DailyLog>, goal: UserGoal }) => {
    try {
        const docRef = doc(db, "users", USER_ID);
        await setDoc(docRef, data, { merge: true });
    } catch (error) {
        console.error("Error saving data to Firebase:", error);
    }
};
