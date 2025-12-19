import Stripe from 'stripe';

const stripeInstance = new Stripe(process.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export const stripe = {
  // Get all products
  getProducts: async () => {
    try {
      const products = await stripeInstance.products.list({
        limit: 100,
        active: true,
      });
      return products.data;
    } catch (error) {
      console.error('Error fetching products:', error);
      throw error;
    }
  },

  // Get product by ID
  getProduct: async (productId: string) => {
    try {
      return await stripeInstance.products.retrieve(productId);
    } catch (error) {
      console.error('Error fetching product:', error);
      throw error;
    }
  },

  // Get all prices for a product
  getPrices: async (productId?: string) => {
    try {
      const prices = await stripeInstance.prices.list({
        limit: 100,
        active: true,
        ...(productId && { product: productId }),
      });
      return prices.data;
    } catch (error) {
      console.error('Error fetching prices:', error);
      throw error;
    }
  },

  // Create a checkout session
  createCheckoutSession: async (priceId: string, customerId?: string) => {
    try {
      const session = await stripeInstance.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.VITE_APP_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.VITE_APP_URL}/pricing`,
        ...(customerId && { customer: customerId }),
      });
      return session;
    } catch (error) {
      console.error('Error creating checkout session:', error);
      throw error;
    }
  },

  // Get customer
  getCustomer: async (customerId: string) => {
    try {
      return await stripeInstance.customers.retrieve(customerId);
    } catch (error) {
      console.error('Error fetching customer:', error);
      throw error;
    }
  },

  // Create customer
  createCustomer: async (email: string, name?: string) => {
    try {
      return await stripeInstance.customers.create({
        email,
        name,
      });
    } catch (error) {
      console.error('Error creating customer:', error);
      throw error;
    }
  },

  // Get subscription
  getSubscription: async (subscriptionId: string) => {
    try {
      return await stripeInstance.subscriptions.retrieve(subscriptionId);
    } catch (error) {
      console.error('Error fetching subscription:', error);
      throw error;
    }
  },

  // Get customer subscriptions
  getCustomerSubscriptions: async (customerId: string) => {
    try {
      const subscriptions = await stripeInstance.subscriptions.list({
        customer: customerId,
        limit: 100,
      });
      return subscriptions.data;
    } catch (error) {
      console.error('Error fetching customer subscriptions:', error);
      throw error;
    }
  },

  // Cancel subscription
  cancelSubscription: async (subscriptionId: string) => {
    try {
      return await stripeInstance.subscriptions.del(subscriptionId);
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw error;
    }
  },

  // Verify webhook signature
  verifyWebhookSignature: (body: string, signature: string) => {
    try {
      return stripeInstance.webhooks.constructEvent(
        body,
        signature,
        process.env.VITE_STRIPE_WEBHOOK_SECRET || ''
      );
    } catch (error) {
      console.error('Error verifying webhook signature:', error);
      throw error;
    }
  },
};

export default stripe;
