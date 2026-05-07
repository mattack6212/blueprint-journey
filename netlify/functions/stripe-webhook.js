const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async function (event) {
  console.log('Webhook received:', event.httpMethod, event.headers['stripe-signature'] ? '(signed)' : '(no signature)');

  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Verify Stripe signature using raw body string
  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      event.body,
      event.headers['stripe-signature'],
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Signature verification failed:', err.message);
    return { statusCode: 400, body: 'Webhook signature verification failed' };
  }

  console.log('Event type:', stripeEvent.type);

  // Ignore all event types except checkout.session.completed
  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const session = stripeEvent.data.object;

  // Extract email — prefer customer_details.email (set by Payment Links),
  // fall back to customer_email (set on older Checkout sessions)
  const email =
    (session.customer_details && session.customer_details.email) ||
    session.customer_email;

  if (!email) {
    console.error('No email found in session:', session.id);
    return { statusCode: 200, body: 'No email found — skipped' };
  }

  console.log('Inviting:', email);

  // Send Netlify Identity invite
  try {
    const res = await fetch(
      `https://api.netlify.com/api/v1/sites/${process.env.NETLIFY_SITE_ID}/identity/invite`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.NETLIFY_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ invites: [{ email }] }),
      }
    );

    if (!res.ok) {
      const text = await res.text();
      // Log but do not return 4xx — duplicate invites and other non-fatal
      // errors must not cause Stripe to retry the webhook
      console.error('Netlify invite API error:', res.status, text);
    } else {
      console.log('Invite sent successfully to:', email);
    }
  } catch (err) {
    console.error('Netlify invite request failed:', err.message);
  }

  // Always return 200 to Stripe
  return { statusCode: 200, body: 'OK' };
};
