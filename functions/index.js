const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();
const db = admin.firestore();

// Initialize Stripe with the Secret Key from Firebase config
const stripeSecretKey = functions.config().stripe?.secret_key || "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";
const stripe = require("stripe")(stripeSecretKey);

/**
 * Creates a Stripe Checkout Session for subscription upgrade.
 * HTTP endpoint that accepts POST requests with { plan: 'pro' | 'ai' }
 */
exports.createStripeCheckoutSession = functions.https.onRequest(async (req, res) => {
    // Set CORS headers - allow all origins for now
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.set('Access-Control-Max-Age', '3600');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    try {
        // Get the Firebase ID token from the Authorization header
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            res.status(401).json({ error: 'Unauthorized - Missing token' });
            return;
        }

        const idToken = authHeader.split('Bearer ')[1];

        // Verify the ID token
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        const uid = decodedToken.uid;
        const userEmail = decodedToken.email;

        // Get plan type from request body
        const { plan: planType } = req.body;

        if (!['pro', 'ai'].includes(planType)) {
            res.status(400).json({ error: 'Invalid plan type' });
            return;
        }

        // Define product details
        const priceData = {
            currency: 'brl',
            product_data: {
                name: planType === 'pro' ? 'MasterPlan PRO' : 'MasterPlan AI Premium',
                description: planType === 'pro'
                    ? 'Acesso ilimitado a planos e exportação sem marca d\'água.'
                    : 'Tudo do PRO + Geração ilimitada com IA.',
                metadata: {
                    firebaseWaitlistRole: planType
                }
            },
            unit_amount: planType === 'pro' ? 4900 : 9900,
            recurring: {
                interval: 'month',
            },
        };

        // Create the Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "subscription",
            line_items: [
                {
                    price_data: priceData,
                    quantity: 1,
                },
            ],
            customer_email: userEmail,
            metadata: {
                firebaseUID: uid,
                targetPlan: planType
            },
            success_url: `https://app.masterplanai.com.br/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `https://app.masterplanai.com.br/?payment_cancelled=true`,
        });

        res.status(200).json({ sessionId: session.id, url: session.url });
    } catch (error) {
        console.error("Stripe Error:", error);
        res.status(500).json({ error: 'Unable to create checkout session', details: error.message });
    }
});

/**
 * Webhook to handle Stripe events (like successful payment).
 * This updates the user's Firestore document.
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
    const signature = req.headers["stripe-signature"];

    // Webhook Signing Secret from Stripe Dashboard
    const endpointSecret = "whsec_ivNfwetVxRuo81cfc7AVuUGhFabmMnxz";

    let event;

    try {
        // Verify the webhook signature for security
        event = stripe.webhooks.constructEvent(req.rawBody, signature, endpointSecret);
    } catch (err) {
        console.error(`Webhook signature verification failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        const uid = session.metadata.firebaseUID;
        const targetPlan = session.metadata.targetPlan;

        if (uid && targetPlan) {
            try {
                await db.collection("users").doc(uid).set({
                    subscription: targetPlan,
                    subscriptionStatus: 'active',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

                console.log(`User ${uid} upgraded to ${targetPlan}`);
            } catch (error) {
                console.error("Error updating Firestore:", error);
                return res.status(500).send("Internal Server Error");
            }
        }
    }

    res.json({ received: true });
});
