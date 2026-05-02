import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'npm:stripe@14'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') ?? '', {
    apiVersion: '2024-06-20',
  })

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const signature = req.headers.get('stripe-signature')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const body = await req.text()

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, signature ?? '', webhookSecret ?? '')
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return new Response('Webhook signature verification failed', { status: 400 })
  }

  async function updateMerchantSubscription(merchantId: string, updates: Record<string, unknown>) {
    const { data: merchant } = await supabaseAdmin
      .from('merchants')
      .select('subscription')
      .eq('id', merchantId)
      .single()

    await supabaseAdmin
      .from('merchants')
      .update({ subscription: { ...merchant?.subscription, ...updates } })
      .eq('id', merchantId)
  }

  function getTierFromPriceId(priceId: string): string {
    const priceMap: Record<string, string> = {
      [Deno.env.get('STRIPE_PRICE_PRO') ?? '']: 'pro',
    }
    return priceMap[priceId] ?? 'free'
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const merchantId = session.metadata?.merchant_id
        if (!merchantId) break
        const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
        const priceId = subscription.items.data[0]?.price.id
        const tier = session.metadata?.tier ?? getTierFromPriceId(priceId)
        await updateMerchantSubscription(merchantId, {
          tier,
          status: subscription.status,
          stripe_subscription_id: subscription.id,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          current_period_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const merchantId = subscription.metadata?.merchant_id
        if (!merchantId) break
        const priceId = subscription.items.data[0]?.price.id
        const tier = getTierFromPriceId(priceId)
        await updateMerchantSubscription(merchantId, {
          tier,
          status: subscription.status,
          trial_ends_at: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
          current_period_ends_at: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const merchantId = subscription.metadata?.merchant_id
        if (!merchantId) break
        await updateMerchantSubscription(merchantId, {
          tier: 'free',
          status: 'canceled',
          stripe_subscription_id: null,
          trial_ends_at: null,
          current_period_ends_at: null,
        })
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string
        const { data: merchants } = await supabaseAdmin
          .from('merchants')
          .select('id, subscription')
          .filter('subscription->>stripe_customer_id', 'eq', customerId)
        if (merchants?.[0]) {
          await updateMerchantSubscription(merchants[0].id, { status: 'past_due' })
        }
        break
      }

      default:
        console.log('Unhandled event type:', event.type)
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Webhook handler error:', err)
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
