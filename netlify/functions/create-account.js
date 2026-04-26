const { createClient } = require('@supabase/supabase-js')

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method not allowed' }
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  }

  try {
    const { userId, email, fullName, storeName } = JSON.parse(event.body)

    if (!userId || !email || !fullName || !storeName) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields' })
      }
    }

    // Create merchant
    const { data: merchant, error: merchantError } = await supabaseAdmin
      .from('merchants')
      .insert({ name: storeName, plan: 'free' })
      .select()
      .single()

    if (merchantError) throw merchantError

    // Create profile
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        id: userId,
        merchant_id: merchant.id,
        full_name: fullName,
        email,
        role: 'admin'
      })

    if (profileError) throw profileError

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, merchantId: merchant.id })
    }
  } catch (error) {
    console.error('Signup error:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message })
    }
  }
}
