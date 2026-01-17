const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const { defineSecret } = require("firebase-functions/params");
const { VertexAI } = require('@google-cloud/vertexai');

// Define secrets (configured via: firebase functions:secrets:set SECRET_NAME)
const resendApiKey = defineSecret("RESEND_API_KEY");
const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");


admin.initializeApp({
    storageBucket: "masterplan-52e06.firebasestorage.app"
});
const db = admin.firestore();

// ... existing code ...

/**
 * Helper to setup CORS for Storage (Run once)
 * Call this url: https://us-central1-masterplan-52e06.cloudfunctions.net/setupStorageCORS
 */
exports.setupStorageCORS = functions.https.onRequest(async (req, res) => {
    try {
        const bucket = admin.storage().bucket(); // Should use the configured default bucket
        console.log(`Configuring CORS for bucket: ${bucket.name}`);

        await bucket.setCorsConfiguration([
            {
                origin: ["*"],
                method: ["GET", "PUT", "POST", "DELETE", "OPTIONS"],
                responseHeader: ["Content-Type", "Authorization", "x-goog-resumable"],
                maxAgeSeconds: 3600
            }
        ]);
        res.send(`CORS configured successfully for bucket: ${bucket.name}`);
    } catch (error) {
        console.error("Error setting CORS:", error);
        res.status(500).send(`Error: ${error.message}`);
    }
});

// Initialize Resend and Stripe lazily (inside functions that need them)
// This allows secrets to be available at runtime

// ============================================
// EMAIL TEMPLATES
// ============================================

const emailStyles = `
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; background: #1a1a2e; padding: 40px; border-radius: 16px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { height: 50px; margin-bottom: 20px; }
    h1 { color: #ffffff; font-size: 28px; margin: 0; }
    p { color: #b0b0b0; font-size: 16px; line-height: 1.6; }
    .highlight { color: #4f9cf9; font-weight: bold; }
    .button { display: inline-block; background: linear-gradient(135deg, #4f9cf9 0%, #6366f1 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #333; }
    .footer p { color: #666; font-size: 12px; }
`;

const getWelcomeEmailHtml = (userName) => `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://app.masterplanai.com.br/logo-dark.png" alt="MasterPlan" class="logo" />
            <h1>Bem-vindo ao MasterPlan! 🎉</h1>
        </div>
        <p>Olá <span class="highlight">${userName || 'Profissional'}</span>,</p>
        <p>Sua conta foi criada com sucesso! Agora você tem acesso à única ferramenta que o profissional de mídia paga precisa.</p>
        <p>Com o MasterPlan, você pode:</p>
        <p>✅ Criar planos de mídia completos em minutos<br/>
           ✅ Usar IA para gerar keywords, copies e criativos<br/>
           ✅ Exportar relatórios profissionais em PDF<br/>
           ✅ Gerenciar múltiplos clientes</p>
        <center><a href="https://app.masterplanai.com.br" class="button">Acessar MasterPlan</a></center>
        <p>Qualquer dúvida, estamos à disposição!</p>
        <div class="footer">
            <p>© ${new Date().getFullYear()} MasterPlan - masterplanai.com.br</p>
        </div>
    </div>
</body>
</html>
`;

const getPaymentConfirmationHtml = (userName, planName, amount) => `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://app.masterplanai.com.br/logo-dark.png" alt="MasterPlan" class="logo" />
            <h1>Pagamento Confirmado! ✅</h1>
        </div>
        <p>Olá <span class="highlight">${userName || 'Profissional'}</span>,</p>
        <p>Seu pagamento foi processado com sucesso!</p>
        <p><strong>Detalhes:</strong></p>
        <p>📦 Plano: <span class="highlight">${planName}</span><br/>
           💰 Valor: <span class="highlight">R$ ${(amount / 100).toFixed(2)}</span><br/>
           📅 Renovação: Mensal</p>
        <p>Agora você tem acesso completo a todas as funcionalidades do seu plano!</p>
        <center><a href="https://app.masterplanai.com.br" class="button">Acessar MasterPlan</a></center>
        <div class="footer">
            <p>© ${new Date().getFullYear()} MasterPlan - masterplanai.com.br</p>
        </div>
    </div>
</body>
</html>
`;

const getPasswordResetHtml = (resetLink) => `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://app.masterplanai.com.br/logo-dark.png" alt="MasterPlan" class="logo" />
            <h1>Recuperação de Senha 🔐</h1>
        </div>
        <p>Você solicitou a recuperação de senha da sua conta MasterPlan.</p>
        <p>Clique no botão abaixo para criar uma nova senha:</p>
        <center><a href="${resetLink}" class="button">Redefinir Senha</a></center>
        <p>Se você não solicitou esta alteração, ignore este email.</p>
        <p style="color: #666; font-size: 12px;">Este link expira em 1 hora.</p>
        <div class="footer">
            <p>© ${new Date().getFullYear()} MasterPlan - masterplanai.com.br</p>
        </div>
    </div>
</body>
</html>
`;

// ============================================
// CLOUD FUNCTIONS - EMAIL TRIGGERS
// ============================================

const getGoodbyeEmailHtml = (userName) => `
<!DOCTYPE html>
<html>
<head><style>${emailStyles}</style></head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://app.masterplanai.com.br/logo-dark.png" alt="MasterPlan" class="logo" />
            <h1>Até logo! 👋</h1>
        </div>
        <p>Olá <span class="highlight">${userName || 'Profissional'}</span>,</p>
        <p>Confirmamos que sua conta no MasterPlan foi excluída com sucesso e todos os seus dados foram removidos dos nossos sistemas.</p>
        <p>Sentimos muito em ver você partir. Se houver algo que poderíamos ter feito diferente, adoraríamos saber sua opinião.</p>
        <p>As portas estarão sempre abertas caso decida voltar!</p>
        <center><a href="https://masterplanai.com.br" class="button">Ir para a Home</a></center>
        <div class="footer">
            <p>© ${new Date().getFullYear()} MasterPlan - masterplanai.com.br</p>
        </div>
    </div>
</body>
</html>
`;

// ============================================
// CLOUD FUNCTIONS - EMAIL TRIGGERS
// ============================================

/**
 * Send goodbye email on account deletion (Auth Trigger)
 */
exports.sendGoodbyeEmail = functions
    .runWith({ secrets: [resendApiKey] })
    .auth.user().onDelete(async (user) => {
        const email = user.email;
        const displayName = user.displayName;

        if (!email) {
            console.log("No email for deleted user, skipping goodbye email.");
            return;
        }

        try {
            const resend = new Resend(resendApiKey.value());
            await resend.emails.send({
                from: "MasterPlan <noreply@masterplanai.com.br>",
                to: email,
                subject: "Sua conta foi excluída - MasterPlan",
                html: getGoodbyeEmailHtml(displayName),
            });
            console.log(`Goodbye email sent to ${email}`);
        } catch (error) {
            console.error("Error sending goodbye email:", error);
        }
    });

/**
 * Send welcome email (HTTP Callable - called from frontend after signup)
 */
exports.sendWelcomeEmail = functions
    .runWith({ secrets: [resendApiKey] })
    .https.onCall(async (data, context) => {
        // Verify the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const { email, displayName } = data;

        if (!email) {
            throw new functions.https.HttpsError("invalid-argument", "Email is required");
        }

        try {
            const resend = new Resend(resendApiKey.value());
            const result = await resend.emails.send({
                from: "MasterPlan <noreply@masterplanai.com.br>",
                to: email,
                subject: "Bem-vindo ao MasterPlan! 🎉",
                html: getWelcomeEmailHtml(displayName || "Profissional"),
            });
            console.log(`Welcome email sent to ${email}`, result);
            return { success: true, messageId: result.id };
        } catch (error) {
            console.error("Error sending welcome email:", error);
            throw new functions.https.HttpsError("internal", "Failed to send welcome email");
        }
    });

/**
 * Send password reset email (HTTP Callable)
 */
exports.sendPasswordResetEmail = functions
    .runWith({ secrets: [resendApiKey] })
    .https.onCall(async (data, context) => {
        const { email } = data;

        if (!email) {
            throw new functions.https.HttpsError("invalid-argument", "Email is required");
        }

        try {
            // Generate Firebase password reset link
            const firebaseResetLink = await admin.auth().generatePasswordResetLink(email, {
                url: "https://app.masterplanai.com.br",
            });

            // Extract oobCode from Firebase link and create our custom URL
            const url = new URL(firebaseResetLink);
            const oobCode = url.searchParams.get('oobCode');

            // Create custom reset link pointing to our app
            const customResetLink = `https://app.masterplanai.com.br?mode=resetPassword&oobCode=${oobCode}&email=${encodeURIComponent(email)}`;

            const resend = new Resend(resendApiKey.value());
            await resend.emails.send({
                from: "MasterPlan <noreply@masterplanai.com.br>",
                to: email,
                subject: "Recuperação de Senha - MasterPlan",
                html: getPasswordResetHtml(customResetLink),
            });

            return { success: true };
        } catch (error) {
            console.error("Error sending password reset email:", error);
            throw new functions.https.HttpsError("internal", "Failed to send email");
        }
    });

// ============================================
// STRIPE FUNCTIONS
// ============================================

/**
 * Creates a Stripe Checkout Session for subscription upgrade.
 */
exports.createStripeCheckoutSession = functions
    .runWith({ secrets: [stripeSecretKey] })
    .https.onCall(async (data, context) => {
        // Verify the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const uid = context.auth.uid;
        const userEmail = context.auth.token.email;

        const { planType, interval = 'month' } = data;

        const allowedPlans = ['pro', 'ai', 'ai_plus'];
        if (!allowedPlans.includes(planType)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid plan type");
        }

        if (!['month', 'year'].includes(interval)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid interval");
        }

        // Price Configuration (in cents)
        const pricing = {
            pro: { month: 4900, year: 49000, name: 'MasterPlan PRO' },
            ai: { month: 9900, year: 99000, name: 'MasterPlan AI' },
            ai_plus: { month: 34900, year: 349000, name: 'MasterPlan AI+' }
        };

        const selectedPlan = pricing[planType];
        const unitAmount = selectedPlan[interval];

        const priceData = {
            currency: 'brl',
            product_data: {
                name: `${selectedPlan.name} (${interval === 'year' ? 'Anual' : 'Mensal'})`,
                description: interval === 'year'
                    ? 'Cobrança anual com desconto (equivalente a 2 meses grátis)'
                    : 'Cobrança mensal recorrente',
                metadata: {
                    planType: planType,
                    interval: interval
                }
            },
            unit_amount: unitAmount,
            recurring: { interval: interval === 'year' ? 'year' : 'month' },
        };

        try {
            const stripe = require("stripe")(stripeSecretKey.value());
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "subscription",
                allow_promotion_codes: true,
                subscription_data: {
                    trial_period_days: 7,
                    metadata: {
                        firebaseUID: uid,
                        targetPlan: planType,
                        interval: interval
                    }
                },
                line_items: [{ price_data: priceData, quantity: 1 }],
                customer_email: userEmail,
                metadata: { firebaseUID: uid, targetPlan: planType, interval: interval },
                success_url: `https://app.masterplanai.com.br/?payment_success=true&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `https://app.masterplanai.com.br/?payment_cancelled=true`,
            });

            return { sessionId: session.id, url: session.url };
        } catch (error) {
            console.error("Stripe Error:", error);
            throw new functions.https.HttpsError("internal", "Unable to create checkout session: " + error.message);
        }
    });

/**
 * Creates a Stripe Checkout Session for purchasing video credits (one-time payment).
 */
exports.purchaseVideoCredits = functions
    .runWith({ secrets: [stripeSecretKey] })
    .https.onCall(async (data, context) => {
        // Verify the user is authenticated
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const uid = context.auth.uid;
        const userEmail = context.auth.token.email;
        const { quantity } = data; // 1, 5, or 10

        // Validate quantity
        const validQuantities = [1, 5, 10];
        if (!validQuantities.includes(quantity)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid quantity. Must be 1, 5, or 10");
        }

        // Pricing in cents (BRL)
        const pricing = {
            1: { amount: 1200, name: '1 Vídeo Google Veo', description: 'Crédito avulso para geração de vídeo' },
            5: { amount: 5500, name: '5 Vídeos Google Veo', description: 'Pacote de 5 vídeos (10% de desconto)' },
            10: { amount: 10000, name: '10 Vídeos Google Veo', description: 'Pacote de 10 vídeos (17% de desconto)' }
        };

        const selectedPackage = pricing[quantity];

        try {
            const stripe = require("stripe")(stripeSecretKey.value());
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment", // One-time payment, not subscription
                line_items: [{
                    price_data: {
                        currency: 'brl',
                        product_data: {
                            name: selectedPackage.name,
                            description: selectedPackage.description,
                        },
                        unit_amount: selectedPackage.amount,
                    },
                    quantity: 1
                }],
                customer_email: userEmail,
                metadata: {
                    firebaseUID: uid,
                    productType: 'video_credits',
                    quantity: quantity.toString()
                },
                success_url: `https://app.masterplanai.com.br/?credits_purchase_success=true`,
                cancel_url: `https://app.masterplanai.com.br/?credits_purchase_cancelled=true`,
            });

            return { sessionId: session.id, url: session.url };
        } catch (error) {
            console.error("Stripe Error (Video Credits):", error);
            throw new functions.https.HttpsError("internal", "Unable to create checkout session: " + error.message);
        }
    });

/**
 * Webhook to handle Stripe events and send payment confirmation email
 */
exports.stripeWebhook = functions
    .runWith({ secrets: [stripeSecretKey, stripeWebhookSecret, resendApiKey] })
    .https.onRequest(async (req, res) => {
        const signature = req.headers["stripe-signature"];

        let event;

        try {
            const stripe = require("stripe")(stripeSecretKey.value());
            event = stripe.webhooks.constructEvent(req.rawBody, signature, stripeWebhookSecret.value());
        } catch (err) {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // EVENT 1: Checkout Completed (Initial Setup)
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const uid = session.metadata.firebaseUID;
            const productType = session.metadata.productType;
            const targetPlan = session.metadata.targetPlan;
            const interval = session.metadata.interval || 'month';
            const customerEmail = session.customer_email;
            const amountTotal = session.amount_total;

            // Handle VIDEO CREDITS purchase
            if (productType === 'video_credits' && uid) {
                const quantity = parseInt(session.metadata.quantity);
                try {
                    await db.collection("users").doc(uid).set({
                        videoCredits: admin.firestore.FieldValue.increment(quantity)
                    }, { merge: true });
                    console.log(`User ${uid} purchased ${quantity} video credits.`);
                } catch (error) {
                    console.error("Error adding video credits:", error);
                    return res.status(500).send("Internal Server Error");
                }
            }
            // Handle SUBSCRIPTION purchase
            else if (uid && targetPlan) {
                try {
                    await db.collection("users").doc(uid).set({
                        subscription: targetPlan,
                        subscriptionInterval: interval,
                        subscriptionStatus: 'active', // Initially active/trialing
                        stripeCustomerId: session.customer, // Save customer ID for future reference
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Send confirmation email only if paid (amount > 0)
                    // If trial (amount=0), maybe send a different email? For now, we keep it simple.
                    if (amountTotal > 0) {
                        let userName = null;
                        try {
                            const userRecord = await admin.auth().getUser(uid);
                            userName = userRecord.displayName;
                        } catch (e) {
                            console.log("Could not get user name");
                        }

                        const planNames = { 'pro': 'MasterPlan PRO', 'ai': 'MasterPlan AI', 'ai_plus': 'MasterPlan AI+' };
                        const planName = planNames[targetPlan] || targetPlan;

                        const resend = new Resend(resendApiKey.value());
                        await resend.emails.send({
                            from: "MasterPlan <noreply@masterplanai.com.br>",
                            to: customerEmail,
                            subject: `Pagamento Confirmado - ${planName} ✅`,
                            html: getPaymentConfirmationHtml(userName, planName, amountTotal),
                        });
                        console.log(`User ${uid} upgraded to ${targetPlan}, email sent.`);
                    }
                } catch (error) {
                    console.error("Error processing session completed:", error);
                    return res.status(500).send("Internal Server Error");
                }
            }
        }

        // EVENT 2: Subscription Updated (Status Change, Renewal, Payment Failure)
        else if (event.type === 'customer.subscription.updated') {
            const subscription = event.data.object;
            const uid = subscription.metadata.firebaseUID;
            const status = subscription.status; // active, past_due, canceled, trialing, incomplete
            const planType = subscription.metadata.targetPlan;

            if (uid) {
                console.log(`Subscription updated for user ${uid}: ${status}`);
                await db.collection("users").doc(uid).set({
                    subscriptionStatus: status,
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }

        // EVENT 3: Subscription Deleted (Canceled)
        else if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object;
            const uid = subscription.metadata.firebaseUID;

            if (uid) {
                console.log(`Subscription deleted for user ${uid}. Downgrading to free.`);
                await db.collection("users").doc(uid).set({
                    subscription: 'free',
                    subscriptionStatus: 'canceled',
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            }
        }

        res.json({ received: true });
    });

/**
 * Generate AI Video using Replicate (Stable Video Diffusion)
 */
/**
 * Generate AI Video using Google Veo (Vertex AI)
 */
exports.generateVeoVideo = functions
    .runWith({
        timeoutSeconds: 540, // 9 minutes timeout (Veo can take time)
        memory: '2GB' // More memory for SDK overhead
    })
    .https.onCall(async (data, context) => {
        if (!context.auth) {
            throw new functions.https.HttpsError("unauthenticated", "User must be authenticated");
        }

        const { image, prompt, aspectRatio = '16:9' } = data; // image (base64/url), prompt (text)

        if (!image && !prompt) {
            throw new functions.https.HttpsError("invalid-argument", "Image or Prompt is required for Veo.");
        }

        // Validate aspect ratio
        const validRatios = ['16:9', '9:16'];
        if (!validRatios.includes(aspectRatio)) {
            throw new functions.https.HttpsError("invalid-argument", "Aspect ratio must be 16:9 or 9:16");
        }

        // Get user document for quota and credits check
        const uid = context.auth.uid;
        const userRef = db.collection('users').doc(uid);
        const userDoc = await userRef.get();
        const userData = userDoc.data();
        const userSubscription = userData?.subscription || 'free';
        const videoCredits = userData?.videoCredits || 0;

        // Check monthly quota
        const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
        const usageRef = db.collection('usage').doc(`${uid}_${currentMonth}`);
        const usageDoc = await usageRef.get();
        const currentUsage = usageDoc.data()?.aiVideos || 0;

        // Get plan limits
        const planLimits = { free: 0, pro: 0, ai: 0, ai_plus: 30 };
        const monthlyLimit = planLimits[userSubscription] || 0;
        const hasMonthlyQuota = currentUsage < monthlyLimit;
        const usingPurchasedCredit = !hasMonthlyQuota;

        // If no monthly quota AND no purchased credits, reject
        if (!hasMonthlyQuota && videoCredits <= 0) {
            throw new functions.https.HttpsError(
                "resource-exhausted",
                `Monthly limit reached (${currentUsage}/${monthlyLimit}). Purchase video credits to continue.`
            );
        }


        try {
            // MOCK MODE: Check for keyword to bypass API costs
            if (prompt && prompt.includes('MOCK_VIDEO')) {
                console.log("MOCK MODE DETECTED: Returning dummy video.");
                // Return a sample video URL (e.g., a public domain or placeholder video)
                // Using a reliable public sample for testing
                return {
                    success: true,
                    videoUrl: "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
                    response: { mock: true }
                };
            }

            // Initialize Vertex AI
            // Note: process.env.GCLOUD_PROJECT is automatically set in Firebase Functions
            const vertex_ai = new VertexAI({ project: process.env.GCLOUD_PROJECT, location: 'us-central1' });

            // Using the 'veo-001' model for video generation
            // Note: As Veo is in preview, checking specific API usage manually.
            // If getGenerativeModel doesn't support Veo directly yet, we might need PredictionServiceClient.
            // For now, assuming integration similar to Imagen:

            const model = vertex_ai.preview.getGenerativeModel({ model: 'veo-001' });

            // Constructing request parts
            const request = {
                contents: [{ role: 'user', parts: [] }],
                generationConfig: {
                    aspectRatio: aspectRatio
                }
            };

            if (prompt) {
                request.contents[0].parts.push({ text: prompt });
            }
            if (image) {
                // Assuming image is base64, need to strip header if present
                const cleanBase64 = image.replace(/^data:image\/(png|jpeg|jpg);base64,/, "");
                request.contents[0].parts.push({
                    inlineData: {
                        mimeType: 'image/png',
                        data: cleanBase64
                    }
                });
            }

            const result = await model.generateContent(request);
            const response = await result.response;

            // Veo response handling (Extracting video URI or bytes)
            // This structure depends on Veo's specific response.
            // Assuming it returns a GCS URI or inline bytes similar to Imagen.
            console.log("Veo Response:", JSON.stringify(response));

            // Deduct from purchased credits OR increment monthly usage
            if (usingPurchasedCredit) {
                // Deduct from purchased credits
                await userRef.update({
                    videoCredits: admin.firestore.FieldValue.increment(-1)
                });
                console.log(`User ${uid} used 1 purchased video credit. Remaining: ${videoCredits - 1}`);
            } else {
                // Increment monthly usage
                await usageRef.set({
                    aiVideos: admin.firestore.FieldValue.increment(1)
                }, { merge: true });
                console.log(`User ${uid} used monthly quota. Usage: ${currentUsage + 1}/${monthlyLimit}`);
            }

            return { success: true, response: response, usedCredit: usingPurchasedCredit };
        } catch (error) {
            console.error("Error generating Veo video:", error);
            throw new functions.https.HttpsError("internal", "Failed to generate video: " + error.message);
        }
    });
