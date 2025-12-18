import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { initializeApp, getApp, getApps, FirebaseApp } from "firebase/app";
import { 
    getAuth, 
    signInWithPopup, 
    GoogleAuthProvider, 
    onAuthStateChanged, 
    signOut as firebaseSignOut, 
    updateProfile,
    Auth
} from "firebase/auth";
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

// Singleton pattern for Firebase App and Auth
let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;

const getFirebaseAuth = (): Auth | null => {
    if (firebaseAuth) return firebaseAuth;
    try {
        const apps = getApps();
        if (apps.length === 0) {
            firebaseApp = initializeApp(firebaseConfig);
        } else {
            firebaseApp = apps[0];
        }
        
        // In the modular SDK, getAuth(app) registers the auth component if it isn't already.
        // Having consistent versions in index.html is the key fix here.
        firebaseAuth = getAuth(firebaseApp);
        return firebaseAuth;
    } catch (e) {
        console.error("Firebase Auth initialization failed:", e);
        return null;
    }
};

// --- Language Context ---
const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
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

export const ThemeProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const theme: Theme = 'dark'; // Hardcode theme to 'dark'

    // Provide a dummy function to match the type, but it does nothing.
    const toggleTheme = useCallback(() => {}, []);

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

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const signInWithGoogle = useCallback(async () => {
        const auth = getFirebaseAuth();
        if (!auth) {
            alert("Auth service not available. Check configuration.");
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

    const signOut = useCallback(async () => {
        const auth = getFirebaseAuth();
        if (!auth) return;
        try {
            await firebaseSignOut(auth);
        } catch (error) {
            console.error("Error signing out:", error);
        }
    }, []);
    
    const updateUser = useCallback((newDetails: Partial<User>) => {
        const auth = getFirebaseAuth();
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
       const auth = getFirebaseAuth();
       if (!auth) {
           console.warn("Auth initialization failed; user state will remain null.");
           setLoading(false);
           return;
       }
       
       const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
           if (firebaseUser) {
               setUser({
                   uid: firebaseUser.uid,
                   email: firebaseUser.email,
                   displayName: firebaseUser.displayName,
                   photoURL: firebaseUser.photoURL
               });
           } else {
               setUser(null);
           }
           setLoading(false);
       });
       
       return () => unsubscribe();
    }, []);

    return (
        <AuthContext.Provider value={{ user, signInWithGoogle, signOut, loading, updateUser }}>
            {children}
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