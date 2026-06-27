import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const body = await req.json()
  const { email, merchant_id, created_at } = body.record ?? body

  const resendApiKey = Deno.env.get('RESEND_API_KEY')

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${resendApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'ShippingIQ <support@shippingiq.com.au>',
      to: ['support@shippingiq.com.au'],
      subject: 'New ShippingIQ Signup',
      html: `
        <h2>New ShippingIQ Signup</h2>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Merchant ID:</strong> ${merchant_id}</p>
        <p><strong>Signed up:</strong> ${created_at}</p>
      `,
    }),
  })

  if (!res.ok) {
    const error = await res.text()
    return new Response(JSON.stringify({ error }), { status: 500 })
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
