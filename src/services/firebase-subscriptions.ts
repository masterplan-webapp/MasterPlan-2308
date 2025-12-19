import { db } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';

export interface SubscriptionData {
  stripeSubscriptionId: string | null;
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  planId: string | null;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date | null;
  canceledAt?: Date;
}

export async function updateUserSubscription(
  userId: string,
  subscriptionData: SubscriptionData
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    
    const dataToUpdate: any = {
      subscription: {
        stripeSubscriptionId: subscriptionData.stripeSubscriptionId,
        status: subscriptionData.status,
        planId: subscriptionData.planId,
        currentPeriodStart: subscriptionData.currentPeriodStart || null,
        currentPeriodEnd: subscriptionData.currentPeriodEnd || null,
        updatedAt: new Date(),
      },
    };

    if (subscriptionData.status === 'canceled') {
      dataToUpdate.subscription.canceledAt = new Date();
    }

    await updateDoc(userRef, dataToUpdate);
  } catch (error) {
    console.error('Error updating user subscription:', error);
    throw error;
  }
}

export async function checkSubscriptionStatus(
  userId: string
): Promise<boolean> {
  try {
    const userRef = doc(db, 'users', userId);
    const snap = await userRef.get?.();
    
    if (!snap || !snap.exists()) {
      return false;
    }

    const userData = snap.data();
    const subscription = userData?.subscription;
    
    return (
      subscription &&
      subscription.status === 'active' &&
      subscription.currentPeriodEnd &&
      new Date(subscription.currentPeriodEnd) > new Date()
    );
  } catch (error) {
    console.error('Error checking subscription status:', error);
    return false;
  }
}
