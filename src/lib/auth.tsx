import React, { createContext, useContext, useState, useEffect } from "react";
import {
  User as FirebaseUser,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "firebase/auth";
import { auth, googleAuthProvider } from "./firebase.ts";
import firebaseConfig from "../../firebase-applet-config.json";
import { User } from "../types";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  dbUser: User | null;
  token: string | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string, rememberMe?: boolean) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  sendVerification: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user with Firestore backend
  const syncWithBackend = async (firebaseUserInstance: FirebaseUser, idToken: string, customName?: string) => {
    try {
      const res = await fetch("/api/auth/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          displayName: customName || firebaseUserInstance.displayName || undefined
        })
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
      } else {
        console.error("Backend auth sync failed:", await res.text());
        setDbUser(null);
      }
    } catch (err) {
      console.error("Backend sync error:", err);
      setDbUser(null);
    }
  };

  const refreshProfile = async () => {
    if (!firebaseUser || !token) return;
    try {
      const res = await fetch("/api/projects", { // simple test fetch to verify session
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        await syncWithBackend(firebaseUser, token);
      }
    } catch (err) {
      console.error("Profile refresh error:", err);
    }
  };

  useEffect(() => {
    // Migration check: if the project ID has changed, clear all local state & localStorage/sessionStorage
    const currentProjectId = firebaseConfig.projectId;
    const lastProjectId = localStorage.getItem("firebase_project_id");
    if (lastProjectId && lastProjectId !== currentProjectId) {
      console.warn("New Firebase project detected. Clearing old session cached variables.");
      localStorage.clear();
      sessionStorage.clear();
      signOut(auth).catch(() => {});
    }
    localStorage.setItem("firebase_project_id", currentProjectId);

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        try {
          const idToken = await user.getIdToken(true);
          setToken(idToken);
          localStorage.setItem("auth_token", idToken);
          setFirebaseUser(user);
          await syncWithBackend(user, idToken);
        } catch (err) {
          console.error("Failed to fetch user ID Token:", err);
          setToken(null);
          setDbUser(null);
          setFirebaseUser(null);
        }
      } else {
        setToken(null);
        setDbUser(null);
        setFirebaseUser(null);
        localStorage.removeItem("auth_token");
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      // For Google login, default to browser local persistence so session is remembered
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err) {
      console.warn("Google login failed:", err);
      setLoading(false);
      throw err;
    }
  };

  const loginWithEmail = async (email: string, pass: string, rememberMe = true) => {
    setLoading(true);
    try {
      const persistence = rememberMe ? browserLocalPersistence : browserSessionPersistence;
      await setPersistence(auth, persistence);
      await signInWithEmailAndPassword(auth, email, pass);
    } catch (err) {
      console.warn("Email login failed:", err);
      setLoading(false);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    setLoading(true);
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(credential.user, { displayName: name });
      await credential.user.reload();
      const updatedUser = auth.currentUser;
      if (updatedUser) {
        const idToken = await updatedUser.getIdToken(true);
        setToken(idToken);
        localStorage.setItem("auth_token", idToken);
        setFirebaseUser(updatedUser);
        await syncWithBackend(updatedUser, idToken, name);
      }
    } catch (err) {
      console.warn("Email registration failed:", err);
      setLoading(false);
      throw err;
    }
  };

  const forgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      console.warn("Forgot password email dispatch failed:", err);
      throw err;
    }
  };

  const sendVerification = async () => {
    if (auth.currentUser) {
      try {
        await sendEmailVerification(auth.currentUser);
      } catch (err) {
        console.warn("Manual verification dispatch failed:", err);
        throw err;
      }
    } else {
      throw new Error("No active authenticated user session found.");
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
    } catch (err) {
      console.warn("Signout failed:", err);
    }
    setToken(null);
    localStorage.removeItem("auth_token");
    setFirebaseUser(null);
    setDbUser(null);
    setLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        dbUser,
        token,
        loading,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        logout,
        refreshProfile,
        forgotPassword,
        sendVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
