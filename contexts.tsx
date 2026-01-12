import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import {
    getAuth,
    signInWithPopup,
    GoogleAuthProvider,
    onAuthStateChanged,
    signOut as firebaseSignOut,
    updateProfile,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    Auth
} from "firebase/auth";
import { getFirestore, Firestore, doc, getDoc, setDoc } from "firebase/firestore";
import { getFunctions, Functions, httpsCallable } from "firebase/functions";
import { TRANSLATIONS } from './constants';
import { LanguageCode, LanguageContextType, Theme, ThemeContextType, AuthContextType, User } from './types';

// --- Firebase Initialization ---
const firebaseConfig = {
    apiKey: "AIzaSyDJ-A3pRyeonwxTH_pQMojJ-WFcrRptuWY",
    authDomain: "masterplan-52e06.firebaseapp.com",
    projectId: "masterplan-52e06",
    storageBucket: "masterplan-52e06.firebasestorage.app",
    messagingSenderId: "329808307895",
    appId: "1:329808307895:web:330d7828bfbe85c74c8f32"
};

// Safe initialization of Firebase
// We declare these at the top level to ensure they are available
let app: FirebaseApp;
let auth: Auth | undefined;
let db: Firestore | undefined;
let functions: Functions | undefined; // Firebase Functions

try {
    // Check if any firebase apps have been initialized
    if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
    } else {
        app = getApp();
    }

    // Initialize Auth only after App is guaranteed to exist
    if (app) {
        auth = getAuth(app);
        db = getFirestore(app);
        functions = getFunctions(app, 'us-central1'); // Specify region
    }
} catch (error) {
    console.error("Critical Firebase Initialization Error:", error);
    // Even if initialization fails, we don't crash the entire module load immediately,
    // but the AuthProvider will handle the missing 'auth' object.
}

export { auth, db, functions };

// --- Language Context ---
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [language, setLanguage] = useState<LanguageCode>('pt-BR');

    useEffect(() => {
        const savedLang = localStorage.getItem('language') as LanguageCode | null;
        if (savedLang && TRANSLATIONS[savedLang]) {
            setLanguage(savedLang);
        } else {
            setLanguage('pt-BR'); // Default language
        }
    }, []);

    const setLang = useCallback((lang: LanguageCode) => {
        setLanguage(lang);
        localStorage.setItem('language', lang);
    }, []);

    const t = useCallback((key: string, substitutions?: Record<string, string>): string => {
        let translation = TRANSLATIONS[language]?.[key] || TRANSLATIONS['en-US']?.[key] || key;
        if (substitutions) {
            Object.entries(substitutions).forEach(([subKey, subValue]) => {
                translation = translation.replace(`{${subKey}}`, subValue);
            });
        }
        return translation;
    }, [language]);


    return (
        <LanguageContext.Provider value={{ language, setLang, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = (): LanguageContextType => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};

// --- Theme Context ---
const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const theme: Theme = 'dark'; // Hardcode theme to 'dark'

    // Provide a dummy function to match the type, but it does nothing.
    const toggleTheme = useCallback(() => { }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};

// --- Auth Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const signInWithGoogle = useCallback(async () => {
        if (!auth) {
            console.error("Authentication service is not available.");
            alert("Authentication service is not available.");
            return;
        }
        setLoading(true);
        try {
            const provider = new GoogleAuthProvider();
            await signInWithPopup(auth, provider);
        } catch (error) {
            console.error("Error signing in with Google:", error);
            setLoading(false);
        }
    }, []);

    const signInWithEmail = useCallback(async (email: string, password: string) => {
        if (!auth) {
            throw new Error("Authentication service is not available.");
        }
        setLoading(true);
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error signing in with email:", error);
            setLoading(false);
            throw error;
        }
    }, []);

    const signUpWithEmail = useCallback(async (email: string, password: string) => {
        if (!auth) {
            throw new Error("Authentication service is not available.");
        }
        setLoading(true);
        try {
            await createUserWithEmailAndPassword(auth, email, password);
        } catch (error) {
            console.error("Error signing up with email:", error);
            setLoading(false);
            throw error;
        }
    }, []);

    const signOut = useCallback(async () => {
        if (!auth) return;
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }, []);

    const updateUser = useCallback((newDetails: Partial<User>) => {
        if (!auth || !auth.currentUser) return;

        updateProfile(auth.currentUser, {
            displayName: newDetails.displayName ?? undefined,
            photoURL: newDetails.photoURL ?? undefined
        }).then(() => {
            setUser(prevUser => prevUser ? { ...prevUser, ...newDetails } : null);
        }).catch(error => {
            console.error("Error updating profile", error);
        });
    }, []);

    useEffect(() => {
        if (!auth) {
            console.warn("Auth initialization failed; user state will remain null.");
            setLoading(false);
            return;
        }

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Mock subscription data or fetch from Firestore
                let userData: User = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    photoURL: firebaseUser.photoURL,
                    subscription: 'free',
                    subscriptionStatus: 'active'
                };

                // Fetch real data from Firestore
                if (db) {
                    try {
                        const userDocRef = doc(db, 'users', firebaseUser.uid);
                        const userDocSnap = await getDoc(userDocRef);
                        if (userDocSnap.exists()) {
                            const data = userDocSnap.data();
                            userData = { ...userData, ...data } as User;
                        } else {
                            await setDoc(userDocRef, userData);
                        }
                    } catch (error) {
                        console.error("Error fetching user profile:", error);
                    }
                }

                setUser(userData);
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            signInWithGoogle,
            signInWithEmail,
            signUpWithEmail,
            signOut,
            updateUser,
            functions
        }}>    {children}
        </AuthContext.Provider>
    );
};

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};