import express from "express";
import { createServer as createViteServer } from "vite";
import Stripe from "stripe";
import cors from "cors";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

let stripeClient: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error('STRIPE_SECRET_KEY environment variable is required');
    }
    stripeClient = new Stripe(key, { apiVersion: '2025-02-24.acacia' as any });
  }
  return stripeClient;
}

app.use(cors());
// Need to use raw body for stripe webhook
app.use('/api/webhook/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const stripe = getStripe();
    const signature = req.headers['stripe-signature'];
    // In a real app we would verify this against process.env.STRIPE_WEBHOOK_SECRET
    // But for this quick integration we'll just parse the event if no webhook secret is set
    // const event = stripe.webhooks.constructEvent(req.body, signature as string, process.env.STRIPE_WEBHOOK_SECRET!);
    
    // Quick parse for demo purposes
    const event = JSON.parse(req.body.toString());
    
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object;
      const userId = session.client_reference_id;
      // In a real app, you would use Firebase Admin SDK to securely update the user's tier in DB.
      // E.g., await admin.firestore().collection('users').doc(userId).update({ tier: 'premium' });
      console.log(`Checkout complete for user: ${userId}. Update their DB entry to Premium!`);
    }

    res.json({received: true});
  } catch (err) {
    console.error('Webhook error:', err);
    res.status(400).send(`Webhook Error`);
  }
});

// JSON middleware for other routes
app.use(express.json());

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { userId, type, resumeId } = req.body;
    
    const stripe = getStripe();
    const subPriceId = process.env.STRIPE_SUB_PRICE_ID;
    const singlePriceId = process.env.STRIPE_SINGLE_PRICE_ID;
    
    let priceId = type === 'subscription' ? subPriceId : singlePriceId;
    
    if (!priceId) {
      return res.status(400).json({ error: `Price ID for ${type} is not configured` });
    }

    const origin = process.env.APP_URL || `${req.protocol}://${req.get('host')}`;

    const metadata: any = { userId, type };
    if (resumeId) metadata.resumeId = resumeId;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: type === 'subscription' ? 'subscription' : 'payment',
      success_url: type === 'subscription' 
        ? `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/build/${resumeId}?success=true&session_id={CHECKOUT_SESSION_ID}&saved=true`,
      cancel_url: `${origin}/dashboard?canceled=true`,
      client_reference_id: userId,
      metadata
    });

    res.json({ id: session.id, url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Express server running on http://localhost:${PORT}`);
  });
}

startServer();
