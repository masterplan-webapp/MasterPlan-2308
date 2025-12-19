import { useContext, useCallback } from 'react';
import { PlanType, FEATURE_FLAGS, isFeatureAvailable } from '../config/stripeProducts';

// This hook should be used with a UserContext that provides the user's plan
// You'll need to integrate this with your Firebase/Auth system

interface UseUserPlanReturn {
  currentPlan: PlanType;
  isPremium: boolean;
  isAI: boolean;
  hasFeature: (feature: string) => boolean;
  features: Record<string, boolean>;
  canAccess: (requiredPlan: PlanType) => boolean;
}

/**
 * Hook to check user's current plan and available features
 * @returns User plan info and permission checking functions
 */
export const useUserPlan = (): UseUserPlanReturn => {
  // TODO: Replace with actual user context from Firebase/Auth
  // For now, we're using a default 'free' plan
  const currentPlan: PlanType = (typeof window !== 'undefined' 
    ? localStorage.getItem('userPlan') as PlanType || 'free'
    : 'free');

  const isPremium = currentPlan !== 'free';
  const isAI = currentPlan === 'ai';
  
  const features = FEATURE_FLAGS[currentPlan];

  const hasFeature = useCallback(
    (feature: string): boolean => {
      return isFeatureAvailable(currentPlan, feature);
    },
    [currentPlan]
  );

  const canAccess = useCallback(
    (requiredPlan: PlanType): boolean => {
      const planHierarchy: Record<PlanType, number> = {
        free: 0,
        pro: 1,
        ai: 2,
      };
      return planHierarchy[currentPlan] >= planHierarchy[requiredPlan];
    },
    [currentPlan]
  );

  return {
    currentPlan,
    isPremium,
    isAI,
    hasFeature,
    features,
    canAccess,
  };
};

/**
 * Hook to get a list of features for a specific plan
 */
export const usePlanFeatures = (planType: PlanType): Record<string, boolean> => {
  return FEATURE_FLAGS[planType];
};

/**
 * Hook to check if user should see upgrade prompt
 */
export const useUpgradePrompt = (requiredFeature: string) => {
  const { hasFeature, currentPlan } = useUserPlan();
  
  const shouldShowUpgrade = !hasFeature(requiredFeature) && currentPlan !== 'ai';
  
  const getUpgradePlans = useCallback((): PlanType[] => {
    if (currentPlan === 'free' || currentPlan === 'pro') {
      return ['pro', 'ai'].filter(plan => 
        FEATURE_FLAGS[plan as PlanType][requiredFeature]
      ) as PlanType[];
    }
    return [];
  }, [currentPlan, requiredFeature]);

  return {
    shouldShowUpgrade,
    currentPlan,
    getUpgradePlans,
  };
};

/**
 * Higher-order component to protect features behind a paywall
 */
export const withPlanProtection = (
  Component: React.FC<any>,
  requiredPlan: PlanType = 'pro'
) => {
  return (props: any) => {
    const { canAccess, currentPlan } = useUserPlan();

    if (!canAccess(requiredPlan)) {
      return (
        <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Recurso Premium</h3>
          <p className="text-gray-600 mb-4">
            Este recurso está disponível apenas no plano {requiredPlan}.
          </p>
          <button
            onClick={() => window.location.href = '/pricing'}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Fazer Upgrade
          </button>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

export default useUserPlan;
