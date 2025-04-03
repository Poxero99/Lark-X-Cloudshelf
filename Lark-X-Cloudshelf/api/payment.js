export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ success: false, message: `Method ${req.method} Not Allowed` });
  }

  try {
    let rawBody = '';
    for await (const chunk of req) {
      rawBody += chunk;
    }

    const data = JSON.parse(rawBody);
    const orderKey = data.orderKey || data.order_id || null;

    if (!orderKey) {
      return res.status(400).json({ success: false, message: 'Missing orderKey' });
    }

    const graphqlRes = await fetch('https://ingestapi.cloudshelf.ai/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: `mutation RecordPurchase($orderKey: String!, $paymentStatus: String!) {
          recordPurchase(orderKey: $orderKey, paymentStatus: $paymentStatus) {
            success
            message
          }
        }`,
        variables: {
          orderKey: orderKey,
          paymentStatus: 'paid'
        }
      })
    });

    const result = await graphqlRes.json();

    if (!result?.data?.recordPurchase?.success) {
      return res.status(500).json({
        success: false,
        message: result?.data?.recordPurchase?.message || 'Failed to mark order as paid'
      });
    }

    return res.writeHead(302, {
      Location: `/thankyou.html?orderKey=${orderKey}`
    }).end();

  } catch (error) {
    console.error("Error in /api/payment:", error);
    return res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
}