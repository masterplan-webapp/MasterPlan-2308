export interface StripePrice {
  id: string;
  amount: number;
  currency: string;
  interval: 'month' | 'year';
  intervalCount: number;
  productId: string;
}

export interface StripeProduct {
  id: string;
  name: string;
  description: string;
  prices: StripePrice[];
}

export interface Subscription {
  id: string;
  customerId: string;
  priceId: string;
  status: 'active' | 'canceled' | 'past_due' | 'incomplete';
  currentPeriodEnd: Date;
  currentPeriodStart: Date;
  cancelAtPeriodEnd: boolean;
}

export interface CheckoutSession {
  sessionId: string;
  url: string;
}
