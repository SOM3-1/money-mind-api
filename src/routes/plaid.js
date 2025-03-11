const express = require("express");
const axios = require("axios");
const { DateTime } = require("luxon");
const router = express.Router();
require("dotenv").config();
const { db } = require("../../firebaseConfig");

const { PLAID_API_BASE, PLAID_CLIENT_ID, PLAID_SECRET, ANDROID_PACKAGE_NAME } =
    process.env;

router.post("/create_link_token", async (req, res) => {
    console.log("is it ?")
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });
    try {
        const response = await axios.post(`${PLAID_API_BASE}/link/token/create`, {
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            user: { client_user_id: userId },
            client_name: "AI Personal Finance Manager",
            products: ["transactions"],
            country_codes: ["US"],
            language: "en",
            android_package_name: ANDROID_PACKAGE_NAME,
        });

        res.json({ link_token: response.data.link_token });
    } catch (error) {
        console.error("Error creating Plaid link token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to create link token" });
    }
});

router.post("/exchange_public_token", async (req, res) => {
    const { public_token } = req.body;
    try {
        const response = await axios.post(`${PLAID_API_BASE}/item/public_token/exchange`, {
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            public_token: public_token,
        });

        res.json({ access_token: response.data.access_token });
    } catch (error) {
        console.error("Error exchanging token:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to exchange token" });
    }
});

router.post("/get_transactions", async (req, res) => {
    const { access_token, userId } = req.body;
console.log("is it coming here?")
    if (!access_token) {
        return res.status(400).json({ error: "Missing access_token" });
    }

    const endDate = DateTime.now().toISODate();
    const startDate = DateTime.now().minus({ years: 1 }).toISODate();
    try {
        const transactionsResponse = await axios.post(`${PLAID_API_BASE}/transactions/get`, {
            client_id: PLAID_CLIENT_ID,
            secret: PLAID_SECRET,
            access_token: access_token,
            start_date: startDate,
            end_date: endDate,
        });

        const transactions = transactionsResponse.data.transactions.map((tx) => ({
            userId,
            transactionId: tx.transaction_id,
            amount: parseFloat(tx.amount.toFixed(2)),
            description: tx.name,
            date: tx.date,
            category: categorizeTransaction(tx),
        }));

        const batch = db.batch();
        transactions.forEach((tx) => {
            const txnRef = db.collection("transactions").doc(tx.transactionId);
            batch.set(txnRef, tx, { merge: true });
        });

        await batch.commit();
        res.status(200).json({ success: true });
    } catch (error) {
        console.error("Error fetching transactions:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to fetch transactions" });
    }
});


const categorizeTransaction = (transaction) => {

    if (!transaction.personal_finance_category || !transaction.personal_finance_category.primary) {
        return "Other";
    }

    const primaryCategory = transaction.personal_finance_category.primary;

    const categoryMapping = {
        "FOOD_AND_DRINK": "Food & Entertainment",
        "ENTERTAINMENT": "Food & Entertainment",
        "GENERAL_MERCHANDISE": "Shopping",
        "HOME_IMPROVEMENT": "Shopping",
        "HEALTHCARE": "Health & Wellness",
        "PERSONAL_CARE": "Health & Wellness",
        "RENT_AND_UTILITIES": "Essentials",
        "TRANSPORTATION": "Essentials",
        "GENERAL_SERVICES": "Essentials",
        "TRAVEL": "Essentials",
        "BANK_FEES": "Other",
        "LOAN_PAYMENTS": "Other",
        "TRANSFER_IN": "Other",
        "TRANSFER_OUT": "Other",
        "INCOME": "Other",
        "OTHER": "Other",
    };

    return categoryMapping[primaryCategory] || "Other";
};

module.exports = router;
