// ─────────────────────────────────────────────
// Daraja STK Push — Buy Goods (CustomerBuyGoodsOnline)
// ─────────────────────────────────────────────
const pendingCheckouts = new Map();

async function getDarajaToken() {
    const baseUrl = process.env.DARAJA_ENVIRONMENT === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

    const auth = Buffer.from(
        `${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`
    ).toString('base64');

    const res = await fetch(`${baseUrl}/oauth/v1/generate?grant_type=client_credentials`, {
        headers: { Authorization: `Basic ${auth}` }
    });

    if (!res.ok) throw new Error(`Daraja auth failed: ${res.status} ${await res.text()}`);
    const data = await res.json();
    return { token: data.access_token, baseUrl };
}

function getDarajaTimestamp() {
    const d = new Date();
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

app.post('/api/checkout', async (req, res) => {
    try {
        const { phoneNumber, amount, recipientNumber, bundleId } = req.body;
        if (!phoneNumber || !amount) {
            return res.status(400).json({ error: 'phoneNumber and amount required' });
        }

        const digits = String(phoneNumber).replace(/\D/g, '');
        const formattedPhone = digits.startsWith('254')
            ? digits
            : `254${digits.replace(/^0/, '')}`;

        const till = process.env.DARAJA_TILL_NUMBER;
        const { token, baseUrl } = await getDarajaToken();
        const timestamp = getDarajaTimestamp();
        const password = Buffer.from(
            `${till}${process.env.DARAJA_PASSKEY}${timestamp}`
        ).toString('base64');

        const payload = {
            BusinessShortCode: till,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerBuyGoodsOnline',
            Amount: Math.ceil(Number(amount)),
            PartyA: formattedPhone,
            PartyB: till,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.DARAJA_CALLBACK_URL,
            AccountReference: `Bundle-${bundleId || 'order'}`,
            TransactionDesc: `Bundle for ${recipientNumber || formattedPhone}`
        };

        console.log('STK payload:', { ...payload, Password: '***' });

        const stkRes = await fetch(`${baseUrl}/mpesa/stkpush/v1/processrequest`, {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const stkData = await stkRes.json();
        console.log('STK response:', stkData);

        if (stkData.ResponseCode === '0') {
            pendingCheckouts.set(stkData.CheckoutRequestID, {
                recipientNumber: recipientNumber || formattedPhone,
                bundleId: bundleId || 'unknown',
                amount: Number(amount),
                createdAt: Date.now()
            });
            return res.json({
                status: 'pending',
                message: 'STK push sent to customer',
                checkoutRequestId: stkData.CheckoutRequestID
            });
        }

        return res.status(400).json({ status: 'failed', error: stkData });
    } catch (err) {
        console.error('Checkout error:', err);
        res.status(500).json({ error: err.message });
    }
});

app.post('/api/mpesa-callback', async (req, res) => {
    try {
        const { Body } = req.body;
        if (!Body || !Body.stkCallback) {
            return res.status(400).json({ error: 'Invalid callback payload' });
        }

        const cb = Body.stkCallback;
        const checkoutId = cb.CheckoutRequestID;

        if (cb.ResultCode !== 0) {
            console.log(`❌ Payment failed [${checkoutId}]: ${cb.ResultDesc}`);
            pendingCheckouts.delete(checkoutId);
            return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        const items = cb.CallbackMetadata?.Item || [];
        const getItem = (name) => items.find((i) => i.Name === name)?.Value;

        const receipt = getItem('MpesaReceiptNumber');
        const amountPaid = getItem('Amount');
        const payerPhone = getItem('PhoneNumber');
        const pending = pendingCheckouts.get(checkoutId);

        if (!pending) {
            console.log(`⚠️ Unknown checkout ${checkoutId}`);
            return res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
        }

        console.log(`💰 KES ${amountPaid} from ${payerPhone} (receipt ${receipt})`);
        console.log(`📦 Dispatching ${pending.bundleId} to ${pending.recipientNumber}`);

        await triggerBundleDelivery(pending.recipientNumber, pending.bundleId, amountPaid);
        pendingCheckouts.delete(checkoutId);

        res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    } catch (err) {
        console.error('Callback error:', err);
        res.status(500).json({ error: err.message });
    }
});