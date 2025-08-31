

import { GoogleGenAI } from '@google/genai';

// DATA MODELS
export interface Campaign {
    id: string;
    tipoCampanha?: string;
    etapaFunil?: string;
    canal?: string;
    formato?: string;
    objetivo?: string;
    kpi?: string;
    publicoAlvo?: string;
    budget?: number | string;
    unidadeCompra?: string;
    valorUnidade?: number | string;
    conversoes?: number | string;
    ctr?: number | string;
    cpc?: number | string;
    cpm?: number | string;
    taxaConversao?: number | string;
    impressoes?: number;
    alcance?: number;
    cliques?: number;
    cpa?: number;
    orcamentoDiario?: number;
    visitas?: number | string;
    connectRate?: number | string;
}

export interface CreativeTextData {
    id: number;
    name: string;
    context: string;
    headlines: string[];
    longHeadlines?: string[];
    descriptions: string[];
}

export interface KeywordSuggestion {
    keyword: string;
    volume: number;
    /** Estimated monthly clicks based on volume and competitiveness. */
    clickPotential: number;
    minCpc: number;
    maxCpc: number;
}

export type AspectRatio = '1:1' | '16:9' | '9:16' | '3:4' | '4:3';

export interface GeneratedImage {
    base64: string;
    aspectRatio: AspectRatio;
}

export interface AdGroup {
    id: string;
    name: string;
    keywords: KeywordSuggestion[];
}

export interface PlanData {
    id:string;
    campaignName: string;
    objective: string;
    targetAudience: string;
    location: string;
    totalInvestment: number;
    logoUrl: string;
    customFormats: string[];
    utmLinks: UTMLink[];
    months: Record<string, Campaign[]>;
    creatives: Record<string, CreativeTextData[]>;
    adGroups: AdGroup[];
    aiPrompt?: string;
    aiImagePrompt?: string;
}

export interface UTMLink {
    id: number;
    createdAt: Date;
    fullUrl: string;
    url: string;
    source: string;
    medium: string;
    campaign: string;
    term?: string;
    content?: string;
}

export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
}

export interface SummaryData {
    budget: number;
    impressoes: number;
    alcance: number;
    cliques: number;
    conversoes: number;
    channelBudgets: Record<string, number>;
    ctr: number;
    cpc: number;
    cpm: number;
    cpa: number;
    taxaConversao: number;
    orcamentoDiario?: number;
}

export type MonthlySummary = Record<string, SummaryData>;

// CONTEXT & PROVIDER TYPES
export type LanguageCode = 'pt-BR' | 'en-US';

export interface Translations {
    [key: string]: { [key: string]: string };
}

export interface LanguageContextType {
    language: LanguageCode;
    setLang: (lang: LanguageCode) => void;
    t: (key: string, substitutions?: Record<string, string>) => string;
}

export type Theme = 'light' | 'dark';

export interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

export interface AuthContextType {
    user: User | null;
    signInWithGoogle: () => void;
    signOut: () => void;
    loading: boolean;
    updateUser: (newDetails: Partial<User>) => void;
}

// COMPONENT PROPS
export interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
}

export interface CharacterCountInputProps {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
    maxLength: number;
    placeholder: string;
    rows?: number;
    onBlur?: () => void;
}

export interface AIResponseModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    content: string;
    isLoading: boolean;
}

export interface CampaignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (month: string, campaign: Campaign) => void;
    campaignData: Campaign | null;
    month: string;
    planObjective: string;
    customFormats: string[];
    onAddFormat: (format: string) => void;
}

export interface PlanDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (details: Partial<Omit<PlanData, 'id' | 'months' | 'creatives' | 'customFormats' | 'utmLinks' | 'adGroups'>>) => void;
    planData: PlanData;
    onRename: (plan: PlanData) => void;
    onDuplicate: (plan: PlanData) => void;
}

export interface AddMonthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAddMonth: (month: string) => void;
    existingMonths: string[];
}

export interface RenamePlanModalProps {
    isOpen: boolean;
    onClose: () => void;
    plan: PlanData;
    onSave: (planId: string, newName: string) => void;
}

export interface AIPlanCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (prompt: string) => void;
    isLoading: boolean;
    initialPrompt?: string;
    title?: string;
    buttonText?: string;
    loadingText?: string;
}

export interface AISuggestionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    isLoading: boolean;
    suggestions: Record<string, string[]> | null;
    onApplySuggestion: (type: string, text: string) => void;
    onApplyAllSuggestions?: (type: string, texts: string[]) => void;
    title?: string;
}

// LAYOUT PROPS
export interface SidebarProps {
    isSidebarOpen: boolean;
    activePlan: PlanData;
    activeView: string;
    handleNavigate: (view: string) => void;
    handleBackToDashboard: () => void;
    setAddMonthModalOpen: (isOpen: boolean) => void;
    setIsProfileModalOpen: (isOpen: boolean) => void;
    user: User;
    signOut: () => void;
}

export interface HeaderProps {
    activeView: string;
    setSidebarOpen: (isOpen: boolean) => void;
    setPlanModalOpen: (isOpen: boolean) => void;
}

export interface UserProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface DashboardHeaderProps {
    onProfileClick: () => void;
}

// PAGE PROPS
export interface DashboardPageProps {
    planData: PlanData;
    onNavigate: (view: string) => void;
    onAddMonthClick: () => void;
    onRegeneratePlan: (prompt: string) => Promise<void>;
    isRegenerating: boolean;
    isReadOnly?: boolean;
}

export interface MonthlyPlanPageProps {
    month: string;
    campaigns: Campaign[];
    onSave: (month: string, campaign: Campaign) => void;
    onDelete: (month: string, id: string) => void;
    planObjective: string;
    customFormats: string[];
    onAddFormat: (format: string) => void;
    totalInvestment: number;
    isReadOnly?: boolean;
}

export interface CopyBuilderPageProps {
    planData: PlanData;
    setPlanData: React.Dispatch<React.SetStateAction<PlanData | null>>;
}

export interface CreativeGroupProps {
    group: CreativeTextData;
    channel: string;
    onUpdate: (group: CreativeTextData) => void;
    onDelete: (id: number) => void;
    planData: PlanData;
}

export interface UTMBuilderPageProps {
    planData: PlanData;
    setPlanData: React.Dispatch<React.SetStateAction<PlanData | null>>;
}

export interface KeywordBuilderPageProps {
    planData: PlanData;
    setPlanData: React.Dispatch<React.SetStateAction<PlanData | null>>;
}

export interface CreativeBuilderPageProps {
    planData: PlanData;
}

export interface OnboardingPageProps {
    onPlanCreated: (type: 'ai' | 'blank' | 'template') => void;
}

export interface PlanSelectorPageProps {
    plans: PlanData[];
    onSelectPlan: (plan: PlanData) => void;
    onPlanCreated: (newPlanOrType: PlanData | 'ai' | 'blank' | 'template') => void;
    user: User;
    onProfileClick: () => void;
    onDeletePlan: (planId: string) => void;
    onRenamePlan: (planId: string, newName: string) => void;
    onRenameRequest: (plan: PlanData) => void;
}

export interface PlanCreationChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onPlanCreated: (type: 'ai' | 'blank' | 'template') => void;
}

// CHART PROPS
export interface ChartCardProps {
    title: string;
    data: any[];
    dataKey: string;
    nameKey: string;
    className?: string;
    customLegend?: React.ReactElement;
}

export interface ChartsSectionProps {
    campaigns: Campaign[];
    title: string;
}
