import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { ChevronDown, PlusCircle, Trash2, Edit, Save, X, Menu, FileDown, Settings, Sparkles, Loader as LoaderIcon, Copy, Check, Upload, Link2, LayoutDashboard, List, PencilRuler, FileText, Sheet, LogOut, Wand2, FilePlus2, ArrowLeft, MoreVertical, User as UserIcon, KeyRound, ImageIcon, Video } from 'lucide-react';

import { MONTHS_LIST, DEFAULT_METRICS_BY_OBJECTIVE } from './constants';
import { dbService, createNewEmptyPlan, createNewPlanFromTemplate, generateAIPlan, calculateKPIs, sortMonthKeys, exportPlanAsPDF, TemplateType } from './services';
import { httpsCallable } from 'firebase/functions';
import { getAuth } from 'firebase/auth';
import { PlanConfig, PLANS, SubscriptionTier, getPlanCapability } from './planConfig';
import {
    PlanData, Campaign, User, UserProfileModalProps
} from './types';
import {
    useLanguage, useTheme, useAuth, useGlobalAlert
} from './contexts';
import {
    LoginPage, PlanSelectorPage as PlanSelectorPageComponent, OnboardingPage, DashboardPage, MonthlyPlanPage, UTMBuilderPage, KeywordBuilderPage, CreativeBuilderPage, VideoBuilderPage,
    PlanDetailsModal, RenamePlanModal,
    Card,
    AddMonthModal,
    CopyBuilderPage,
    AIPlanCreationModal,
    ShareLinkModal, ShareablePlanViewer, PricingModal,
    ResetPasswordPage,
    LOGO_DARK,
    ICON_LOGO,
    CustomAlertModal,
    TemplateSelectionModal
} from './components';


// --- Layout Components ---

// Inlined props to avoid changing types.ts
interface CustomSidebarProps {
    isCollapsed: boolean;
    isMobileOpen: boolean;
    activePlan: PlanData;
    activeView: string;
    handleNavigate: (view: string) => void;
    handleBackToDashboard: () => void;
    setAddMonthModalOpen: (isOpen: boolean) => void;
    setIsProfileModalOpen: (isOpen: boolean) => void;
    onUpgradeClick: () => void;
    user: User;
    signOut: () => void;
}

const Sidebar: React.FC<CustomSidebarProps> = ({ isCollapsed, isMobileOpen, activePlan, activeView, handleNavigate, handleBackToDashboard, setAddMonthModalOpen, setIsProfileModalOpen, onUpgradeClick, user, signOut }) => {
    const { t } = useLanguage();
    const [isDetailingOpen, setIsDetailingOpen] = useState(true);
    const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

    const plannedMonths = useMemo(() =>
        Object.keys(activePlan.months || {}).sort(sortMonthKeys)
        , [activePlan.months]);

    const formatMonthDisplay = (monthKey: string) => {
        const [year, monthName] = monthKey.split('-');
        return `${t(monthName)} ${year}`;
    };


    return (
        <aside className={`bg-gray-900 text-white flex flex-col shadow-lg transition-transform duration-300 ease-in-out lg:transition-all lg:duration-300 lg:ease-in-out fixed inset-y-0 left-0 z-40 w-64 transform ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}`}>
            <div className={`flex items-center h-16 shrink-0 border-b border-gray-700/50 ${isCollapsed ? 'justify-center' : 'px-4'}`}>
                <img
                    src={isCollapsed ? ICON_LOGO : LOGO_DARK}
                    alt="MasterPlan Logo"
                    className={`transition-all duration-300 ${isCollapsed ? 'h-10 w-10 rounded-md' : 'h-8'}`}
                />
            </div>
            <div className='flex-grow px-2 overflow-y-auto overflow-x-hidden'>
                <div className={`flex items-center h-16 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                    <button onClick={handleBackToDashboard} className={`flex items-center gap-2 text-sm text-gray-400 hover:text-white w-full h-full ${isCollapsed ? 'justify-center' : 'px-2'}`} title={isCollapsed ? t('Voltar ao Dashboard') : undefined}>
                        <ArrowLeft size={16} />
                        <span className={isCollapsed ? 'hidden' : 'inline'}>{t('Voltar ao Dashboard')}</span>
                    </button>
                </div>
                <div className={`text-center mb-4 ${isCollapsed ? '' : 'px-2'}`}>
                    {activePlan.logoUrl && <img src={activePlan.logoUrl} alt="Logo do Cliente" className={`rounded-md mb-4 object-cover border border-gray-700 mx-auto transition-all duration-300 ${isCollapsed ? 'w-10 h-10' : 'w-24 h-24'}`} onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src = 'https://placehold.co/100x100/7F1D1D/FFFFFF?text=Error'; }} />}
                    <p className={`text-lg font-semibold text-gray-200 break-words ${isCollapsed ? 'hidden' : 'block'}`}>{activePlan.campaignName || t("Nome da Campanha")}</p>
                </div>
                <nav>
                    <ul>
                        <li className={`px-0 pt-4 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'px-2'}`}>{isCollapsed ? '...' : t('media_plan')}</li>
                        <li>
                            <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Overview'); }} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Overview' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('overview') : undefined}>
                                <LayoutDashboard size={18} />
                                <span className={isCollapsed ? 'hidden' : 'inline'}>{t('overview')}</span>
                            </a>
                        </li>
                        <li>
                            <button onClick={() => setIsDetailingOpen(!isDetailingOpen)} className={`w-full flex items-center ${isCollapsed ? 'justify-center' : 'justify-between px-4'} py-2.5 text-sm rounded-md transition-colors text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('detailing') : undefined}>
                                <div className="flex items-center gap-3">
                                    <List size={18} />
                                    <span className={isCollapsed ? 'hidden' : 'inline'}>{t('detailing')}</span>
                                </div>
                                <ChevronDown size={20} className={`transform transition-transform duration-200 ${isDetailingOpen ? 'rotate-180' : ''} ${isCollapsed ? 'hidden' : 'inline'}`} />
                            </button>
                        </li>
                        {isDetailingOpen && (
                            <ul className={`mt-1 space-y-1 ${isCollapsed ? '' : 'pl-5'}`}>
                                {plannedMonths.map(month => (
                                    <li key={month}>
                                        <a href="#" onClick={(e) => { e.preventDefault(); handleNavigate(month); }} className={`block py-2 rounded-md text-sm flex items-center gap-3 transition-colors ${isCollapsed ? 'justify-center' : 'pl-7 pr-4'} ${activeView === month ? 'bg-blue-600 text-white font-semibold' : 'text-gray-400 hover:bg-gray-700 hover:text-gray-200'}`} title={isCollapsed ? formatMonthDisplay(month) : undefined}>
                                            <div className="w-1.5 h-1.5 bg-current rounded-full"></div>
                                            <span className={isCollapsed ? 'hidden' : 'inline'}>{formatMonthDisplay(month)}</span>
                                        </a>
                                    </li>
                                ))}
                                <li>
                                    <button onClick={() => setAddMonthModalOpen(true)} className={`w-full flex items-center gap-3 py-2 text-sm text-gray-400 hover:bg-gray-700 hover:text-gray-200 rounded-md mt-1 ${isCollapsed ? 'justify-center' : 'pl-7 pr-4'}`} title={isCollapsed ? t('Adicionar Mês') : undefined}>
                                        <PlusCircle size={isCollapsed ? 20 : 18} />
                                        <span className={isCollapsed ? 'hidden' : 'inline'}>{t('Adicionar Mês')}</span>
                                    </button>
                                </li>
                            </ul>
                        )}
                        <li className={`px-0 pt-8 pb-2 text-xs font-bold text-gray-500 uppercase tracking-wider ${isCollapsed ? 'text-center' : 'px-2'}`}>{isCollapsed ? '...' : t('tools')}</li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Keyword_Builder'); }} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Keyword_Builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('keyword_builder') : undefined}><KeyRound size={18} /> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('keyword_builder')}</span></a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Copy_builder'); }} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Copy_builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('copy_builder') : undefined}><PencilRuler size={18} /> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('copy_builder')}</span></a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Creative_Builder'); }} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Creative_Builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('creative_builder') : undefined}><ImageIcon size={18} /> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('creative_builder')}</span></a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('Video_Builder'); }} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'Video_Builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('video_builder') : undefined}><Video size={18} /> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('video_builder')}</span></a></li>
                        <li><a href="#" onClick={(e) => { e.preventDefault(); handleNavigate('UTM_Builder'); }} className={`flex items-center gap-3 py-2.5 rounded-md text-sm transition-colors ${isCollapsed ? 'justify-center' : 'px-4'} ${activeView === 'UTM_Builder' ? 'bg-blue-600 text-white font-semibold' : 'text-gray-300 hover:bg-gray-700/70 hover:text-white'}`} title={isCollapsed ? t('utm_builder') : undefined}><Link2 size={18} /> <span className={isCollapsed ? 'hidden' : 'inline'}>{t('utm_builder')}</span></a></li>
                    </ul>
                </nav>
            </div>

            {/* Upgrade CTA for Free Users */}
            {user && user.subscription === 'free' && !isCollapsed && (
                <div className="px-4 pb-4">
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg p-3 text-center shadow-lg transform transition-transform hover:scale-105">
                        <p className="text-xs font-semibold text-blue-100 mb-2">{t('Desbloqueie Todo o Potencial')}</p>
                        <button
                            onClick={onUpgradeClick}
                            className="w-full bg-white text-blue-600 text-xs font-bold py-1.5 rounded shadow hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
                        >
                            <Sparkles size={12} />
                            {t('Fazer Upgrade Agora')}
                        </button>
                    </div>
                </div>
            )}

            <div className="p-2 border-t border-gray-700/50 relative">
                <button onClick={() => setIsUserMenuOpen(prev => !prev)} className={`flex items-center gap-3 w-full hover:bg-gray-700/70 rounded-md transition-colors ${isCollapsed ? 'p-1 justify-center' : 'p-2'}`}>
                    <img src={user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}&background=0D8ABC&color=fff&size=32`} alt="User avatar" className="w-8 h-8 rounded-full flex-shrink-0" />
                    <div className={`text-left overflow-hidden flex-1 ${isCollapsed ? 'hidden' : 'block'}`}>
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-white truncate">{user.displayName || 'Usuário'}</p>
                            {user.subscription !== 'free' && (
                                <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-1.5 rounded border border-yellow-500/30 font-bold uppercase tracking-wider">
                                    {user.subscription}
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 truncate">{user.email || 'email@example.com'}</p>
                    </div>
                    <MoreVertical size={18} className={`text-gray-400 ${isCollapsed ? 'hidden' : 'inline'}`} />
                </button>
                {isUserMenuOpen && (
                    <div
                        className={`absolute bottom-[calc(100%+0.5rem)] bg-gray-800 rounded-md shadow-lg py-1 ring-1 ring-black ring-opacity-5 z-50 ${isCollapsed ? 'left-full ml-2 w-48' : 'left-4 right-4'}`}
                        onMouseLeave={() => setIsUserMenuOpen(false)}
                    >
                        <button onClick={() => { setIsProfileModalOpen(true); setIsUserMenuOpen(false); }} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/70 hover:text-white transition-colors">{t('my_profile')}</button>
                        <button onClick={signOut} className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-900/50 hover:text-red-300 transition-colors">{t('sign_out')}</button>
                    </div>
                )}
            </div>
        </aside>
    );
};

// Inlined props to avoid changing types.ts
interface CustomHeaderProps {
    activeView: string;
    toggleSidebar: () => void;
    setPlanModalOpen: (isOpen: boolean) => void;
    activePlan: PlanData | null;
    isExporting: boolean;
    onExportPDF: () => void;
    onGetShareLink: () => void;
}

const Header: React.FC<CustomHeaderProps> = ({ activeView, toggleSidebar, setPlanModalOpen, activePlan, isExporting, onExportPDF, onGetShareLink }) => {
    const { language, setLang, t } = useLanguage();
    const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
    const exportMenuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (exportMenuRef.current && !exportMenuRef.current.contains(event.target as Node)) {
                setIsExportMenuOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);


    const toggleLanguage = () => {
        setLang(language === 'pt-BR' ? 'en-US' : 'pt-BR');
    };

    const getHeaderTitle = () => {
        if (['Overview', 'Copy_builder', 'UTM_Builder', 'Keyword_Builder', 'Creative_Builder'].includes(activeView)) {
            return t(activeView.toLowerCase());
        }
        // It's a month key like "2025-Janeiro"
        const parts = activeView.split('-');
        if (parts.length === 2 && MONTHS_LIST.includes(parts[1])) {
            return `${t(parts[1])} ${parts[0]}`;
        }
        return t(activeView); // fallback
    };


    return (
        <header className="bg-gray-800 shadow-sm sticky top-0 z-20">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8"><div className="flex justify-between items-center h-16">
                <div className="flex items-center">
                    <button onClick={toggleSidebar} className="mr-3 text-gray-400 hover:text-gray-200">
                        <Menu size={24} />
                    </button>
                    <h1 className="text-xl font-semibold text-gray-200">{getHeaderTitle()}</h1>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <button
                        onClick={toggleLanguage}
                        className="p-2 text-2xl rounded-full text-gray-400 hover:bg-gray-700/70 transition-colors"
                        title={t('language')}
                    >
                        {language === 'pt-BR' ? '🇧🇷' : '🇺🇸'}
                    </button>
                    {activePlan && (
                        <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gray-700/50 rounded-md">
                            {activePlan.logoUrl ? (
                                <img src={activePlan.logoUrl} alt="" className="h-5 w-5 rounded object-cover" />
                            ) : null}
                            <span className="text-sm text-gray-300 font-medium max-w-[150px] truncate">{activePlan.campaignName}</span>
                        </div>
                    )}
                    <button
                        onClick={() => setPlanModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 text-sm font-medium transition-colors"
                        title={t('Configurações do Plano')}
                    >
                        <Settings size={16} />
                        <span className="hidden sm:inline">{t('Editar Plano')}</span>
                    </button>
                    <div className="relative" ref={exportMenuRef}>
                        <button onClick={() => setIsExportMenuOpen(prev => !prev)} disabled={isExporting} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-gray-200 rounded-md hover:bg-gray-600 text-sm font-medium transition-colors disabled:opacity-70">
                            {isExporting ? <LoaderIcon size={16} className="animate-spin" /> : <FileDown size={16} />}
                            <span className="hidden sm:inline">{isExporting ? t('generating_pdf') : t('export')}</span>
                        </button>
                        {isExportMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-gray-800 ring-1 ring-black ring-opacity-5 z-10">
                                <div className="py-1" role="menu" aria-orientation="vertical">
                                    <button
                                        onClick={() => { onExportPDF(); setIsExportMenuOpen(false); }}
                                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                        role="menuitem"
                                    >
                                        <FileText size={16} />
                                        {t('export_to_pdf')}
                                    </button>
                                    <button
                                        onClick={() => { onGetShareLink(); setIsExportMenuOpen(false); }}
                                        className="w-full text-left flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-gray-700"
                                        role="menuitem"
                                    >
                                        <Link2 size={16} />
                                        {t('share_link')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div></div>
        </header>
    );
};

const UserProfileModalInternal: React.FC<UserProfileModalProps> = ({ isOpen, onClose, onUpgradeClick }) => {
    const { user, updateUser, signOut } = useAuth();
    const { t } = useLanguage();
    const [name, setName] = useState(user?.displayName || '');
    const [photoURL, setPhotoURL] = useState(user?.photoURL || '');
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'account'>('profile');
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [deleteConfirmText, setDeleteConfirmText] = useState('');
    const [isDeleting, setIsDeleting] = useState(false);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [passwordResetSent, setPasswordResetSent] = useState(false);
    const [isResetting, setIsResetting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (user) {
            setName(user.displayName || '');
            setPhotoURL(user.photoURL || '');
        }
    }, [user, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            setActiveTab('profile');
            setShowDeleteConfirm(false);
            setDeleteConfirmText('');
            setShowPasswordReset(false);
            setPasswordResetSent(false);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSave = () => {
        updateUser({ displayName: name, photoURL: photoURL });
        onClose();
    };

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file && user) {
            try {
                // Compress image before upload
                const img = new Image();
                const reader = new FileReader();

                reader.onloadend = () => {
                    img.onload = async () => {
                        const canvas = document.createElement('canvas');
                        const maxSize = 256; // Resize to 256x256 for better quality but small size
                        let width = img.width;
                        let height = img.height;

                        // Calculate new dimensions
                        if (width > height) {
                            if (width > maxSize) {
                                height = Math.round((height * maxSize) / width);
                                width = maxSize;
                            }
                        } else {
                            if (height > maxSize) {
                                width = Math.round((width * maxSize) / height);
                                height = maxSize;
                            }
                        }

                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx?.drawImage(img, 0, 0, width, height);

                        // Convert to blob for upload
                        canvas.toBlob(async (blob) => {
                            if (blob) {
                                try {
                                    // Import storage functions dynamically
                                    const { storage, ref, uploadBytes, getDownloadURL } = await import('./contexts');

                                    if (storage) {
                                        // Upload to Firebase Storage: users/{uid}/profile.jpg
                                        const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
                                        await uploadBytes(storageRef, blob);
                                        const downloadURL = await getDownloadURL(storageRef);

                                        // Update state with new URL
                                        setPhotoURL(downloadURL);
                                        // Auto-save to profile immediately
                                        updateUser({ photoURL: downloadURL });
                                    } else {
                                        console.error("Storage not initialized");
                                        // Fallback to base64 if storage fails (try smaller)
                                        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.5);
                                        setPhotoURL(compressedDataUrl);
                                    }
                                } catch (uploadError) {
                                    console.error("Upload failed:", uploadError);
                                    alert("Erro ao fazer upload da imagem. Tente novamente.");
                                }
                            }
                        }, 'image/jpeg', 0.8);
                    };
                    img.src = reader.result as string;
                };
                reader.readAsDataURL(file);
            } catch (error) {
                console.error("Error processing image:", error);
            }
        }
    };

    const handlePasswordReset = async () => {
        if (!user?.email) return;
        setIsResetting(true);
        try {
            const { functions } = await import('./contexts');
            const { httpsCallable } = await import('firebase/functions');
            if (functions) {
                const sendPasswordResetEmail = httpsCallable(functions, 'sendPasswordResetEmail');
                await sendPasswordResetEmail({ email: user.email });
                setPasswordResetSent(true);
            }
        } catch (err) {
            console.error('Password reset error:', err);
            alert('Erro ao enviar email. Tente novamente.');
        } finally {
            setIsResetting(false);
        }
    };

    const handleDeleteAccount = async () => {
        if (deleteConfirmText !== 'EXCLUIR') return;
        setIsDeleting(true);
        try {
            const { getAuth, deleteUser } = await import('firebase/auth');
            const auth = getAuth();
            if (auth.currentUser) {
                await deleteUser(auth.currentUser);
                onClose();
            }
        } catch (err: any) {
            console.error('Delete account error:', err);
            if (err.code === 'auth/requires-recent-login') {
                alert('Por segurança, faça logout e login novamente antes de excluir sua conta.');
            } else {
                alert('Erro ao excluir conta. Tente novamente.');
            }
        } finally {
            setIsDeleting(false);
        }
    };

    const getSubscriptionBadge = () => {
        const sub = user?.subscription || 'free';
        const badges: Record<string, { label: string; color: string }> = {
            'free': { label: 'Gratuito', color: 'bg-gray-600' },
            'pro': { label: 'PRO', color: 'bg-blue-600' },
            'ai': { label: 'AI', color: 'bg-purple-600' }
        };
        return badges[sub] || badges['free'];
    };

    const badge = getSubscriptionBadge();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-lg">
                {/* Header */}
                <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                    <h2 className="text-xl font-semibold text-gray-200">{t('Minha Conta')}</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={24} /></button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-700">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'profile' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <UserIcon size={16} className="inline mr-2" />Perfil
                    </button>
                    <button
                        onClick={() => setActiveTab('security')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'security' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <KeyRound size={16} className="inline mr-2" />Segurança
                    </button>
                    <button
                        onClick={() => setActiveTab('account')}
                        className={`flex-1 py-3 text-sm font-medium transition-colors ${activeTab === 'account' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <Settings size={16} className="inline mr-2" />Conta
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <div className="space-y-6">
                            <div className="flex flex-col items-center">
                                <img
                                    src={photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=random&color=fff&size=128`}
                                    alt="Avatar"
                                    className="w-24 h-24 rounded-full object-cover mb-4 border-4 border-gray-700"
                                />
                                <button
                                    type="button"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="text-sm text-blue-400 hover:underline"
                                >
                                    {t('Alterar foto')}
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept="image/*"
                                    onChange={handlePhotoUpload}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">{t('Nome')}</label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    className="w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">{t('Email')}</label>
                                <input
                                    type="email"
                                    value={user?.email || ''}
                                    disabled
                                    className="w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-600 text-gray-400 cursor-not-allowed"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-1">{t('URL da Foto')}</label>
                                <input
                                    type="text"
                                    value={photoURL}
                                    onChange={e => setPhotoURL(e.target.value)}
                                    placeholder={t('Ou cole a URL da imagem aqui')}
                                    className="w-full border-gray-600 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-200 mb-2">Alterar Senha</h3>
                                <p className="text-xs text-gray-400 mb-4">
                                    Enviaremos um link para seu email para redefinir sua senha.
                                </p>
                                {passwordResetSent ? (
                                    <div className="flex items-center gap-2 text-green-400 text-sm">
                                        <Check size={18} />
                                        Email enviado! Verifique sua caixa de entrada.
                                    </div>
                                ) : (
                                    <button
                                        onClick={handlePasswordReset}
                                        disabled={isResetting}
                                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isResetting ? <LoaderIcon className="animate-spin" size={16} /> : <KeyRound size={16} />}
                                        Enviar Link de Alteração
                                    </button>
                                )}
                            </div>

                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-200 mb-2">Sessão Atual</h3>
                                <p className="text-xs text-gray-400 mb-4">
                                    Encerre sua sessão atual em todos os dispositivos.
                                </p>
                                <button
                                    onClick={() => { signOut(); onClose(); }}
                                    className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-md transition-colors flex items-center gap-2"
                                >
                                    <LogOut size={16} />
                                    Sair da Conta
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Account Tab */}
                    {activeTab === 'account' && (
                        <div className="space-y-6">
                            {/* Subscription Info */}
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-200 mb-3">Plano Atual</h3>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-3 py-1 ${badge.color} text-white text-sm font-medium rounded-full`}>
                                            {badge.label}
                                        </span>
                                        <span className="text-gray-400 text-sm">
                                            {user?.subscription === 'free' ? 'Limite de 1 plano' : 'Planos ilimitados'}
                                        </span>
                                    </div>
                                    {onUpgradeClick && (
                                        <button
                                            onClick={onUpgradeClick}
                                            className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded transition-colors font-medium flex items-center gap-1"
                                        >
                                            <Sparkles size={12} />
                                            {user?.subscription === 'free' ? 'Fazer Upgrade' : 'Alterar Plano'}
                                        </button>
                                    )}

                                </div>
                            </div>

                            {/* Account Info */}
                            <div className="p-4 bg-gray-700/50 rounded-lg">
                                <h3 className="text-sm font-medium text-gray-200 mb-3">Informações da Conta</h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">ID da Conta</span>
                                        <span className="text-gray-300 font-mono text-xs">{user?.uid?.slice(0, 12)}...</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-400">Email</span>
                                        <span className="text-gray-300">{user?.email}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone */}
                            <div className="p-4 bg-red-900/20 border border-red-800/50 rounded-lg">
                                <h3 className="text-sm font-medium text-red-400 mb-2">Zona de Perigo</h3>
                                <p className="text-xs text-gray-400 mb-4">
                                    Excluir sua conta é uma ação permanente e não pode ser desfeita.
                                </p>
                                {showDeleteConfirm ? (
                                    <div className="space-y-3">
                                        <p className="text-xs text-gray-300">
                                            Digite <span className="font-bold text-red-400">EXCLUIR</span> para confirmar:
                                        </p>
                                        <input
                                            type="text"
                                            value={deleteConfirmText}
                                            onChange={e => setDeleteConfirmText(e.target.value)}
                                            className="w-full border-red-700 rounded-md shadow-sm py-2 px-3 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-red-500"
                                            placeholder="Digite EXCLUIR"
                                        />
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText(''); }}
                                                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-md"
                                            >
                                                Cancelar
                                            </button>
                                            <button
                                                onClick={handleDeleteAccount}
                                                disabled={deleteConfirmText !== 'EXCLUIR' || isDeleting}
                                                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-md disabled:opacity-50 flex items-center justify-center gap-2"
                                            >
                                                {isDeleting ? <LoaderIcon className="animate-spin" size={16} /> : <Trash2 size={16} />}
                                                Excluir
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => setShowDeleteConfirm(true)}
                                        className="px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded-md transition-colors border border-red-600/50 flex items-center gap-2"
                                    >
                                        <Trash2 size={16} />
                                        Excluir Minha Conta
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer - only show on profile tab */}
                {activeTab === 'profile' && (
                    <div className="p-6 bg-gray-700/50 border-t border-gray-700 flex justify-end gap-3">
                        <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-gray-200 rounded-md hover:bg-gray-500 transition-colors">{t('cancel')}</button>
                        <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors"><Save size={18} /> {t('save')}</button>
                    </div>
                )}
            </div>
        </div>
    );
};


// --- Main Application Logic ---
export default function App() {
    const { user, loading, signOut, updateUser, functions } = useAuth();
    const { t, language } = useLanguage();
    const { alertState, showAlert, hideAlert } = useGlobalAlert();

    const [allPlans, setAllPlans] = useState<PlanData[]>([]);
    const [activePlan, setActivePlan] = useState<PlanData | null>(null);
    const [plansLoading, setPlansLoading] = useState(true);
    const [activeView, setActiveView] = useState('Overview');

    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => localStorage.getItem('sidebarCollapsed') === 'true');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [isPlanDetailsModalOpen, setPlanDetailsModalOpen] = useState(false);
    const [isRenameModalOpen, setRenameModalOpen] = useState(false);
    const [planToRename, setPlanToRename] = useState<PlanData | null>(null);
    const [isAddMonthModalOpen, setAddMonthModalOpen] = useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
    const [isAIPlanCreationModalOpen, setAIPlanCreationModalOpen] = useState(false);
    const [isTemplateModalOpen, setTemplateModalOpen] = useState(false);
    const [isRegeneratingPlan, setIsRegeneratingPlan] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [shareLink, setShareLink] = useState('');
    const [isShareLinkModalOpen, setIsShareLinkModalOpen] = useState(false);
    const [isPricingModalOpen, setIsPricingModalOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Initialize Stripe (Move outside component or memoize in real app, but fine here)
    const stripePromise = useMemo(() => import("@stripe/stripe-js").then(module => module.loadStripe("pk_live_51S4MFQGr4FxMIDKzOCgsOO0kAHLQ3a8nBvhnqqkVaLimUINHgdEzfdWmlON6YAu5U4iHdXFDrP0ZXCFZaz2GQm2k00o4aVZyZL")), []);

    const handleUpgrade = async (plan: 'pro' | 'ai') => {
        if (!user) return;

        try {
            setIsLoading(true);

            // Get the user's ID token for authentication
            const auth = getAuth();
            const currentUser = auth.currentUser;
            if (!currentUser) {
                throw new Error("User not authenticated");
            }

            const idToken = await currentUser.getIdToken();

            // Call the HTTP Cloud Function
            const response = await fetch(
                'https://us-central1-masterplan-52e06.cloudfunctions.net/createStripeCheckoutSession',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ plan })
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to create checkout session');
            }

            const data = await response.json();

            // Redirect directly to the Stripe Checkout URL
            if (data?.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No checkout URL returned");
            }
        } catch (error) {
            console.error("Erro ao iniciar checkout:", error);
            alert("Erro ao iniciar pagamento. Tente novamente.");
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            setPlansLoading(true);
            dbService.getPlans(user.uid).then(plans => {
                setAllPlans(plans);
                setPlansLoading(false);
            });
        } else {
            setAllPlans([]);
            setActivePlan(null);
            setPlansLoading(false);
        }
    }, [user]);

    useEffect(() => {
        localStorage.setItem('sidebarCollapsed', String(isSidebarCollapsed));
    }, [isSidebarCollapsed]);

    const handlePlanCreated = async (type: 'ai' | 'blank' | 'template') => {
        if (!user) return;

        // --- PLAN LIMIT CHECK ---
        const userSubscription = user.subscription || 'free';
        // Free users can only create 1 plan
        if (userSubscription === 'free' && allPlans.length >= 1) {
            showAlert(t('Limite Atingido'), t('Limite do Plano Gratuito atingido! Faça Upgrade para criar planos ilimitados.'), 'warning');
            return;
        }

        if (type === 'ai') {
            const aiPlanLimit = getPlanCapability(userSubscription, 'aiPlanCreation') as number;
            if (aiPlanLimit === 0) {
                showAlert(t('Acesso Negado'), t('Seu plano atual não permite criação de planos com IA. Faça Upgrade para desbloquear esta funcionalidade.'), 'warning');
                return;
            }
            setAIPlanCreationModalOpen(true);
            return;
        }
        // Limit Check: Templates
        if (type === 'template') {
            const canUseTemplates = getPlanCapability(userSubscription, 'canUseTemplates');
            if (!canUseTemplates) {
                showAlert(t('Acesso Negado'), t('Seu plano atual não permite o uso de modelos. Faça Upgrade para desbloquear esta funcionalidade.'), 'warning');
                return;
            }
            setTemplateModalOpen(true);
            return;
        }

        const newPlan = await createNewEmptyPlan(user.uid);
        // Save plan to Firestore immediately
        await dbService.savePlan(user.uid, newPlan);
        setAllPlans(prev => [...prev, newPlan]);
        setActivePlan(newPlan);
    };

    const handleTemplateSelect = async (type: TemplateType) => {
        if (!user) return;
        setTemplateModalOpen(false);
        const newPlan = await createNewPlanFromTemplate(user.uid, type);
        await dbService.savePlan(user.uid, newPlan);
        setAllPlans(prev => [...prev, newPlan]);
        setActivePlan(newPlan);
        setActiveView('Overview');
        showAlert(t('Plano Criado'), t('Seu plano baseado em modelo foi criado com sucesso.'), 'success');
    };

    const handlePlanCreatedOrSelected = (newPlanOrType: PlanData | 'ai' | 'blank' | 'template') => {
        if (typeof newPlanOrType === 'string') {
            handlePlanCreated(newPlanOrType);
        } else {
            setAllPlans(prev => {
                if (prev.find(p => p.id === newPlanOrType.id)) return prev;
                return [...prev, newPlanOrType];
            });
        }
    }

    const handleAIPlanGenerated = async (prompt: string) => {
        if (!user) return;

        // Check Limit
        if (user) {
            const userSubscription = user.subscription || 'free';
            const hasLimit = await dbService.checkLimit(user.uid, userSubscription as SubscriptionTier, 'createdPlans');
            if (!hasLimit) {
                showAlert(t('Limite Atingido'), t('Limite de criação com IA atingido para seu plano. Faça upgrade para continuar.'), 'warning');
                return;
            }
        }

        setIsRegeneratingPlan(true);
        try {
            const partialPlan = await generateAIPlan(prompt, language);
            const newPlan: PlanData = {
                id: `plan_${new Date().getTime()}`,
                campaignName: partialPlan.campaignName || 'Novo Plano (IA)',
                objective: partialPlan.objective || '',
                targetAudience: partialPlan.targetAudience || '',
                location: partialPlan.location || '',
                totalInvestment: partialPlan.totalInvestment || 5000,
                logoUrl: partialPlan.logoUrl || '',
                customFormats: [],
                utmLinks: [],
                months: partialPlan.months ? Object.entries(partialPlan.months).reduce((acc, [month, campaigns]) => {
                    acc[month] = campaigns.map((c, i) => calculateKPIs({ ...c, id: `c_ai_${i}` }));
                    return acc;
                }, {} as Record<string, Campaign[]>) : {},
                creatives: {},
                adGroups: [],
                aiPrompt: prompt,
                aiImagePrompt: partialPlan.aiImagePrompt,
            };
            await dbService.savePlan(user.uid, newPlan);

            // Increment Usage
            await dbService.incrementUsage(user.uid, 'createdPlans');

            setAllPlans(prev => [...prev, newPlan]);
            setActivePlan(newPlan);
            setActiveView('Overview');
        } catch (error) {
            console.error("Error generating AI plan:", error);
            alert(t('Erro ao criar o plano com IA. Por favor, tente novamente.'));
        } finally {
            setIsRegeneratingPlan(false);
            setAIPlanCreationModalOpen(false);
        }
    };

    const handleSelectPlan = (plan: PlanData) => {
        setActivePlan(plan);
        setActiveView('Overview');
    };

    const handleBackToDashboard = () => {
        setActivePlan(null);
    };

    const handleDeletePlan = async (planId: string) => {
        if (!user) return;
        await dbService.deletePlan(user.uid, planId);
        setAllPlans(activePlans => activePlans.filter(p => p.id !== planId));
    };

    const updateActivePlan = async (updatedPlan: PlanData) => {
        if (!user) return;
        setActivePlan(updatedPlan);
        setAllPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p));
        await dbService.savePlan(user.uid, updatedPlan);
    };

    const handleSavePlanDetails = (details: Partial<PlanData>) => {
        if (!activePlan) return;
        const updatedPlan = { ...activePlan, ...details };
        updateActivePlan(updatedPlan);
    };

    const handleRenameRequest = (plan: PlanData) => {
        setPlanToRename(plan);
        setRenameModalOpen(true);
    };

    const handleRenamePlan = async (planId: string, newName: string) => {
        if (!user) return;
        const planToUpdate = allPlans.find(p => p.id === planId);
        if (planToUpdate) {
            const updatedPlan = { ...planToUpdate, campaignName: newName };
            const updatedPlans = allPlans.map(p => p.id === planId ? updatedPlan : p);
            setAllPlans(updatedPlans);
            await dbService.savePlan(user.uid, updatedPlan);
            if (activePlan?.id === planId) {
                setActivePlan(updatedPlan);
            }
        }
        setRenameModalOpen(false);
        setPlanToRename(null);
    }

    const handleDuplicatePlan = async (planToDuplicate: PlanData) => {
        if (!user) return;
        const newPlan: PlanData = {
            ...JSON.parse(JSON.stringify(planToDuplicate)),
            id: `plan_${new Date().getTime()}`,
            campaignName: `${planToDuplicate.campaignName} ${t('Copy')}`
        };
        await dbService.savePlan(user.uid, newPlan);
        setAllPlans(prev => [...prev, newPlan]);
    }

    const handleSaveCampaign = (month: string, campaign: Campaign) => {
        if (!activePlan) return;
        const updatedMonths = { ...(activePlan.months || {}) };

        const cleanCampaigns = (updatedMonths[month] || []).filter(Boolean);
        const campaignIndex = cleanCampaigns.findIndex(c => c.id === campaign.id);

        if (campaignIndex > -1) {
            updatedMonths[month] = cleanCampaigns.map(c => (c.id === campaign.id ? campaign : c));
        } else {
            updatedMonths[month] = [...cleanCampaigns, campaign];
        }
        updateActivePlan({ ...activePlan, months: updatedMonths });
    };

    const handleDeleteCampaign = (month: string, campaignId: string) => {
        if (!activePlan) return;
        const updatedMonths = { ...(activePlan.months || {}) };
        if (updatedMonths[month]) {
            updatedMonths[month] = updatedMonths[month].filter(c => c && c.id !== campaignId);
        }
        updateActivePlan({ ...activePlan, months: updatedMonths });
    }

    const handleAddMonth = (month: string) => {
        if (!activePlan || !month) return;
        if (!activePlan.months) activePlan.months = {};
        if (activePlan.months[month]) return;

        const updatedMonths = { ...activePlan.months, [month]: [] };
        updateActivePlan({ ...activePlan, months: updatedMonths });
        setAddMonthModalOpen(false);
    };

    const handleAddFormat = (format: string) => {
        if (!activePlan) return;
        const updatedFormats = [...new Set([...(activePlan.customFormats || []), format])];
        updateActivePlan({ ...activePlan, customFormats: updatedFormats });
    };

    const handleRegeneratePlan = async (prompt: string) => {
        if (!user || !activePlan) return;
        setIsRegeneratingPlan(true);
        try {
            const partialPlan = await generateAIPlan(prompt, language);
            // Preserve user's existing logo (don't replace with AI-generated placeholder)
            const existingLogoUrl = activePlan.logoUrl;
            const updatedPlan = {
                ...activePlan,
                campaignName: partialPlan.campaignName || activePlan.campaignName,
                objective: partialPlan.objective || activePlan.objective,
                targetAudience: partialPlan.targetAudience || activePlan.targetAudience,
                location: partialPlan.location || activePlan.location,
                totalInvestment: partialPlan.totalInvestment || activePlan.totalInvestment,
                logoUrl: existingLogoUrl || partialPlan.logoUrl,  // Prioritize user's logo
                months: partialPlan.months ? Object.entries(partialPlan.months).reduce((acc, [month, campaigns]) => {
                    acc[month] = campaigns.map((c, i) => calculateKPIs({ ...c, id: `c_ai_${month}_${i}` }));
                    return acc;
                }, {} as Record<string, Campaign[]>) : activePlan.months,
                aiPrompt: prompt,
                aiImagePrompt: partialPlan.aiImagePrompt || activePlan.aiImagePrompt,
            };
            updateActivePlan(updatedPlan);
        } catch (error) {
            console.error("Error regenerating AI plan:", error);
            alert(t('Erro ao criar o plano com IA. Por favor, tente novamente.'));
        } finally {
            setIsRegeneratingPlan(false);
        }
    };

    const handleExportPDF = async () => {
        if (!activePlan || !user) return;
        setIsExporting(true);
        const canRemoveWatermark = getPlanCapability(user.subscription, 'canRemoveWatermark') as boolean;
        await exportPlanAsPDF(activePlan, t, canRemoveWatermark);
        setIsExporting(false);
    };

    const handleGetShareLink = async () => {
        if (!activePlan) {
            setShareLink(t('link_generation_error'));
            setIsShareLinkModalOpen(true);
            return;
        }

        try {
            // Use Firestore-based sharing instead of URL encoding
            const shareId = await dbService.sharePlan(activePlan);

            if (shareId) {
                const url = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
                setShareLink(url);
            } else {
                setShareLink(t('link_generation_error'));
            }
        } catch (e) {
            console.error("Error creating share link:", e);
            setShareLink(t('link_generation_error'));
        }

        setIsShareLinkModalOpen(true);
    };


    const toggleSidebar = () => {
        if (window.innerWidth < 1024) {
            setIsMobileSidebarOpen(!isMobileSidebarOpen);
        } else {
            setIsSidebarCollapsed(!isSidebarCollapsed);
        }
    };

    const handleNavigate = (view: string) => {
        const userSubscription = user?.subscription || 'free';

        // Block Creative Builder for Free users
        if (view === 'Creative_Builder') {
            const canUseCreativeBuilder = getPlanCapability(userSubscription, 'canUseCreativeBuilder');
            if (!canUseCreativeBuilder) {
                showAlert(t('Acesso Negado'), t('O Creative Builder não está disponível no plano gratuito. Faça upgrade para desbloquear.'), 'warning');
                return;
            }
        }

        // Block Video Builder for Free users
        if (view === 'Video_Builder') {
            const canUseVideoBuilder = getPlanCapability(userSubscription, 'canUseVideoBuilder');
            if (!canUseVideoBuilder) {
                showAlert(t('Acesso Negado'), t('O Video Builder não está disponível no plano gratuito. Faça upgrade para desbloquear.'), 'warning');
                return;
            }
        }

        setActiveView(view);
        if (window.innerWidth < 1024) {
            setIsMobileSidebarOpen(false);
        }
    }


    if (loading) {
        return <div className="h-screen w-full flex items-center justify-center bg-gray-900"><LoaderIcon className="animate-spin text-blue-600" size={48} /></div>;
    }

    const urlParams = new URLSearchParams(window.location.search);
    const encodedPlanData = urlParams.get('plan_data');
    const shareId = urlParams.get('share');
    const authMode = urlParams.get('mode');

    // Handle shared plan via Firestore ID
    if (shareId) {
        return <ShareablePlanViewer shareId={shareId} />;
    }

    // Legacy: Handle shared plan via URL-encoded data
    if (encodedPlanData) {
        return <ShareablePlanViewer encodedPlanData={encodedPlanData} />;
    }

    // Handle Firebase Auth action URLs (password reset, email verification, etc.)
    if (authMode === 'resetPassword') {
        return <ResetPasswordPage />;
    }

    if (!user) {
        return <LoginPage />;
    }

    // Show loading while fetching plans
    if (plansLoading) {
        return (
            <div className="h-screen w-full flex items-center justify-center bg-gray-900">
                <LoaderIcon className="animate-spin text-blue-500" size={48} />
            </div>
        );
    }

    if (allPlans.length === 0 && !activePlan) {
        return (
            <>
                <OnboardingPage onPlanCreated={handlePlanCreated} />
                <AIPlanCreationModal
                    isOpen={isAIPlanCreationModalOpen}
                    onClose={() => setAIPlanCreationModalOpen(false)}
                    onGenerate={handleAIPlanGenerated}
                    isLoading={isRegeneratingPlan}
                />
                <TemplateSelectionModal
                    isOpen={isTemplateModalOpen}
                    onClose={() => setTemplateModalOpen(false)}
                    onSelect={handleTemplateSelect}
                />
                <CustomAlertModal
                    isOpen={alertState.isOpen}
                    title={alertState.title}
                    message={alertState.message}
                    type={alertState.type}
                    onClose={hideAlert}
                />
            </>
        );
    }

    if (!activePlan) {
        return (
            <>
                <PlanSelectorPageComponent
                    plans={allPlans}
                    onSelectPlan={handleSelectPlan}
                    onPlanCreated={handlePlanCreatedOrSelected}
                    user={user}
                    onProfileClick={() => setIsProfileModalOpen(true)}
                    onDeletePlan={handleDeletePlan}
                    onRenamePlan={handleRenamePlan}
                    onRenameRequest={handleRenameRequest}
                />
                <TemplateSelectionModal
                    isOpen={isTemplateModalOpen}
                    onClose={() => setTemplateModalOpen(false)}
                    onSelect={handleTemplateSelect}
                />
                <AIPlanCreationModal
                    isOpen={isAIPlanCreationModalOpen}
                    onClose={() => setAIPlanCreationModalOpen(false)}
                    onGenerate={handleAIPlanGenerated}
                    isLoading={isRegeneratingPlan}
                />
                {isRenameModalOpen && planToRename && (
                    <RenamePlanModal
                        isOpen={isRenameModalOpen}
                        onClose={() => { setRenameModalOpen(false); setPlanToRename(null); }}
                        plan={planToRename}
                        onSave={handleRenamePlan}
                    />
                )}
                <UserProfileModalInternal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} onUpgradeClick={() => { setIsProfileModalOpen(false); setIsPricingModalOpen(true); }} />
                <CustomAlertModal
                    isOpen={alertState.isOpen}
                    title={alertState.title}
                    message={alertState.message}
                    type={alertState.type}
                    onClose={hideAlert}
                />
            </>
        );
    }


    return (
        <div className={`flex h-screen bg-gray-900 font-sans`}>
            <Sidebar
                isCollapsed={isSidebarCollapsed}
                isMobileOpen={isMobileSidebarOpen}
                activePlan={activePlan}
                activeView={activeView}
                handleNavigate={handleNavigate}
                handleBackToDashboard={handleBackToDashboard}
                setAddMonthModalOpen={setAddMonthModalOpen}
                setIsProfileModalOpen={setIsProfileModalOpen}
                onUpgradeClick={() => setIsPricingModalOpen(true)}
                user={user}
                signOut={signOut}
            />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header
                    activeView={activeView}
                    toggleSidebar={toggleSidebar}
                    setPlanModalOpen={setPlanDetailsModalOpen}
                    activePlan={activePlan}
                    isExporting={isExporting}
                    onExportPDF={handleExportPDF}
                    onGetShareLink={handleGetShareLink}
                />
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 lg:p-8">
                    {activeView === 'Overview' && <DashboardPage planData={activePlan} onNavigate={handleNavigate} onAddMonthClick={() => setAddMonthModalOpen(true)} onRegeneratePlan={handleRegeneratePlan} isRegenerating={isRegeneratingPlan} />}
                    {Object.keys(activePlan.months || {}).includes(activeView) && (
                        <MonthlyPlanPage
                            month={activeView}
                            campaigns={activePlan.months[activeView]}
                            onSave={handleSaveCampaign}
                            onDelete={handleDeleteCampaign}
                            planObjective={activePlan.objective}
                            customFormats={activePlan.customFormats || []}
                            onAddFormat={handleAddFormat}
                            totalInvestment={activePlan.totalInvestment}
                        />
                    )}
                    {activeView === 'Copy_builder' && <CopyBuilderPage planData={activePlan} setPlanData={updateActivePlan as any} />}
                    {activeView === 'UTM_Builder' && <UTMBuilderPage planData={activePlan} setPlanData={updateActivePlan as any} />}
                    {activeView === 'Keyword_Builder' && <KeywordBuilderPage planData={activePlan} setPlanData={updateActivePlan as any} />}
                    {activeView === 'Creative_Builder' && <CreativeBuilderPage planData={activePlan} />}
                    {activeView === 'Video_Builder' && <VideoBuilderPage planData={activePlan} />}
                </main>
            </div>
            {isPlanDetailsModalOpen && (
                <PlanDetailsModal
                    isOpen={isPlanDetailsModalOpen}
                    onClose={() => setPlanDetailsModalOpen(false)}
                    onSave={handleSavePlanDetails}
                    planData={activePlan}
                    onRename={handleRenameRequest}
                    onDuplicate={handleDuplicatePlan}
                />
            )}
            {isRenameModalOpen && planToRename && (
                <RenamePlanModal
                    isOpen={isRenameModalOpen}
                    onClose={() => { setRenameModalOpen(false); setPlanToRename(null); }}
                    plan={planToRename}
                    onSave={handleRenamePlan}
                />
            )}
            <AddMonthModal
                isOpen={isAddMonthModalOpen}
                onClose={() => setAddMonthModalOpen(false)}
                onAddMonth={handleAddMonth}
                existingMonths={Object.keys(activePlan.months || {})}
            />
            <UserProfileModalInternal isOpen={isProfileModalOpen} onClose={() => setIsProfileModalOpen(false)} onUpgradeClick={() => { setIsProfileModalOpen(false); setIsPricingModalOpen(true); }} />
            <PricingModal
                isOpen={isPricingModalOpen}
                onClose={() => setIsPricingModalOpen(false)}
                onUpgrade={handleUpgrade}
                currentPlan={user?.subscription || 'free'}
            />
            <ShareLinkModal isOpen={isShareLinkModalOpen} onClose={() => setIsShareLinkModalOpen(false)} link={shareLink} />

            <TemplateSelectionModal
                isOpen={isTemplateModalOpen}
                onClose={() => setTemplateModalOpen(false)}
                onSelect={handleTemplateSelect}
            />

            {/* Global Alert Modal */}
            <CustomAlertModal
                isOpen={alertState.isOpen}
                title={alertState.title}
                message={alertState.message}
                type={alertState.type}
                onClose={hideAlert}
            />

        </div>
    );
}