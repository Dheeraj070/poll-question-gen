import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut,
  createUserWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import { useAuthStore } from "./store/auth-store";
import { mapFirebaseUserToAppUser } from "./api/auth";
// import { log } from "console";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080/api";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();

// -------------------- AUTH FUNCTIONS -------------------- //

export const loginWithGoogle = async () => {
  const result = await signInWithPopup(auth, provider);
  const firebaseUser = result.user;
  const idToken = await result.user.getIdToken();

  const backendUser = await mapFirebaseUserToAppUser(firebaseUser);

  const setAuthState = useAuthStore.getState();
  setAuthState.setToken(idToken);
  setAuthState.setUserRole?.(backendUser?.role);

  return { result, role: backendUser?.role };
};

export const loginWithEmail = async (
  email: string,
  password: string,
) => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  const idToken = await result.user.getIdToken();
  const firebaseUser = result.user;

  const backendUser = await mapFirebaseUserToAppUser(firebaseUser);
  
  // Store token and role in Zustand
  const setAuthState = useAuthStore.getState();
  setAuthState.setToken(idToken);
  setAuthState.setUserRole?.(backendUser?.role);

  return { result, role: backendUser?.role };
};

export const createUserWithEmail = async (
  email: string,
  password: string,
  displayName?: string,
  selectedRole: string = 'student'
) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const firebaseUser = userCredential.user;

    if (displayName && firebaseUser) {
      await updateProfile(firebaseUser, { displayName });
    }
    const token = await firebaseUser.getIdToken(true);

    const newUser = {
        firebaseUID: firebaseUser.uid,
        firstName: firebaseUser.displayName?.split(' ')[0] || '',
        lastName: firebaseUser.displayName?.split(' ').slice(1).join(' ') || '',
        email: firebaseUser.email || '',
        avatar: firebaseUser.photoURL || null,
        role: selectedRole,

        // Additional profile fields
        phoneNumber: null,
        bio: null,
        institution: null,
        designation: null,
        address: null,
        emergencyContact: null,
        dateOfBirth: null,

        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

    const createRes = await fetch(`${API_URL}/users/firebase/${firebaseUser.uid}/profile`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(newUser),
    });

    if (!createRes.ok) {
      const errorText = await createRes.text();
      throw new Error(`Failed to create backend user: ${errorText}`);
    }

    const backendUser = await createRes.json();

    const setAuthState = useAuthStore.getState();
    setAuthState.setToken(token);
    setAuthState.setUser({
      uid: firebaseUser.uid,
      email: firebaseUser.email,
      name: `${backendUser.firstName} ${backendUser.lastName}`,
      role: backendUser.role,
      avatar: backendUser.avatar,
      ...backendUser,
    });

    console.log("User created successfully in Firebase + Backend:", backendUser);

    return { result: userCredential, role: backendUser.role };
  } catch (error) {
    console.error("createUserWithEmail failed:", error);
    throw error;
  }
};

export const logout = () => {
  signOut(auth);
  useAuthStore.getState().clearUser?.(); // safe call if function exists
};

export const analytics = getAnalytics(app);