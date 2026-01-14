const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { Resend } = require("resend");
const { defineSecret } = require("firebase-functions/params");

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
    .https.onRequest(async (req, res) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.set('Access-Control-Max-Age', '3600');

        if (req.method === 'OPTIONS') {
            res.status(204).send('');
            return;
        }

        if (req.method !== 'POST') {
            res.status(405).json({ error: 'Method Not Allowed' });
            return;
        }

        try {
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                res.status(401).json({ error: 'Unauthorized - Missing token' });
                return;
            }

            const idToken = authHeader.split('Bearer ')[1];
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid;
            const userEmail = decodedToken.email;

            const { plan: planType } = req.body;

            if (!['pro', 'ai'].includes(planType)) {
                res.status(400).json({ error: 'Invalid plan type' });
                return;
            }

            const priceData = {
                currency: 'brl',
                product_data: {
                    name: planType === 'pro' ? 'MasterPlan PRO' : 'MasterPlan AI Premium',
                    description: planType === 'pro'
                        ? 'Acesso ilimitado a planos e exportação sem marca d\'agua.'
                        : 'Tudo do PRO + Geração ilimitada com IA.',
                },
                unit_amount: planType === 'pro' ? 4900 : 9900,
                recurring: { interval: 'month' },
            };

            const stripe = require("stripe")(stripeSecretKey.value());
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "subscription",
                line_items: [{ price_data: priceData, quantity: 1 }],
                customer_email: userEmail,
                metadata: { firebaseUID: uid, targetPlan: planType },
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

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const uid = session.metadata.firebaseUID;
            const targetPlan = session.metadata.targetPlan;
            const customerEmail = session.customer_email;
            const amountTotal = session.amount_total;

            if (uid && targetPlan) {
                try {
                    // Update Firestore
                    await db.collection("users").doc(uid).set({
                        subscription: targetPlan,
                        subscriptionStatus: 'active',
                        updatedAt: admin.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    // Get user name from Firebase Auth
                    let userName = null;
                    try {
                        const userRecord = await admin.auth().getUser(uid);
                        userName = userRecord.displayName;
                    } catch (e) {
                        console.log("Could not get user name");
                    }

                    // Send payment confirmation email
                    const planName = targetPlan === 'pro' ? 'MasterPlan PRO' : 'MasterPlan AI Premium';
                    const resend = new Resend(resendApiKey.value());
                    await resend.emails.send({
                        from: "MasterPlan <noreply@masterplanai.com.br>",
                        to: customerEmail,
                        subject: `Pagamento Confirmado - ${planName} ✅`,
                        html: getPaymentConfirmationHtml(userName, planName, amountTotal),
                    });

                    console.log(`User ${uid} upgraded to ${targetPlan}, confirmation email sent`);
                } catch (error) {
                    console.error("Error processing webhook:", error);
                    return res.status(500).send("Internal Server Error");
                }
            }
        }

        res.json({ received: true });
    });
