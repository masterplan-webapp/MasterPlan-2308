

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { TRANSLATIONS } from './constants';
import { LanguageCode, Translations, LanguageContextType, Theme, ThemeContextType, AuthContextType, User } from './types';

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

    const signInWithGoogle = useCallback(() => {
        setLoading(true);
        setTimeout(() => { // Simulate API call
            const mockUser: User = { 
                uid: '12345', 
                email: 'user@example.com', 
                displayName: 'Test User', 
                photoURL: 'https://placehold.co/100x100/7C3AED/FFFFFF?text=MP' 
            };
            setUser(mockUser);
            localStorage.setItem('mockUser', JSON.stringify(mockUser));
            setLoading(false);
        }, 1000);
    }, []);

    const signOut = useCallback(() => {
        setUser(null);
        localStorage.removeItem('mockUser');
    }, []);
    
    const updateUser = useCallback((newDetails: Partial<User>) => {
        setUser(prevUser => {
            if (!prevUser) return null;
            const updatedUser = {...prevUser, ...newDetails};
            localStorage.setItem('mockUser', JSON.stringify(updatedUser));
            return updatedUser;
        });
    }, []);
    
    useEffect(() => {
       const storedUser = localStorage.getItem('mockUser');
       if (storedUser) {
           try {
               setUser(JSON.parse(storedUser));
           } catch (error) {
               console.error("Failed to parse user from localStorage, clearing data.", error);
               localStorage.removeItem('mockUser');
               setUser(null);
           }
       }
       setLoading(false);
    },[]);

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