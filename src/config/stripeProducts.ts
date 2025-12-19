import { StripeProduct } from '../types/stripe';

export type PlanType = 'free' | 'pro' | 'ai';

export interface PlanConfig extends StripeProduct {
  planType: PlanType;
  features: string[];
  monthlyPriceId: string | null;
  yearlyPriceId: string | null;
}

// Stripe Product IDs from your account
export const STRIPE_PRODUCTS = {
  PRO_MONTHLY: 'prod_T6BekVP3s0I1pw',
  PRO_ANNUAL: 'prod_T9NQgXX5UWctse',
  AI_MONTHLY: 'prod_T6BjlQscbFl6vS',
  AI_ANNUAL: 'prod_T9NTSjSd3rvWQg',
  AI_PLUS: 'prod_Td9nnhpnCTXDO6',
} as const;

// Plan Configurations
export const PLANS: Record<PlanType, PlanConfig> = {
  free: {
    id: 'free',
    name: 'MasterPlan Free',
    description: 'Perfeito para começar',
    planType: 'free',
    monthlyPriceId: null,
    yearlyPriceId: null,
    prices: [],
    features: [
      '1 plano de mídia',
      'Criação manual apenas',
      '1 análise com IA por mês',
      'UTM Builder (máximo 10 links)',
      'Keyword Builder manual (máximo 50 keywords)',
      'Copy Builder manual (máximo 5 versões)',
      'Compartilhamento PDF com watermark',
      'Suporte por email',
    ],
  },
  pro: {
    id: STRIPE_PRODUCTS.PRO_MONTHLY,
    name: 'MasterPlan Pro',
    description: 'Para profissionais que querem mais',
    planType: 'pro',
    monthlyPriceId: 'price_1S5QZeGr4FxMIDKzKOKP0xyC', // R$ 39,90/mês
    yearlyPriceId: 'price_1S5QZeGr4FxMIDKzYUvAzYwY', // R$ 390,00/ano
    prices: [],
    features: [
      'Planos ilimitados',
      'Criação manual + 20 modelos premium',
      'Análises com IA ilimitadas',
      'UTM Builder ilimitado',
      'Keyword Builder manual ilimitado',
      'Copy Builder manual ilimitado',
      'Compartilhamento PDF + link público',
      'Integração com Google Analytics',
      'Suporte prioritário',
    ],
  },
  ai: {
    id: STRIPE_PRODUCTS.AI_MONTHLY,
    name: 'MasterPlan AI',
    description: 'Poder total com IA avançada',
    planType: 'ai',
    monthlyPriceId: 'price_1S5QZeGr4FxMIDKzP8oL0xXx', // R$ 99,90/mês
    yearlyPriceId: 'price_1S5QZeGr4FxMIDKzX0kL1xxX', // R$ 990,00/ano
    prices: [],
    features: [
      'Tudo do plano Pro',
      'IA completa para todas as ferramentas',
      'Copy Builder com IA (ilimitado)',
      'Keyword Builder com IA (ilimitado)',
      'Análise completa com recomendações',
      'Criação de campanhas com IA',
      'Templates com IA',
      'Prioridade máxima no suporte',
      'Elegível para ferramentas futuras',
    ],
  },
};

// Feature Availability Matrix
export const FEATURE_FLAGS: Record<PlanType, Record<string, boolean>> = {
  free: {
    'multiple-plans': false,
    'ai-analysis': true, // 1x per month
    'unlimited-ai': false,
    'utm-builder': true,
    'keyword-builder': true,
    'copy-builder': true,
    'ai-copy-builder': false,
    'ai-keyword-builder': false,
    'public-sharing': false,
    'analytics-integration': false,
    'priority-support': false,
    'advanced-templates': false,
    'campaign-templates': false,
  },
  pro: {
    'multiple-plans': true,
    'ai-analysis': true,
    'unlimited-ai': true,
    'utm-builder': true,
    'keyword-builder': true,
    'copy-builder': true,
    'ai-copy-builder': false,
    'ai-keyword-builder': false,
    'public-sharing': true,
    'analytics-integration': true,
    'priority-support': true,
    'advanced-templates': true,
    'campaign-templates': false,
  },
  ai: {
    'multiple-plans': true,
    'ai-analysis': true,
    'unlimited-ai': true,
    'utm-builder': true,
    'keyword-builder': true,
    'copy-builder': true,
    'ai-copy-builder': true,
    'ai-keyword-builder': true,
    'public-sharing': true,
    'analytics-integration': true,
    'priority-support': true,
    'advanced-templates': true,
    'campaign-templates': true,
  },
};

// Pricing Information
export const PRICING = {
  BRL: {
    free: 0,
    pro: {
      monthly: 39.9,
      annual: 390.0,
    },
    ai: {
      monthly: 99.9,
      annual: 990.0,
    },
  },
} as const;

// Helper function to get plan by type
export const getPlanByType = (planType: PlanType): PlanConfig => PLANS[planType];

// Helper function to check if feature is available for plan
export const isFeatureAvailable = (planType: PlanType, feature: string): boolean => {
  return FEATURE_FLAGS[planType][feature] ?? false;
};

// Helper function to get annual savings
export const getAnnualSavings = (planType: Exclude<PlanType, 'free'>): number => {
  const monthly = PRICING.BRL[planType].monthly;
  const annual = PRICING.BRL[planType].annual;
  return monthly * 12 - annual;
};

export default PLANS;
