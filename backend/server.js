require('dotenv').config();

const express = require('express');
const axios = require('axios');
const cors = require('cors');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.set('trust proxy', 1);

/* -------------------------------
   0. Security headers
-------------------------------- */
try {
    const helmet = require('helmet');
    app.use(helmet({ contentSecurityPolicy: false }));
    console.log('📍 Security headers: ENABLED (helmet)');
} catch (e) {
    console.log('📍 Security headers: DISABLED (run: npm install helmet)');
}

/* -------------------------------
   1. MongoDB Connection
-------------------------------- */
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.error("❌ MongoDB Error:", err));

/* -------------------------------
   2. Transaction Schema
-------------------------------- */
const transactionSchema = new mongoose.Schema({
    name: String,
    phone: String,            // Payer's number
    recipient_phone: String,  // Recipient's number (for gifting)
    amount: String,
    bundle_sku: String,
    source: String,
    status: { type: String, default: "PENDING" },
    checkout_id: String,
    merchant_request_id: String,
    mpesa_receipt: String,
    result_code: Number,
    result_desc: String,
    retryCount: { type: Number, default: 0 },
    lastRetryAt: { type: Date, default: null },
    
    // Delivery fields
    delivered: { type: Boolean, default: false },
    delivery_status: { type: String, default: null },
    delivery_attempts: { type: Number, default: 0 },
    delivered_at: { type: Date, default: null },
    delivery_error: { type: String, default: null },
    
    createdAt: { type: Date, default: Date.now }
});

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ phone: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ checkout_id: 1 });
transactionSchema.index({ merchant_request_id: 1 });
transactionSchema.index({ delivery_status: 1, delivered: 1, createdAt: 1 });

const Transaction = mongoose.model("Transaction", transactionSchema);

/* -------------------------------
   3. CORS + BODY PARSING
-------------------------------- */
const allowedOrigins = [
    'https://bingwasoko.co.ke',
    'https://www.bingwasoko.co.ke',
    'https://datasokoni.com',
    'https://www.datasokoni.com',
    'https://fineescorts.co.ke',
    'https://www.fineescorts.co.ke',
    'https://sarahadevelopers.github.io',
    'http://localhost:3000',
    'http://localhost:5505',
    'http://127.0.0.1:5505',
    'https://fine-2zxp.onrender.com',
    'https://rentspace.co.ke',
    'https://www.rentspace.co.ke',
    'https://saraha-pay-daraja.onrender.com'
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1) return callback(null, true);
        callback(new Error('Not allowed by CORS'));
    },
    credentials: true
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* -------------------------------
   3b. Basic Auth for Admin
-------------------------------- */
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS;

const adminAuth = (req, res, next) => {
    if (!ADMIN_PASS) return next();
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Basic ')) {
        res.set('WWW-Authenticate', 'Basic realm="Sarahapay Admin"');
        return res.status(401).send('Authentication required');
    }
    const [user, pass] = Buffer.from(auth.slice(6), 'base64').toString().split(':');
    if (user === ADMIN_USER && pass === ADMIN_PASS) return next();
    res.set('WWW-Authenticate', 'Basic realm="Sarahapay Admin"');
    return res.status(401).send('Invalid credentials');
};

app.use('/admin.html', adminAuth);
app.use('/api/transactions', adminAuth);
app.use('/api/transaction', adminAuth);
app.use(express.static(path.join(__dirname, 'docs')));

/* -------------------------------
   4. Shared Secret Check
-------------------------------- */
const VALID_SECRETS = [
    process.env.API_SECRET,
    process.env.API_SECRET_BINGWA,
    process.env.API_SECRET_FINEESCORTS,
].filter(Boolean);

const checkSecret = (req, res, next) => {
    const origin = req.headers.origin || '';
    if (origin && allowedOrigins.includes(origin)) return next();

    const secret = req.headers['x-api-secret'];
    if (!secret || !VALID_SECRETS.includes(secret)) {
        return res.status(403).json({ error: "Unauthorized" });
    }
    next();
};

/* -------------------------------
   5. reCAPTCHA Verification
-------------------------------- */
const verifyRecaptcha = async (req, res, next) => {
    if (process.env.RECAPTCHA_DISABLED === 'true') return next();
    const token = req.headers['x-recaptcha-token'] || req.body.recaptchaToken;
    if (!token) return res.status(403).json({ error: "reCAPTCHA verification required" });

    try {
        const verification = await axios.post(
            'https://www.google.com/recaptcha/api/siteverify',
            null,
            { params: { secret: process.env.RECAPTCHA_SECRET, response: token }, timeout: 5000 }
        );

        const { success, score, 'error-codes': errorCodes } = verification.data;
        
        // Allow through if config error (don't block real customers)
        if (errorCodes && errorCodes.length > 0) {
            if (errorCodes.includes('invalid-input-secret')) {
                return res.status(500).json({ error: "Server misconfiguration" });
            }
            return next();
        }

        if (!success || (typeof score === 'number' && score < 0.5)) {
            return res.status(403).json({ error: "Bot detected. Please try again." });
        }
        next();
    } catch (error) {
        console.error("reCAPTCHA network error (allowing through):", error.message);
        next();
    }
};

/* -------------------------------
   6. Rate Limiting
-------------------------------- */
const globalRateLimit = (req, res, next) => next(); // Simplified for this snippet

const phoneAttempts = new Map();
const phoneLimiter = (req, res, next) => {
    const rawPhone = req.body?.phone;
    if (!rawPhone) return next();
    const phone = rawPhone.replace(/\s+/g, '').replace(/^\+/, '').replace(/^0/, '254');
    if (!/^254\d{9}$/.test(phone)) return next();

    const now = Date.now();
    const attempts = (phoneAttempts.get(phone) || []).filter(t => now - t < 60000);

    if (attempts.length >= 1) {
        return res.status(429).json({ error: `Please wait 60 seconds before trying again.` });
    }
    attempts.push(now);
    phoneAttempts.set(phone, attempts);
    next();
};

app.use('/api/pay', checkSecret, verifyRecaptcha, phoneLimiter);
app.use('/api/retry-payment', checkSecret, verifyRecaptcha, phoneLimiter);

/* -------------------------------
   7. Daraja Configuration
-------------------------------- */
const DARAJA_ENV = process.env.DARAJA_ENVIRONMENT || 'production';
const DARAJA_BASE_URL = DARAJA_ENV === 'sandbox'
    ? 'https://sandbox.safaricom.co.ke'
    : 'https://api.safaricom.co.ke';

console.log(`📍 Daraja Environment: ${DARAJA_ENV}`);
console.log(`📍 Daraja Till: ${process.env.DARAJA_TILL_NUMBER}`);

/* -------------------------------
   8. Daraja STK Push Route (/api/pay)
-------------------------------- */
app.post("/api/pay", async (req, res) => {
    try {
        const { name, phone, amount, bundle_id, bundle_sku, recipient } = req.body;
        
        if (!phone || !amount) {
            return res.status(400).json({ error: 'Phone and amount are required' });
        }

        // Format Payer
        const digits = String(phone).replace(/\D/g, '');
        const formattedPhone = digits.startsWith('254') ? digits : `254${digits.replace(/^0/, '')}`;

        // Format Recipient (If gifted, use recipient. If not, use payer)
        let formattedRecipient = recipient ? String(recipient).replace(/\D/g, '') : formattedPhone;
        if (!formattedRecipient.startsWith('254')) {
            formattedRecipient = `254${formattedRecipient.replace(/^0/, '')}`;
        }

        // Prevent double payment pending
        const lastTx = await Transaction.findOne({ phone: formattedPhone }).sort({ createdAt: -1 });
        if (lastTx && lastTx.status === "PENDING") {
            const secondsSince = (Date.now() - new Date(lastTx.createdAt).getTime()) / 1000;
            if (secondsSince > 30) {
                await Transaction.updateOne({ _id: lastTx._id }, { status: "FAILED" });
            } else {
                return res.status(409).json({ error: "You already have a pending payment. Please wait." });
            }
        }

        // Get Token
        const auth = Buffer.from(`${process.env.DARAJA_CONSUMER_KEY}:${process.env.DARAJA_CONSUMER_SECRET}`).toString('base64');
        const tokenRes = await axios.get(`${DARAJA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` }
        });
        const accessToken = tokenRes.data.access_token;

        // Generate Password & Timestamp
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(`${process.env.DARAJA_TILL_NUMBER}${process.env.DARAJA_PASSKEY}${timestamp}`).toString('base64');

        // Send STK Push
        const stkPayload = {
            BusinessShortCode: process.env.DARAJA_TILL_NUMBER,
            Password: password,
            Timestamp: timestamp,
            TransactionType: "CustomerBuyGoodsOnline",
            Amount: Math.round(parseFloat(amount)),
            PartyA: formattedPhone,
            PartyB: process.env.DARAJA_TILL_NUMBER,
            PhoneNumber: formattedPhone,
            CallBackURL: process.env.DARAJA_CALLBACK_URL,
            AccountReference: `Bundle-${bundle_id || 'order'}`,
            TransactionDesc: `Bundle for ${formattedRecipient}`
        };

        const stkRes = await axios.post(`${DARAJA_BASE_URL}/mpesa/stkpush/v1/processrequest`, stkPayload, {
            headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
        });

        const stkData = stkRes.data;

        if (stkData.ResponseCode !== '0') {
            throw new Error(stkData.ResponseDescription || 'Daraja STK push failed');
        }

        // SAVE TO MONGODB IMMEDIATELY AS PENDING
        const tx = new Transaction({
            name: name || 'Daraja Payment',
            phone: formattedPhone,
            recipient_phone: formattedRecipient,
            amount: parseFloat(amount).toFixed(2),
            bundle_sku: bundle_sku || 'unknown',
            checkout_id: stkData.CheckoutRequestID,
            merchant_request_id: stkData.MerchantRequestID,
            status: 'PENDING',
            source: 'datasokoni-web'
        });
        await tx.save();

        res.status(201).json({
            message: "STK Push Sent",
            transactionId: tx._id
        });

    } catch (error) {
        console.error("STK Push Error:", error.message);
        res.status(500).json({ error: "Failed to initiate payment", details: error.message });
    }
});

/* -------------------------------
   9. Daraja Callback Route (/callback)
-------------------------------- */
app.post("/callback", async (req, res) => {
    // Respond to Safaricom immediately so they don't retry
    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });

    try {
        const cb = req.body?.Body?.stkCallback;
        if (!cb) return;

        const checkoutId = cb.CheckoutRequestID;
        const resultCode = cb.ResultCode;
        const resultDesc = cb.ResultDesc;

        const items = cb.CallbackMetadata?.Item || [];
        const getItem = (name) => items.find((i) => i.Name === name)?.Value;

        const receipt = getItem('MpesaReceiptNumber');
        const amountPaid = getItem('Amount');

        const transaction = await Transaction.findOne({ checkout_id: checkoutId });
        if (!transaction) {
            console.error(`❌ No transaction found for CheckoutRequestID: ${checkoutId}`);
            return;
        }

        if (resultCode !== 0) {
            transaction.status = 'FAILED';
            transaction.result_code = resultCode;
            transaction.result_desc = resultDesc;
            await transaction.save();
            console.log(`❌ Payment failed [${checkoutId}]: ${resultDesc}`);
            return;
        }

        // Payment Success
        transaction.status = 'SUCCESS';
        transaction.result_code = resultCode;
        transaction.result_desc = resultDesc;
        transaction.mpesa_receipt = receipt;
        transaction.delivery_status = 'PENDING'; // Flags it for dashboard/Automate
        await transaction.save();

        console.log(`\n✅ SUCCESS! Payment received for ${transaction.recipient_phone}`);
        console.log(`Receipt: ${receipt} | Amount: KES ${amountPaid}`);
        console.log(`Check your admin dashboard to deliver the bundle.\n`);

    } catch (err) {
        console.error('Callback error:', err);
    }
});

/* -------------------------------
   10. Admin Dashboard Routes
-------------------------------- */
app.get("/api/transactions", async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
        
        const skip = (page - 1) * limit;
        const [total, transactions] = await Promise.all([
            Transaction.countDocuments(),
            Transaction.find().sort({ createdAt: -1 }).skip(skip).limit(limit).lean()
        ]);

        res.json({
            data: transactions,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
        });
    } catch (error) {
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});

/* -------------------------------
   11. Start Server
-------------------------------- */
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${DARAJA_ENV}`);
});