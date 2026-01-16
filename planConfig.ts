
import { PlanData } from "./types";

export type SubscriptionTier = 'free' | 'pro' | 'ai' | 'ai_plus';

export interface PlanConfig {
    id: SubscriptionTier;
    name: string;
    description: string;
    price: {
        monthly: number;
        annual: number;
    };
    features: string[];
    limits: {
        aiAnalysisCurrentPlan: number; // per month
        aiPlanCreation: number; // per month
        aiImages: number; // per month
        aiVideos: number; // per month
        aiTextGeneration: boolean; // Unlimited text gen for copy/keywords?
        canUseTemplates: boolean;
        canExportPDF: boolean;
        canRemoveWatermark: boolean;
        canSharePublicLink: boolean;
        canUseVideoBuilder: boolean;
        canUseCreativeBuilder: boolean;
        canUseAdvancedAI: boolean; // e.g. Veo or GPT-4o specific
        maxUTMLinks: number;
        maxKeywords: number;
        maxCopyVersions: number;
    };
}

export const PLANS: Record<SubscriptionTier, PlanConfig> = {
    free: {
        id: 'free',
        name: 'MasterPlan Free',
        description: 'Ideal para quem está começando.',
        price: { monthly: 0, annual: 0 },
        features: [
            '1 Plano de Mídia',
            'Criação Manual (Sem Modelos)',
            '1 Análise com IA / mês',
            'UTM Builder (10 links)',
            'Exportação PDF (com marca d\'água)'
        ],
        limits: {
            aiAnalysisCurrentPlan: 1,
            aiPlanCreation: 0,
            aiImages: 0,
            aiVideos: 0,
            aiTextGeneration: false, // Limited manual usage defined in UI logic
            canUseTemplates: false,
            canExportPDF: true,
            canRemoveWatermark: false,
            canSharePublicLink: false,
            canUseVideoBuilder: false,
            canUseCreativeBuilder: false,
            canUseAdvancedAI: false,
            maxUTMLinks: 10,
            maxKeywords: 50,
            maxCopyVersions: 5
        }
    },
    pro: {
        id: 'pro',
        name: 'MasterPlan Pro',
        description: 'Para profissionais que buscam produtividade.',
        price: { monthly: 49, annual: 490 },
        features: [
            'Planos Ilimitados',
            'Criação com Modelos',
            '5 Análises com IA / mês',
            'UTM & Copy Builder Ilimitados',
            'Exportação PDF (Sem marca d\'água)',
            'Link Público de Compartilhamento'
        ],
        limits: {
            aiAnalysisCurrentPlan: 5,
            aiPlanCreation: 0,
            aiImages: 0, // Manual usage allowed? Assuming no generative AI images
            aiVideos: 0,
            aiTextGeneration: false,
            canUseTemplates: true,
            canExportPDF: true,
            canRemoveWatermark: true,
            canSharePublicLink: true,
            canUseVideoBuilder: false,
            canUseCreativeBuilder: false,
            canUseAdvancedAI: false,
            maxUTMLinks: 9999,
            maxKeywords: 9999,
            maxCopyVersions: 9999
        }
    },
    ai: {
        id: 'ai',
        name: 'MasterPlan AI',
        description: 'Poder total da IA para suas campanhas.',
        price: { monthly: 99, annual: 990 },
        features: [
            'Tudo do Pro',
            'Criação de Planos com IA',
            'Análises de Plano Ilimitadas',
            'Creative Builder com IA (200 imagens)',
            'Video Builder (50 vídeos - SVD)',
            'Geração de Texto Ilimitada'
        ],
        limits: {
            aiAnalysisCurrentPlan: 9999,
            aiPlanCreation: 50, // Soft limit
            aiImages: 200,
            aiVideos: 50,
            aiTextGeneration: true,
            canUseTemplates: true,
            canExportPDF: true,
            canRemoveWatermark: true,
            canSharePublicLink: true,
            canUseVideoBuilder: false, // Moved to AI+ Exclusive (Veo)
            canUseCreativeBuilder: true,
            canUseAdvancedAI: false,
            maxUTMLinks: 9999,
            maxKeywords: 9999,
            maxCopyVersions: 9999
        }
    },
    ai_plus: {
        id: 'ai_plus',
        name: 'MasterPlan AI+',
        description: 'Para agências que precisam de escala máxima.',
        price: { monthly: 349, annual: 3490 },
        features: [
            'Tudo do AI',
            'Video Builder Premium (15 vídeos Veo)',
            'Video Builder SVD Ilimitado',
            'Imagens IA Ilimitadas',
            'Prioridade no Suporte'
        ],
        limits: {
            aiAnalysisCurrentPlan: 9999,
            aiPlanCreation: 9999,
            aiImages: 9999,
            aiVideos: 9999, // SVD Unlimited, logic for Veo separate if implemented
            aiTextGeneration: true,
            canUseTemplates: true,
            canExportPDF: true,
            canRemoveWatermark: true,
            canSharePublicLink: true,
            canUseVideoBuilder: true,
            canUseCreativeBuilder: true,
            canUseAdvancedAI: true,
            maxUTMLinks: 9999,
            maxKeywords: 9999,
            maxCopyVersions: 9999
        }
    }
};

export const getPlanCapability = (tier: SubscriptionTier | undefined, capability: keyof PlanConfig['limits']): number | boolean => {
    const userTier = tier || 'free';
    return PLANS[userTier].limits[capability];
};
