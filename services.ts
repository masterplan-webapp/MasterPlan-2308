

import { GoogleGenAI, GenerateContentResponse, Type, Modality } from "@google/genai";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PlanData, Campaign, User, LanguageCode, KeywordSuggestion, CreativeTextData, AdGroup, UTMLink, GeneratedImage, AspectRatio, SummaryData, MonthlySummary } from './types';
import { getAuth as firebaseGetAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut as firebaseSignOut, updateProfile as firebaseUpdateProfile } from "firebase/auth";
import { PLANS, SubscriptionTier, getPlanCapability, PlanConfig } from './planConfig';
import { MONTHS_LIST, OPTIONS, CHANNEL_FORMATS, DEFAULT_METRICS_BY_OBJECTIVE } from "./constants";

// --- Gemini API Helper ---
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // Removed from top-level

// --- UTILITY FUNCTIONS ---
export const formatCurrency = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(numberValue);
};

export const formatPercentage = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return `${numberValue.toFixed(2)}%`;
};

export const formatNumber = (value?: number | string): string => {
    const numberValue = Number(value) || 0;
    return new Intl.NumberFormat('pt-BR').format(Math.round(numberValue));
};

export const sortMonthKeys = (a: string, b: string): number => {
    const [yearA, monthNameA] = a.split('-');
    const [yearB, monthNameB] = b.split('-');

    const monthIndexA = MONTHS_LIST.indexOf(monthNameA);
    const monthIndexB = MONTHS_LIST.indexOf(monthNameB);

    if (yearA !== yearB) {
        return parseInt(yearA) - parseInt(yearB);
    }
    return monthIndexA - monthIndexB;
};

// --- AUTH SERVICES ---
export const getAuth = () => firebaseGetAuth();
export const signInWithEmail = signInWithEmailAndPassword;
export const signUpWithEmail = createUserWithEmailAndPassword;
export const logout = firebaseSignOut;
export const updateProfile = firebaseUpdateProfile;

// --- DATABASE (Firestore) ---
import { db, functions, storage, ref, uploadBytes, getDownloadURL } from './contexts';
import { httpsCallable } from 'firebase/functions';
import { collection, doc, setDoc, getDocs, deleteDoc, getDoc, query } from 'firebase/firestore';

export const dbService = {
    getPlans: async (userId: string): Promise<PlanData[]> => {
        if (!db) return [];
        try {
            const plansRef = collection(db, 'users', userId, 'plans');
            const q = query(plansRef);
            const querySnapshot = await getDocs(q);
            const plans: PlanData[] = [];
            querySnapshot.forEach((doc) => {
                plans.push(doc.data() as PlanData);
            });
            return plans;
        } catch (error) {
            console.error("Failed to get plans from Firestore", error);
            return [];
        }
    },
    savePlan: async (userId: string, plan: PlanData) => {
        if (!db) {
            console.error("savePlan: db is not initialized");
            return;
        }
        try {
            // Handle base64 logo - upload to Storage if it's a data URL
            let planToSave = { ...plan };
            if (planToSave.logoUrl && planToSave.logoUrl.startsWith('data:')) {
                console.log("savePlan: Detected base64 logo, uploading to Storage...");
                try {
                    // Convert base64 to blob
                    const response = await fetch(planToSave.logoUrl);
                    const blob = await response.blob();

                    // Upload to Storage
                    const logoRef = ref(storage, `users/${userId}/plans/${plan.id}/logo`);
                    await uploadBytes(logoRef, blob);

                    // Get download URL
                    const downloadUrl = await getDownloadURL(logoRef);
                    planToSave.logoUrl = downloadUrl;
                    console.log("savePlan: Logo uploaded to Storage successfully");
                } catch (logoError) {
                    console.error("savePlan: Failed to upload logo, clearing logoUrl", logoError);
                    // Clear the logo to prevent Firestore save from failing
                    planToSave.logoUrl = '';
                }
            }

            console.log("savePlan: Saving plan to Firestore", {
                planId: planToSave.id,
                campaignName: planToSave.campaignName,
                monthsCount: Object.keys(planToSave.months || {}).length,
                totalCampaigns: Object.values(planToSave.months || {}).flat().length,
                logoUrlType: planToSave.logoUrl?.startsWith('http') ? 'URL' : (planToSave.logoUrl ? 'other' : 'empty')
            });
            const planRef = doc(db, 'users', userId, 'plans', planToSave.id);
            await setDoc(planRef, planToSave);
            console.log("savePlan: Successfully saved plan to Firestore");
        } catch (error) {
            console.error("Failed to save plan to Firestore", error);
        }
    },
    deletePlan: async (userId: string, planId: string) => {
        if (!db) return;
        try {
            await deleteDoc(doc(db, 'users', userId, 'plans', planId));
        } catch (error) {
            console.error("Failed to delete plan from Firestore", error);
        }
    },
    getPlanById: async (userId: string, planId: string): Promise<PlanData | null> => {
        if (!db) return null;
        try {
            const docRef = doc(db, 'users', userId, 'plans', planId);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                return docSnap.data() as PlanData;
            } else {
                return null;
            }
        } catch (error) {
            console.error("Failed to get plan by ID from Firestore", error);
            return null;
        }
    },
    // Usage Tracking
    getUsage: async (userId: string, month: string) => {
        if (!db) return null;
        try {
            const usageRef = doc(db, 'users', userId, 'usage', month);
            const docSnap = await getDoc(usageRef);
            if (docSnap.exists()) {
                return docSnap.data();
            }
            return { aiAnalysis: 0, aiVideos: 0, aiImages: 0, createdPlans: 0 };
        } catch (error) {
            console.error("Failed to get usage", error);
            return null;
        }
    },
    incrementUsage: async (userId: string, metric: 'aiAnalysis' | 'aiVideos' | 'aiImages' | 'createdPlans') => {
        if (!db) return;
        const month = new Date().toISOString().slice(0, 7); // YYYY-MM
        try {
            const usageRef = doc(db, 'users', userId, 'usage', month);
            // We need to use set with merge or update. Since it might not exist, set with merge is safer for increment if we read first, but atomic increment is better.
            // However, for simplicity without importing FieldValue, we can read-modify-write or use set with merge if we knew the field exists.
            // Better to use import { increment } from firebase/firestore
            // But I need to add that import. For now, I'll do read-modify-write as I don't want to mess up imports too much if I can avoid it. 
            // Wait, I can add imports in the first chunk.
            // Let's assume I will add `increment` to imports in chunk 1? 
            // No, chunk 1 only successfully matched lines 6.
            // I'll stick to read-modify-write for this step or add increment to imports in a separate Edit if needed. 
            // Actually, I can add `increment` to the imports line 45.
            // I will simply use set({ [metric]: count + 1 }, { merge: true })
            const docSnap = await getDoc(usageRef);
            let current = 0;
            if (docSnap.exists()) {
                current = docSnap.data()[metric] || 0;
            }
            await setDoc(usageRef, { [metric]: current + 1 }, { merge: true });
        } catch (error) {
            console.error("Failed to increment usage", error);
        }
    },
    checkLimit: async (userId: string, plan: SubscriptionTier, metric: 'aiAnalysis' | 'aiVideos' | 'aiImages' | 'createdPlans', currentUsageValue?: number): Promise<boolean> => {
        // limit logic
        // If currentUsageValue is provided, use it, else fetch it.
        // For video builder check, we need to know the limit from PLANS.
        const limit = PLANS[plan || 'free'].limits[metric === 'aiAnalysis' ? 'aiAnalysisCurrentPlan' : metric === 'aiVideos' ? 'aiVideos' : metric === 'createdPlans' ? 'aiPlanCreation' : 'aiImages'];
        // Mapping metric name to PlanConfig limit key is tricky.
        // PlanConfig has: aiAnalysisCurrentPlan, aiVideos, aiImages, aiPlanCreation.
        // Metric: aiAnalysis, aiVideos, aiImages, createdPlans.
        // Let's map them.
        let limitKey: keyof PlanConfig['limits'] | undefined;
        if (metric === 'aiAnalysis') limitKey = 'aiAnalysisCurrentPlan';
        else if (metric === 'aiVideos') limitKey = 'aiVideos';
        else if (metric === 'aiImages') limitKey = 'aiImages';
        else if (metric === 'createdPlans') limitKey = 'aiPlanCreation';

        if (!limitKey) return true; // Unknown metric

        const limitVal = PLANS[plan || 'free'].limits[limitKey];
        if (typeof limitVal === 'boolean') return limitVal;

        let usage = currentUsageValue;
        if (usage === undefined) {
            const month = new Date().toISOString().slice(0, 7);
            const u = await dbService.getUsage(userId, month);
            usage = u ? u[metric] || 0 : 0;
        }

        return (usage as number) < (limitVal as number);
    },
    // Sharing plans
    sharePlan: async (plan: PlanData): Promise<string | null> => {
        if (!db) return null;
        try {
            // Generate a short share ID
            const shareId = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
            const shareRef = doc(db, 'sharedPlans', shareId);

            // Store the plan along with sharing metadata
            await setDoc(shareRef, {
                plan: plan,
                createdAt: new Date().toISOString(),
                views: 0
            });

            return shareId;
        } catch (error) {
            console.error("Failed to create share link", error);
            return null;
        }
    },
    getSharedPlan: async (shareId: string): Promise<PlanData | null> => {
        if (!db) return null;
        try {
            const shareRef = doc(db, 'sharedPlans', shareId);
            const docSnap = await getDoc(shareRef);
            if (docSnap.exists()) {
                return docSnap.data().plan as PlanData;
            }
            return null;
        } catch (error) {
            console.error("Failed to get shared plan", error);
            return null;
        }
    }
};


// --- Core Business Logic ---
export const recalculateCampaignMetrics = (campaign: Partial<Campaign>): Campaign => {
    let newCampaign: Partial<Campaign> = { ...campaign };

    let budget = Number(newCampaign.budget) || 0;
    let ctr = (Number(newCampaign.ctr) || 0) / 100;
    let taxaConversao = (Number(newCampaign.taxaConversao) || 0) / 100;
    let connectRate = (Number(newCampaign.connectRate) || 0) / 100;
    let cpc = Number(newCampaign.cpc) || 0;
    let cpm = Number(newCampaign.cpm) || 0;
    let impressoes = Number(newCampaign.impressoes) || 0;
    let cliques = Number(newCampaign.cliques) || 0;

    // Intelligent derivation of CPC/CPM if one is missing.
    // Formula: CPM = CPC × CTR × 1000 (cost for 1000 impressions = clicks × cost per click)
    if (cpc > 0 && ctr > 0 && cpm === 0) {
        cpm = cpc * ctr * 1000;
    } else if (cpm > 0 && ctr > 0 && cpc === 0) {
        cpc = cpm / (ctr * 1000);
    }

    // Main calculation logic
    if (budget > 0) {
        // Prioritize buying unit.
        if (newCampaign.unidadeCompra === 'CPM' && cpm > 0) {
            impressoes = (budget / cpm) * 1000;
            cliques = impressoes * ctr;
            if (cliques > 0) cpc = budget / cliques; else if (ctr === 0 && cpc === 0) cpc = 0;
        } else if (newCampaign.unidadeCompra === 'CPC' && cpc > 0) {
            cliques = budget / cpc;
            if (ctr > 0) {
                impressoes = cliques / ctr;
                cpm = (budget / impressoes) * 1000;
            }
        } else { // Fallback if buying unit metric is zero
            if (cpm > 0) {
                impressoes = (budget / cpm) * 1000;
                cliques = impressoes * ctr;
            } else if (cpc > 0) {
                cliques = budget / cpc;
                if (ctr > 0) impressoes = cliques / ctr;
            }
        }
    } else if (impressoes > 0) {
        cliques = impressoes * ctr;
        if (cpm > 0) budget = (impressoes / 1000) * cpm;
        else if (cpc > 0) budget = cliques * cpc;
    } else if (cliques > 0) {
        if (ctr > 0) impressoes = cliques / ctr;
        if (cpc > 0) budget = cliques * cpc;
        else if (cpm > 0 && impressoes > 0) budget = (impressoes / 1000) * cpm;
    }

    const conversoes = cliques * taxaConversao;
    const cpa = conversoes > 0 ? budget / conversoes : 0;
    const visitas = cliques * connectRate;
    const orcamentoDiario = budget / 30.4;

    return {
        ...newCampaign,
        budget,
        cpc,
        cpm,
        ctr: ctr * 100,
        taxaConversao: taxaConversao * 100,
        connectRate: connectRate * 100,
        impressoes: Math.round(impressoes),
        cliques: Math.round(cliques),
        conversoes: Math.round(conversoes),
        cpa,
        visitas: Math.round(visitas),
        orcamentoDiario,
    } as Campaign;
};

export const calculateKPIs = (campaign: Partial<Campaign>): Campaign => {
    // If the campaign from AI is missing core metrics, apply defaults based on its type.
    const objective = campaign.tipoCampanha;
    if (objective && DEFAULT_METRICS_BY_OBJECTIVE[objective]) {
        const defaults = DEFAULT_METRICS_BY_OBJECTIVE[objective];
        // The order here is important. `...campaign` comes last so its values (like budget) overwrite the defaults.
        const campaignWithDefaults = { ...defaults, ...campaign };
        return recalculateCampaignMetrics(campaignWithDefaults);
    }
    // Fallback for campaigns without a matching type or for manual creation
    return recalculateCampaignMetrics(campaign);
};

export const calculatePlanSummary = (planData: PlanData): { summary: SummaryData; monthlySummary: MonthlySummary } => {
    const allCampaigns: Campaign[] = Object.values(planData.months || {}).flat();

    const summary: SummaryData = allCampaigns.reduce((acc, campaign) => {
        const budget = Number(campaign.budget) || 0;
        acc.budget += budget;
        acc.impressoes += Number(campaign.impressoes) || 0;
        acc.alcance += Number(campaign.alcance) || 0;
        acc.cliques += Number(campaign.cliques) || 0;
        acc.conversoes += Number(campaign.conversoes) || 0;
        if (campaign.canal) {
            acc.channelBudgets[campaign.canal] = (acc.channelBudgets[campaign.canal] || 0) + budget;
        }
        return acc;
    }, { budget: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, channelBudgets: {} } as SummaryData);

    summary.ctr = summary.impressoes > 0 ? (summary.cliques / summary.impressoes) * 100 : 0;
    summary.cpc = summary.cliques > 0 ? summary.budget / summary.cliques : 0;
    summary.cpm = summary.impressoes > 0 ? (summary.budget / summary.impressoes) * 1000 : 0;
    summary.cpa = summary.conversoes > 0 ? summary.budget / summary.conversoes : 0;
    summary.taxaConversao = summary.cliques > 0 ? (summary.conversoes / summary.cliques) * 100 : 0;

    const numMonths = Object.keys(planData.months || {}).length;
    if (numMonths > 0) {
        summary.orcamentoDiario = summary.budget / (numMonths * 30.4);
    } else {
        summary.orcamentoDiario = 0;
    }

    const monthlySummary: MonthlySummary = {};
    Object.entries(planData.months || {}).forEach(([month, campaigns]) => {
        monthlySummary[month] = campaigns.reduce((acc, c) => {
            const budget = Number(c.budget) || 0;
            acc.budget += budget;
            acc.impressoes += Number(c.impressoes) || 0;
            acc.alcance += Number(c.alcance) || 0;
            acc.cliques += Number(c.cliques) || 0;
            acc.conversoes += Number(c.conversoes) || 0;
            return acc;
        }, { budget: 0, impressoes: 0, alcance: 0, cliques: 0, conversoes: 0, channelBudgets: {} } as SummaryData);
        monthlySummary[month].taxaConversao = monthlySummary[month].cliques > 0 ? (monthlySummary[month].conversoes / monthlySummary[month].cliques) * 100 : 0;
    });

    return { summary, monthlySummary };
};

// --- PLAN CREATION ---

export const createNewEmptyPlan = async (userId: string): Promise<PlanData> => {
    const newPlan: PlanData = {
        id: `plan_${new Date().getTime()}`,
        campaignName: 'Novo Plano em Branco',
        objective: '',
        targetAudience: '',
        location: '',
        totalInvestment: 10000,
        logoUrl: '',
        customFormats: [],
        utmLinks: [],
        months: {},
        creatives: {},
        adGroups: []

    };
    await dbService.savePlan(userId, newPlan);
    return newPlan;
};
export type TemplateType = 'ecommerce' | 'services' | 'institutional';

export const createNewPlanFromTemplate = async (userId: string, type: TemplateType = 'ecommerce'): Promise<PlanData> => {
    const today = new Date();
    const currentMonthName = MONTHS_LIST[today.getMonth()];
    const currentYear = today.getFullYear();
    const currentMonthKey = `${currentYear}-${currentMonthName}`;

    const awarenessDefaults = DEFAULT_METRICS_BY_OBJECTIVE['Awareness'];
    const leadsDefaults = DEFAULT_METRICS_BY_OBJECTIVE['Geração de Leads'];
    const conversionDefaults = DEFAULT_METRICS_BY_OBJECTIVE['Conversão'];
    const trafficDefaults = DEFAULT_METRICS_BY_OBJECTIVE['Tráfego'];

    let initialData;

    switch (type) {
        case 'services': // Dental Clinic
            initialData = {
                name: 'Clínica Sorriso (Modelo)',
                objective: 'Aumentar agendamentos de avaliação e implantes.',
                audience: 'Mulheres e Homens 30-60 anos, classe AB, região metropolitana.',
                logoKeyword: 'dental,clinic,doctor',
                months: {
                    [currentMonthKey]: [
                        calculateKPIs({ ...trafficDefaults, id: 'c_tpl_s1', tipoCampanha: 'Tráfego', canal: 'Meta Ads', formato: 'Carrossel', objetivo: 'Tráfego para Site', kpi: 'CPC e CTR', budget: 1500 }),
                        calculateKPIs({ ...leadsDefaults, id: 'c_tpl_s2', tipoCampanha: 'Geração de Leads', canal: 'Google Ads', formato: 'Search', objetivo: 'Agendamento', kpi: 'CPL', budget: 3500 })
                    ]
                }
            };
            break;
        case 'institutional': // NGO
            initialData = {
                name: 'ONG Verde Vida (Modelo)',
                objective: 'Conscientização sobre preservação ambiental e atrair doadores recorrentes.',
                audience: 'Pessoas com interesse em sustentabilidade, 18-45 anos.',
                logoKeyword: 'nature,forest,ngo',
                months: {
                    [currentMonthKey]: [
                        calculateKPIs({ ...awarenessDefaults, id: 'c_tpl_i1', tipoCampanha: 'Awareness', canal: 'Meta Ads', formato: 'Video', objetivo: 'Alcance de Marca', kpi: 'CPM e View Rate', budget: 2000 }),
                        calculateKPIs({ ...awarenessDefaults, id: 'c_tpl_i2', tipoCampanha: 'Alcance', canal: 'YouTube Pub', formato: 'Video', objetivo: 'Visualizações', kpi: 'CPV', budget: 3000 })
                    ]
                }
            };
            break;
        case 'ecommerce': // Fashion/Skincare (Default)
        default:
            initialData = {
                name: 'Moda & Estilo (Modelo)',
                objective: 'Vendas online da nova coleção de verão.',
                audience: 'Mulheres 20-40 anos, interesse em moda e tendências.',
                logoKeyword: 'fashion,clothing,style',
                months: {
                    [currentMonthKey]: [
                        calculateKPIs({ ...awarenessDefaults, id: 'c_tpl_e1', tipoCampanha: 'Awareness', canal: 'Meta Ads', formato: 'Reels', objetivo: 'Brand Awareness', kpi: 'Alcance', budget: 2000 }),
                        calculateKPIs({ ...conversionDefaults, id: 'c_tpl_e2', tipoCampanha: 'Conversão', canal: 'Google Ads', formato: 'Shopping', objetivo: 'Vendas', kpi: 'ROAS', budget: 8000 })
                    ]
                }
            };
            break;
    }

    const newPlan: PlanData = {
        id: `plan_${new Date().getTime()}`,
        campaignName: initialData.name,
        objective: initialData.objective,
        targetAudience: initialData.audience,
        location: 'Brasil',
        totalInvestment: 50000,
        logoUrl: `https://loremflickr.com/400/400/${initialData.logoKeyword}/all?lock=${Date.now()}`,
        customFormats: [],
        utmLinks: [],
        creatives: {},
        adGroups: [],
        months: initialData.months
    };

    return newPlan;
};


// --- DATA EXPORT ---
const escapeCSV = (str: any): string => {
    const s = String(str || '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
};

const buildPdfHtml = (plan: PlanData, summary: SummaryData, monthlySummary: MonthlySummary, t: (key: string, substitutions?: Record<string, string>) => string, isPro: boolean = false): string => {
    const watermarkCss = !isPro ? `
        .watermark {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%) rotate(-45deg);
            font-size: 80px;
            color: rgba(0, 0, 0, 0.08);
            font-weight: 800;
            pointer-events: none;
            z-index: 0;
            white-space: nowrap;
            user-select: none;
        }
    ` : '';

    const watermarkHtml = !isPro ? `<div class="watermark">CREATED WITH MasterPlan</div>` : '';

    const styles = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            body { 
                font-family: 'Roboto', sans-serif; 
                font-size: 9px; 
                color: #333;
                background-color: #fff;
            }
            .page {
                width: 267mm;
                min-height: 180mm;
                padding: 15mm;
                margin: 0 auto;
                page-break-after: always;
                background-color: white;
                box-sizing: border-box;
                position: relative;
                overflow: hidden;
            }
            .page:last-child {
                page-break-after: avoid;
            }
            .header {
                text-align: center;
                border-bottom: 2px solid #007bff;
                padding-bottom: 10px;
                margin-bottom: 20px;
                position: relative;
                z-index: 10;
            }
            .header img {
                max-width: 150px;
                max-height: 75px;
                object-fit: contain;
                margin-bottom: 10px;
            }
            .header h1 {
                font-size: 24px;
                color: #003366;
                margin: 0;
            }
            .section-title {
                font-size: 18px;
                color: #003366;
                border-bottom: 1px solid #ccc;
                padding-bottom: 5px;
                margin-top: 20px;
                margin-bottom: 10px;
                position: relative;
                z-index: 10;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 10px;
                font-size: 8px;
                position: relative;
                z-index: 10;
            }
            th, td {
                border: 1px solid #ddd;
                padding: 5px;
                text-align: left;
                word-break: break-word;
            }
            th {
                background-color: #f0f6ff;
                font-weight: bold;
                color: #003366;
            }
            tr:nth-child(even) {
                background-color: #f9f9f9;
            }
            .summary-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                position: relative;
                z-index: 10;
            }
            .summary-item, .info-item {
                background-color: #f8f9fa;
                padding: 10px;
                border-radius: 4px;
            }
            .summary-item dt, .info-item dt {
                font-weight: bold;
                color: #555;
                font-size: 10px;
            }
            .summary-item dd, .info-item dd {
                margin-left: 0;
                font-size: 14px;
                color: #003366;
            }
            .footer {
                text-align: center;
                margin-top: 20px;
                font-size: 8px;
                color: #777;
                position: relative;
                z-index: 10;
            }
            ${watermarkCss}
        </style>
    `;

    const summaryPage = `
        <div class="page">
            <div class="header">
                ${plan.logoUrl ? `<img src="${plan.logoUrl}" alt="Logo">` : ''}
                <h1>${t('media_plan')}: ${plan.campaignName}</h1>
            </div>
            
            <div class="section-title">${t('Resumo do Plano')}</div>
            <div class="summary-grid">
                <div class="info-item"><dt>${t('Objetivo Geral')}</dt><dd>${plan.objective}</dd></div>
                <div class="info-item"><dt>${t('Público-Alvo Principal')}</dt><dd>${plan.targetAudience}</dd></div>
            </div>

            <div class="section-title">${t('Métricas Estimadas')} (${t('Totais')})</div>
            <table>
                <thead>
                    <tr>
                        <th>${t('Investimento Previsto')}</th>
                        <th>${t('Impressões')}</th>
                        <th>${t('Cliques')}</th>
                        <th>${t('Conversões')}</th>
                        <th>${t('CTR (%)')}</th>
                        <th>${t('CPA (R$)')}</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>${formatCurrency(summary.budget)}</td>
                        <td>${formatNumber(summary.impressoes)}</td>
                        <td>${formatNumber(summary.cliques)}</td>
                        <td>${formatNumber(summary.conversoes)}</td>
                        <td>${formatPercentage(summary.ctr)}</td>
                        <td>${formatCurrency(summary.cpa)}</td>
                    </tr>
                </tbody>
            </table>

            <div class="section-title">${t('Investimento por Canal')}</div>
            <table>
                <thead>
                    <tr><th>${t('Canal')}</th><th>${t('Budget')}</th><th>% Share</th></tr>
                </thead>
                <tbody>
                    ${Object.entries(summary.channelBudgets).map(([channel, budget]) => `
                        <tr>
                            <td>${channel}</td>
                            <td>${formatCurrency(budget)}</td>
                            <td>${formatPercentage((budget / summary.budget) * 100)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
            <div class="footer">
                &copy; ${new Date().getFullYear()} MasterPlan AI. ${t('Todos os direitos reservados.')}
            </div>
        </div>
    `;

    const monthlyPages = Object.keys(plan.months).sort(sortMonthKeys).map(monthKey => {
        const monthName = monthKey.split('-').reverse().map(p => t(p)).join(' ');
        const campaigns = plan.months[monthKey];
        const monthSummary = monthlySummary[monthKey];

        const getUnitValue = (c: Campaign) => {
            switch (c.unidadeCompra) {
                case 'CPC': return formatCurrency(c.cpc);
                case 'CPM': return formatCurrency(c.cpm);
                default: return 'N/A';
            }
        };

        const aggregateCTR = monthSummary.impressoes > 0 ? (monthSummary.cliques / monthSummary.impressoes) * 100 : 0;
        const aggregateConvRate = monthSummary.cliques > 0 ? (monthSummary.conversoes / monthSummary.cliques) * 100 : 0;
        const aggregateCPA = monthSummary.conversoes > 0 ? (monthSummary.budget / monthSummary.conversoes) : 0;

        return `
            <div class="page">
                <div class="header">
                    <h1>${t('Plano de Mídia - {month}', { month: monthName })}</h1>
                </div>
                <div class="section-title">${t('Campanhas')}</div>
                <table>
                    <thead>
                        <tr>
                            <th>${t('Tipo Campanha')}</th>
                            <th>${t('Etapa Funil')}</th>
                            <th>${t('Canal')}</th>
                            <th>${t('Formato')}</th>
                            <th style="width:15%">${t('Objetivo')}</th>
                            <th>${t('Budget')}</th>
                            <th>${t('% Share')}</th>
                            <th>${t('Unidade de Compra')}</th>
                            <th>${t('Valor da Unidade (R$)')}</th>
                            <th>${t('Impressões')}</th>
                            <th>${t('Cliques')}</th>
                            <th>${t('CTR (%)')}</th>
                            <th>${t('Conversões')}</th>
                            <th>${t('Taxa de Conversão (%)')}</th>
                            <th>${t('CPA (R$)')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${campaigns.map(c => {
            const share = plan.totalInvestment > 0 ? (Number(c.budget || 0) / plan.totalInvestment) * 100 : 0;
            return `
                            <tr>
                                <td>${c.tipoCampanha || ''}</td>
                                <td>${c.etapaFunil || ''}</td>
                                <td>${c.canal || ''}</td>
                                <td>${c.formato || ''}</td>
                                <td>${c.objetivo || ''}</td>
                                <td>${formatCurrency(c.budget)}</td>
                                <td>${formatPercentage(share)}</td>
                                <td>${c.unidadeCompra || ''}</td>
                                <td>${getUnitValue(c)}</td>
                                <td>${formatNumber(c.impressoes)}</td>
                                <td>${formatNumber(c.cliques)}</td>
                                <td>${formatPercentage(c.ctr)}</td>
                                <td>${formatNumber(c.conversoes)}</td>
                                <td>${formatPercentage(c.taxaConversao)}</td>
                                <td>${formatCurrency(c.cpa)}</td>
                            </tr>
                        `}).join('')}
                    </tbody>
                    <tfoot>
                        <tr style="font-weight: bold; background-color: #f0f6ff;">
                            <td colspan="5">${t('Totais do Mês')}</td>
                            <td>${formatCurrency(monthSummary.budget)}</td>
                            <td>${formatPercentage(plan.totalInvestment > 0 ? (monthSummary.budget / plan.totalInvestment) * 100 : 0)}</td>
                            <td colspan="2"></td>
                            <td>${formatNumber(monthSummary.impressoes)}</td>
                            <td>${formatNumber(monthSummary.cliques)}</td>
                            <td>${formatPercentage(aggregateCTR)}</td>
                            <td>${formatNumber(monthSummary.conversoes)}</td>
                            <td>${formatPercentage(aggregateConvRate)}</td>
                            <td>${formatCurrency(aggregateCPA)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }).join('');

    return `<div id="pdf-report-content">${styles}${summaryPage}${monthlyPages}</div>`;
};


export const exportPlanAsPDF = async (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string, isPro: boolean = false) => {
    const { summary, monthlySummary } = calculatePlanSummary(plan);
    const reportHTML = buildPdfHtml(plan, summary, monthlySummary, t, isPro);

    // Create a temporary container for rendering the HTML
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px'; // Position off-screen
    container.style.top = '0';
    container.innerHTML = reportHTML;
    document.body.appendChild(container);

    try {
        const pdf = new jsPDF('l', 'mm', 'a4'); // landscape, millimeters, A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();

        // Select all elements that should be a separate page
        const pages = container.querySelectorAll('.page');

        // Loop through each page element and add it to the PDF
        for (let i = 0; i < pages.length; i++) {
            const pageElement = pages[i] as HTMLElement;

            // Use html2canvas to render the element to a canvas
            const canvas = await html2canvas(pageElement, {
                scale: 2, // Higher scale for better quality
                useCORS: true, // For external images like logos
                logging: false,
                width: pageElement.scrollWidth,
                height: pageElement.scrollHeight,
                windowWidth: pageElement.scrollWidth,
                windowHeight: pageElement.scrollHeight,
            });

            // Calculate the aspect ratio to fit the canvas image onto the PDF page
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const aspectRatio = imgWidth / imgHeight;

            let finalWidth = pdfWidth;
            let finalHeight = pdfWidth / aspectRatio;

            // If the calculated height is greater than the PDF page height, scale by height instead
            if (finalHeight > pdfHeight) {
                finalHeight = pdfHeight;
                finalWidth = pdfHeight * aspectRatio;
            }

            // Add a new page for all but the first element
            if (i > 0) {
                pdf.addPage();
            }

            // Add the canvas image to the PDF, centered if it's smaller than the page
            const xOffset = (pdfWidth - finalWidth) / 2;
            const yOffset = (pdfHeight - finalHeight) / 2;
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', xOffset, yOffset, finalWidth, finalHeight);
        }

        // Save the generated PDF
        pdf.save(`${plan.campaignName.replace(/ /g, '_') || 'media-plan'}.pdf`);
    } catch (error) {
        console.error("Error generating PDF:", error);
        alert('An error occurred while generating the PDF.');
    } finally {
        // Clean up by removing the temporary container from the DOM
        document.body.removeChild(container);
    }
};

export const exportCreativesAsCSV = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    const headers = ['Channel', 'Group Name', 'Context', 'Type', 'Text'];
    let csvContent = headers.join(',') + '\r\n';

    if (!plan.creatives) return;

    for (const channel in plan.creatives) {
        plan.creatives[channel].forEach(group => {
            group.headlines.forEach(headline => {
                const row = [
                    escapeCSV(channel),
                    escapeCSV(group.name),
                    escapeCSV(group.context),
                    escapeCSV(t('Títulos (Headlines)')),
                    escapeCSV(headline)
                ];
                csvContent += row.join(',') + '\r\n';
            });
            (group.longHeadlines || []).forEach(longHeadline => {
                const row = [
                    escapeCSV(channel),
                    escapeCSV(group.name),
                    escapeCSV(group.context),
                    escapeCSV(t('Títulos Longos (Long Headlines)')),
                    escapeCSV(longHeadline)
                ];
                csvContent += row.join(',') + '\r\n';
            });
            group.descriptions.forEach(description => {
                const row = [
                    escapeCSV(channel),
                    escapeCSV(group.name),
                    escapeCSV(group.context),
                    escapeCSV(t('Descrições (Descriptions)')),
                    escapeCSV(description)
                ];
                csvContent += row.join(',') + '\r\n';
            });
        });
    }

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-creatives.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const exportCreativesAsTXT = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    let txtContent = `Plano de Mídia: ${plan.campaignName}\n`;
    txtContent += `=========================================\n\n`;

    if (!plan.creatives || Object.keys(plan.creatives).length === 0) {
        txtContent += 'Nenhum criativo encontrado.';
    } else {
        for (const channel in plan.creatives) {
            txtContent += `Canal: ${channel}\n`;
            txtContent += `-----------------------------------------\n`;
            plan.creatives[channel].forEach(group => {
                txtContent += `\nGrupo de Criativos: ${group.name}\n`;
                txtContent += `Contexto: ${group.context || 'N/A'}\n\n`;

                txtContent += `>> ${t('Títulos (Headlines)')}:\n`;
                group.headlines.forEach(headline => {
                    txtContent += `- ${headline || ''}\n`;
                });
                txtContent += `\n`;

                if (group.longHeadlines && group.longHeadlines.length > 0) {
                    txtContent += `>> ${t('Títulos Longos (Long Headlines)')}:\n`;
                    group.longHeadlines.forEach(longHeadline => {
                        txtContent += `- ${longHeadline || ''}\n`;
                    });
                    txtContent += `\n`;
                }

                txtContent += `>> ${t('Descrições (Descriptions)')}:\n`;
                group.descriptions.forEach(description => {
                    txtContent += `- ${description || ''}\n`;
                });
                txtContent += `\n\n`;
            });
        }
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-creatives.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export const exportUTMLinksAsCSV = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    const headers = [
        t('Data'),
        t('URL do Site *'),
        t('Campaign Source *'),
        t('Campaign Medium *'),
        t('Campaign Name *'),
        t('Campaign Term'),
        t('Campaign Content'),
        t('URL Completa'),
    ];
    let csvContent = headers.join(',') + '\r\n';

    if (!plan.utmLinks || plan.utmLinks.length === 0) return;

    plan.utmLinks.forEach(link => {
        const row = [
            escapeCSV(new Date(link.createdAt).toLocaleDateString()),
            escapeCSV(link.url),
            escapeCSV(link.source),
            escapeCSV(link.medium),
            escapeCSV(link.campaign),
            escapeCSV(link.term),
            escapeCSV(link.content),
            escapeCSV(link.fullUrl)
        ];
        csvContent += row.join(',') + '\r\n';
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const downloadLink = document.createElement("a");
    const url = URL.createObjectURL(blob);
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `${plan.campaignName}-utm-links.csv`);
    downloadLink.style.visibility = 'hidden';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
};

export const exportUTMLinksAsTXT = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    let txtContent = `${t('Links Salvos')} - ${plan.campaignName}\n`;
    txtContent += `=========================================\n\n`;

    if (!plan.utmLinks || plan.utmLinks.length === 0) {
        txtContent += t('Nenhum link salvo ainda.');
    } else {
        plan.utmLinks.forEach(link => {
            txtContent += `----------------------------------------\n`;
            txtContent += `${t('Data')}: ${new Date(link.createdAt).toLocaleDateString()}\n`;
            txtContent += `${t('Campaign Name *')}: ${link.campaign}\n`;
            txtContent += `${t('URL do Site *')}: ${link.url}\n`;
            txtContent += `${t('Campaign Source *')}: ${link.source}\n`;
            txtContent += `${t('Campaign Medium *')}: ${link.medium}\n`;
            if (link.term) txtContent += `${t('Campaign Term')}: ${link.term}\n`;
            if (link.content) txtContent += `${t('Campaign Content')}: ${link.content}\n`;
            txtContent += `\n${t('URL Completa')}:\n${link.fullUrl}\n`;
            txtContent += `----------------------------------------\n\n`;
        });
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const downloadLink = document.createElement("a");
    const url = URL.createObjectURL(blob);
    downloadLink.setAttribute("href", url);
    downloadLink.setAttribute("download", `${plan.campaignName}-utm-links.txt`);
    downloadLink.style.visibility = 'hidden';
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
};

export const exportGroupedKeywordsAsCSV = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    const headers = [
        t('ad_group_column'),
        t('keyword'),
        t('search_volume'),
        t('estimated_clicks'),
        t('min_cpc'),
        t('max_cpc'),
    ];
    let csvContent = headers.join(',') + '\r\n';

    const allGroups = plan.adGroups || [];
    const assignedGroups = allGroups.filter(g => g.id !== 'unassigned');
    const unassignedGroup = allGroups.find(g => g.id === 'unassigned');

    const sortedGroups = [...assignedGroups];
    if (unassignedGroup) {
        sortedGroups.push(unassignedGroup);
    }

    sortedGroups.forEach(group => {
        if (group.keywords.length > 0) {
            group.keywords.forEach(kw => {
                const row = [
                    escapeCSV(group.name),
                    escapeCSV(kw.keyword),
                    escapeCSV(kw.volume),
                    escapeCSV(kw.clickPotential),
                    escapeCSV(kw.minCpc),
                    escapeCSV(kw.maxCpc),
                ];
                csvContent += row.join(',') + '\r\n';
            });
        }
    });

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-keywords.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const buildGroupedKeywordsPdfHtml = (plan: PlanData, t: (key: string) => string, canRemoveWatermark: boolean = false): string => {
    const currentYear = new Date().getFullYear();
    const styles = `
        <style>
            body { font-family: 'Helvetica', 'Arial', sans-serif; font-size: 10px; color: #333; }
            h1 { font-size: 18px; color: #003366; text-align: center; margin-bottom: 20px; }
            h2 { font-size: 14px; color: #003366; margin-top: 20px; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .pdf-footer { 
                position: fixed; 
                bottom: 10px; 
                left: 0; 
                right: 0; 
                text-align: center; 
                font-size: 8px; 
                color: #666; 
                border-top: 1px solid #ddd; 
                padding-top: 5px; 
            }
        </style>
    `;

    let content = `<h1>${t('export_all_keywords')} - ${plan.campaignName}</h1>`;

    if (!canRemoveWatermark) {
        content += `<div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) rotate(-45deg);font-size:80px;color:rgba(200,200,200,0.3);z-index:9999;pointer-events:none;white-space:nowrap;">MasterPlan Free</div>`;
    }

    const allGroups = plan.adGroups || [];
    const assignedGroups = allGroups.filter(g => g.id !== 'unassigned');
    const unassignedGroup = allGroups.find(g => g.id === 'unassigned');

    const sortedGroups = [...assignedGroups];
    if (unassignedGroup) {
        sortedGroups.push(unassignedGroup);
    }

    sortedGroups.forEach(group => {
        if (group.keywords && group.keywords.length > 0) {
            content += `<h2>${group.name}</h2>`;
            content += `
                <table>
                    <thead>
                        <tr>
                            <th>${t('keyword')}</th>
                            <th>${t('search_volume')}</th>
                            <th>${t('estimated_clicks')}</th>
                            <th>${t('min_cpc')}</th>
                            <th>${t('max_cpc')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${group.keywords.map(kw => `
                            <tr>
                                <td>${kw.keyword}</td>
                                <td>${formatNumber(kw.volume)}</td>
                                <td>${formatNumber(kw.clickPotential)}</td>
                                <td>${formatCurrency(kw.minCpc)}</td>
                                <td>${formatCurrency(kw.maxCpc)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    });

    const footer = `<div class="pdf-footer">© ${currentYear} MasterPlan - masterplanai.com.br</div>`;

    return `<div id="pdf-keywords-content" style="padding: 20px; padding-bottom: 40px;">${styles}${content}${footer}</div>`;
};


export const exportGroupedKeywordsToPDF = async (plan: PlanData, t: (key: string) => string, canRemoveWatermark: boolean = false) => {
    const reportHTML = buildGroupedKeywordsPdfHtml(plan, t, canRemoveWatermark);

    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '210mm'; // A4 width for rendering
    container.innerHTML = reportHTML;
    document.body.appendChild(container);

    try {
        const content = container.querySelector('#pdf-keywords-content') as HTMLElement;
        const canvas = await html2canvas(content, { scale: 2 });

        const pdf = new jsPDF('p', 'mm', 'a4'); // portrait, mm, A4
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = pdf.internal.pageSize.getHeight();
        const currentYear = new Date().getFullYear();

        const margin = 10;
        const footerHeight = 10;
        const usableHeight = pdfHeight - (2 * margin) - footerHeight;

        const imgWidth = canvas.width;
        const imgHeight = canvas.height;

        const finalWidth = pdfWidth - (2 * margin);
        const scaleFactor = finalWidth / imgWidth;
        const scaledImgHeight = imgHeight * scaleFactor;

        // Calculate how many pixels of the canvas fit on one page
        const pageContentHeight = usableHeight / scaleFactor;

        let currentY = 0;
        let pageNum = 0;

        while (currentY < imgHeight) {
            if (pageNum > 0) {
                pdf.addPage();
            }

            // Create a temporary canvas for this page slice
            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgWidth;
            const sliceHeight = Math.min(pageContentHeight, imgHeight - currentY);
            pageCanvas.height = sliceHeight;

            const ctx = pageCanvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(
                    canvas,
                    0, currentY,           // source x, y
                    imgWidth, sliceHeight, // source width, height
                    0, 0,                  // dest x, y
                    imgWidth, sliceHeight  // dest width, height
                );
            }

            const sliceScaledHeight = sliceHeight * scaleFactor;
            pdf.addImage(pageCanvas.toDataURL('image/png', 0.9), 'PNG', margin, margin, finalWidth, sliceScaledHeight);

            // Add footer
            pdf.setFontSize(8);
            pdf.setTextColor(102, 102, 102);
            pdf.text(`© ${currentYear} MasterPlan - masterplanai.com.br`, pdfWidth / 2, pdfHeight - 5, { align: 'center' });

            currentY += sliceHeight;
            pageNum++;
        }

        pdf.save(`${plan.campaignName}-keywords.pdf`);

    } catch (error) {
        console.error("Error generating keywords PDF:", error);
        alert('An error occurred while generating the PDF.');
    } finally {
        document.body.removeChild(container);
    }
};

export const exportGroupedKeywordsAsTXT = (plan: PlanData, t: (key: string, substitutions?: Record<string, string>) => string) => {
    let txtContent = `${t('ad_groups')} - ${plan.campaignName}\n`;
    txtContent += `=========================================\n\n`;

    const allGroups = plan.adGroups || [];
    const assignedGroups = allGroups.filter(g => g.id !== 'unassigned');
    const unassignedGroup = allGroups.find(g => g.id === 'unassigned');

    const sortedGroups = [...assignedGroups];
    if (unassignedGroup) {
        sortedGroups.push(unassignedGroup);
    }

    if (sortedGroups.length > 0) {
        sortedGroups.forEach(group => {
            if (group.keywords.length > 0) {
                txtContent += `${t('ad_group_column')}: ${group.name}\n`;
                txtContent += `-----------------------------------------\n`;
                group.keywords.forEach(kw => {
                    txtContent += `- ${kw.keyword}\n`;
                });
                txtContent += `\n`;
            }
        });
    }

    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${plan.campaignName}-keywords.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


// --- AI API CALLS ---
export const callGeminiAPI = async (prompt: string, isJsonOutput: boolean = false): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            ...(isJsonOutput && { config: { responseMimeType: "application/json" } })
        });

        let textResponse = response.text.trim();

        // More robust stripping of markdown fences (e.g., ```json or ```html)
        textResponse = textResponse.replace(/^```(?:json|html)?\s*\n/, '').replace(/\n?```$/, '').trim();

        if (isJsonOutput) {
            try {
                return JSON.parse(textResponse);
            } catch (e) {
                console.error("Failed to parse JSON response from Gemini:", e, "Raw response:", textResponse);
                throw new Error("Invalid JSON response from AI.");
            }
        }
        return textResponse;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        throw error;
    }
};

export const generateAIPlan = async (prompt: string, language: LanguageCode): Promise<Partial<PlanData>> => {
    const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';

    // Step 1: Dynamically determine the months for the plan from the user's prompt
    const periodRegex = /(\d+)\s*(meses|mês|months|month)/i;
    const periodMatch = prompt.match(periodRegex);
    // Use a robust default of 3 months if not specified
    const numberOfMonths = periodMatch ? parseInt(periodMatch[1], 10) : 3;

    const currentYear = new Date().getFullYear();
    const currentMonthIndex = new Date().getMonth();
    const planMonths = Array.from({ length: numberOfMonths }, (_, i) => {
        const monthIndex = (currentMonthIndex + i) % 12;
        const year = currentYear + Math.floor((currentMonthIndex + i) / 12);
        return `${year}-${MONTHS_LIST[monthIndex]}`;
    });

    const monthsJsonStructure = planMonths.map(month => `"${month}": [ /* list of campaigns for ${month} */ ]`).join(',\n            ');

    // Step 2: Extract budget information to guide the AI
    const budgetRegex = /(?:R\$|R\$ ?|budget of|orçamento de)\s*([\d.,]+(?:,\d{2})?)\s*(?:por mês|mensal|monthly)/i;
    const budgetMatch = prompt.match(budgetRegex);
    let totalInvestmentInstruction = `totalInvestment: A number representing the total estimated budget for the ${numberOfMonths} months. You must calculate this from the user's prompt.`;
    if (budgetMatch) {
        // Handle numbers like "5.000,00" or "6000"
        const monthlyBudget = parseFloat(budgetMatch[1].replace(/\./g, '').replace(',', '.'));
        if (!isNaN(monthlyBudget)) {
            const totalBudget = monthlyBudget * numberOfMonths;
            totalInvestmentInstruction = `totalInvestment: ${totalBudget}, /* This was pre-calculated from the user's monthly budget of ${monthlyBudget} for ${numberOfMonths} months. Use this exact total. */`;
        }
    }

    const aiPrompt = `
        You are a world-class media planning expert. Your task is to create a detailed, strategic media plan based on the user's prompt.
        User prompt: "${prompt}"

        **CRITICAL INSTRUCTIONS:**
        1.  **Period:** The plan MUST span exactly ${numberOfMonths} months. This is a strict requirement.
        2.  **Budget:** Adhere strictly to the budget specified in the user prompt. The total sum of all campaign budgets MUST equal the final 'totalInvestment'.
        3.  **Output Format:** The output MUST be a single, valid JSON object. Do not include any text, explanations, or markdown fences like \`\`\`json before or after the JSON.

        **JSON Structure:**
        {
          "campaignName": "A creative and relevant name for the plan based on the user prompt",
          "objective": "A clear, measurable main objective, derived from the user prompt",
          "targetAudience": "A detailed description of the main target audience from the prompt",
          "location": "The main location for the campaigns (e.g., Brazil, São Paulo), extracted from the prompt",
          ${totalInvestmentInstruction}
          "logoUrl": "Use this format: https://loremflickr.com/400/400/{keyword1},{keyword2}/all?lock={random_number} (replace {keyword} with relevant business terms like 'business', 'tech', 'fashion' and {random_number} with a random integer)",
          "aiImagePrompt": "A detailed, vivid DALL-E or Midjourney style prompt to generate a hero image for this campaign.",
          "months": {
            ${monthsJsonStructure}
          }
        }

        **Campaign Object Structure (for each campaign inside the 'months' arrays):**
        - "tipoCampanha": Strategically choose from: ${JSON.stringify(OPTIONS.tipoCampanha)}. A good strategy often starts with Awareness/Alcance in early months and moves to Conversão/Retargeting in later months.
        - "etapaFunil": Choose from ${JSON.stringify(OPTIONS.etapaFunil)}, corresponding to the 'tipoCampanha'.
        - "canal": Choose the most appropriate channel from: ${JSON.stringify(OPTIONS.canal)}.
        - "formato": Based on the channel, choose a suitable format from the list: ${JSON.stringify(CHANNEL_FORMATS)}.
        - "objetivo": A specific, short objective for this particular campaign.
        - "kpi": The main Key Performance Indicator for this campaign. Use "CPM" for awareness campaigns, "CPC" for traffic/engagement campaigns, "CPL" for lead generation.
        - "publicoAlvo": A specific audience segment for this campaign (e.g., "Retargeting de visitantes do site", "Público de interesse em moda sustentável").
        - "budget": A numeric portion of the totalInvestment. Distribute it logically across all months and campaigns.
        - "unidadeCompra": IMPORTANT - You MUST choose ONLY from these exact values: ${JSON.stringify(OPTIONS.unidadeCompra)}. Use "CPM" for awareness/reach campaigns, "CPC" for traffic/engagement/conversion campaigns, "CPV" for video view campaigns, "CPL" for lead generation campaigns. NEVER use "CPA" - it is not a valid option.

        **Metric Guidelines for Brazilian Market (BRL):**
        - Meta Ads: CPM R$10-25, CPC R$1.50-6.00
        - Google Ads Search: CPC R$3.00-15.00
        - Google Ads Display: CPM R$5-15, CPC R$0.50-2.00
        - LinkedIn Ads: CPM R$30-80, CPC R$8.00-25.00
        - TikTok Ads: CPM R$5-15, CPC R$0.80-3.00

        ${langInstruction}
    `;

    return callGeminiAPI(aiPrompt, true);
};

export const generateAIKeywords = async (planData: PlanData, mode: 'seed' | 'prompt', input: string, language: LanguageCode, keywordCount: string): Promise<KeywordSuggestion[]> => {
    const langInstruction = language === 'pt-BR' ? 'Responda em Português do Brasil.' : 'Respond in English.';
    const promptContext = `
        Plan Objective: ${planData.objective}
        Target Audience: ${planData.targetAudience}
        Business description from prompt: ${mode === 'prompt' ? input : 'N/A'}
        Seed Keywords: ${mode === 'seed' ? input : 'N/A'}
    `;

    const aiPrompt = `
        You are a Google Ads keyword research expert. Based on the provided context, generate a list of ${keywordCount} highly relevant keywords.
        The output MUST be a valid JSON object with a single key "keywords" which contains an array of keyword objects.
        Do not include any text, explanation, or markdown fences like \`\`\`json around the JSON output.
        
        Each keyword object in the array must have this exact structure:
        {
            "keyword": "the suggested keyword phrase",
            "volume": a number representing estimated monthly search volume (e.g., 1500),
            "clickPotential": a number representing estimated monthly clicks based on the search volume and general competitiveness (e.g., 120),
            "minCpc": a number for the minimum CPC bid in BRL (e.g., 0.85),
            "maxCpc": a number for the maximum CPC bid in BRL (e.g., 3.50)
        }

        Context:
        ${promptContext}

        ${langInstruction}
        Generate a diverse list including short-tail, long-tail, and question-based keywords.
    `;
    const response = await callGeminiAPI(aiPrompt, true);
    if (response && response.keywords && Array.isArray(response.keywords)) {
        return response.keywords;
    }
    throw new Error("Invalid response from AI for keywords");
};

export const generateAIImages = async (prompt: string, images?: { base64: string; mimeType: string }[]): Promise<GeneratedImage[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    // Use Gemini 2.5 Flash Image for both generation and editing (FREE tier - 500 images/day)
    try {
        let allParts: any[] = [];

        if (images && images.length > 0) {
            // Include source images for editing
            const imageParts = images.map(image => ({
                inlineData: {
                    mimeType: image.mimeType,
                    data: image.base64,
                },
            }));
            allParts = [...imageParts];
        }

        // Add the prompt
        allParts.push({ text: prompt });

        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image',
            contents: { parts: allParts },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imagePartsFromResponse = response.candidates[0].content.parts.filter(part => part.inlineData);

        if (imagePartsFromResponse.length > 0) {
            // Return all generated images
            const generatedImages: GeneratedImage[] = imagePartsFromResponse
                .filter(part => part.inlineData)
                .map(part => ({
                    base64: part.inlineData!.data,
                    aspectRatio: '1:1' as AspectRatio,
                }));
            return generatedImages;
        } else {
            throw new Error("Image generation returned no images.");
        }
    } catch (error: any) {
        console.error("Error calling Gemini Image API:", error);
        // Preserve the original error message for quota detection in UI
        const errorMessage = error?.message || error?.toString() || 'Image generation failed.';
        throw new Error(errorMessage);
    }
};

/**
 * Generates a video using Replicate (Stable Video Diffusion) via Cloud Functions
 * @param prompt Text prompt (not used by SVD currently but good for future)
 * @param image Base64 image string (required for SVD)
 */
export const generateAIVideo = async (prompt: string, image: string): Promise<{ success: boolean; videoUrl: any }> => {
    if (!functions) throw new Error("Firebase Functions not initialized");

    try {
        const generateVideoFn = httpsCallable(functions, 'generateAIVideo');
        const result = await generateVideoFn({ prompt, image });
        const data = result.data as any;

        if (data.success) {
            return data;
        } else {
            throw new Error("Failed to generate video response.");
        }
    } catch (error: any) {
        console.error("Error calling generateAIVideo:", error);
        throw new Error(error.message || "Video generation failed.");
    }
};

export const createCheckoutSession = async (planType: string, interval: 'month' | 'year') => {
    if (!functions) throw new Error("Firebase Functions not initialized");
    const createSession = httpsCallable(functions, 'createStripeCheckoutSession');
    const { data } = await createSession({ planType, interval });
    return data as { url: string };
};