import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { PLANS, PRICING, getAnnualSavings, PlanType } from '../config/stripeProducts';
import stripe from '../services/stripe';

interface PricingTableProps {
  onPlanSelect?: (planType: PlanType, priceId: string, isAnnual: boolean) => void;
  currentPlan?: PlanType;
}

const PricingTable: React.FC<PricingTableProps> = ({ onPlanSelect, currentPlan }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (planType: PlanType, isAnnual: boolean = false) => {
    if (planType === 'free') {
      onPlanSelect?.(planType, '', false);
      return;
    }

    const plan = PLANS[planType];
    const priceId = isAnnual ? plan.yearlyPriceId : plan.monthlyPriceId;

    if (!priceId) return;

    setLoading(priceId);
    try {
      const session = await stripe.createCheckoutSession(priceId);
      if (session?.url) {
        window.location.href = session.url;
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      alert('Erro ao criar sesão de pagamento. Tente novamente.');
    } finally {
      setLoading(null);
    }
  };

  const planTypes: PlanType[] = ['free', 'pro', 'ai'];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">Planos Simples e Transparentes</h2>
          <p className="text-xl text-gray-600 mb-8">Escolha o plano perfeito para suas necessidades</p>

          {/* Billing Toggle */}
          <div className="flex justify-center items-center gap-4">
            <span className={`text-sm font-medium ${ billingCycle === 'monthly' ? 'text-gray-900' : 'text-gray-600'}`}>
              Mensal
            </span>
            <button
              onClick={() => setBillingCycle(billingCycle === 'monthly' ? 'annual' : 'monthly')}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                billingCycle === 'annual' ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                  billingCycle === 'annual' ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
            <span className={`text-sm font-medium ${billingCycle === 'annual' ? 'text-gray-900' : 'text-gray-600'}`}>
              Anual{' '}
              <span className="ml-2 inline-block bg-green-100 text-green-800 text-xs font-semibold px-3 py-1 rounded-full">
                Economize até 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-3 gap-8 lg:gap-6">
          {planTypes.map((planType) => {
            const plan = PLANS[planType];
            const isPopular = planType === 'ai';
            const isCurrent = currentPlan === planType;
            const price = planType === 'free' ? 0 : PRICING.BRL[planType][billingCycle];
            const priceId = billingCycle === 'annual' ? plan.yearlyPriceId : plan.monthlyPriceId;

            return (
              <div
                key={planType}
                className={`relative rounded-2xl transition-all transform hover:scale-105 ${
                  isPopular
                    ? 'ring-2 ring-indigo-600 md:scale-105 shadow-2xl bg-white'
                    : 'bg-white shadow-lg hover:shadow-xl'
                }`}
              >
                {isPopular && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                    <span className="bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full">
                      MAIS POPULAR
                    </span>
                  </div>
                )}

                <div className="p-8">
                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">{plan.name}</h3>
                  <p className="text-gray-600 text-sm mb-6">{plan.description}</p>

                  {/* Price */}
                  <div className="mb-6">
                    {planType === 'free' ? (
                      <div className="text-4xl font-bold text-gray-900">Gratis</div>
                    ) : (
                      <>
                        <div className="flex items-baseline gap-2">
                          <span className="text-5xl font-bold text-gray-900">R$ {price.toFixed(2)}</span>
                          <span className="text-gray-600 text-lg">/{billingCycle === 'monthly' ? 'mês' : 'ano'}</span>
                        </div>
                        {billingCycle === 'annual' && planType !== 'free' && (
                          <p className="text-green-600 text-sm mt-2">Economize R$ {getAnnualSavings(planType).toFixed(2)}/ano</p>
                        )}
                      </>
                    )}
                  </div>

                  {/* CTA Button */}
                  <button
                    onClick={() => handleCheckout(planType, billingCycle === 'annual')}
                    disabled={loading !== null || isCurrent}
                    className={`w-full py-3 px-4 rounded-lg font-semibold transition-all mb-8 ${
                      isCurrent
                        ? 'bg-gray-100 text-gray-600 cursor-not-allowed'
                        : isPopular
                        ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                        : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                    } ${loading === priceId ? 'opacity-50' : ''}`}
                  >
                    {isCurrent ? 'Plano Atual' : loading === priceId ? 'Processando...' : 'Escolher Plano'}
                  </button>

                  {/* Divider */}
                  <div className="border-t border-gray-200 mb-6"></div>

                  {/* Features */}
                  <ul className="space-y-4">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>

        {/* FAQ Section */}
        <div className="mt-20 max-w-3xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-900 mb-8 text-center">Dúvidas Frequentes</h3>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold text-gray-900 mb-2">Posso trocar de plano a qualquer momento?</h4>
              <p className="text-gray-600">Sim! Você pode fazer upgrade ou downgrade de seu plano a qualquer momento. A mudança entrará em vigor no próximo ciclo de faturamento.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold text-gray-900 mb-2">Não gosto do meu plano, posso cancelar?</h4>
              <p className="text-gray-600">Claro! Você pode cancelar sua assinatura a qualquer momento. Não há taxa de cancelamento.</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <h4 className="font-semibold text-gray-900 mb-2">Qual plano é melhor para começar?</h4>
              <p className="text-gray-600">Comece com o plano Free para explorar as funcionalidades. Quando precisar de mais, faça upgrade para Pro ou AI.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PricingTable;
