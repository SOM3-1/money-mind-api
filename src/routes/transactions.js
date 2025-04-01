const express = require("express");
const { db } = require("../../firebaseConfig");
const {safeAmount} =  require("../helper/safeAmount")

const router = express.Router();

// Create a transaction & update budget-transactions
// router.post("/", async (req, res) => {
//   try {
//     const { transactions } = req.body; // Expecting an array of transaction objects

//     if (!Array.isArray(transactions) || transactions.length === 0) {
//       return res.status(400).json({ error: "Transactions array is required" });
//     }

//     const batch = db.batch();
//     const budgetUpdates = {}; 

//     for (const txn of transactions) {
//       const { userId, transactionId, amount, description, date, category } = txn;

//       if (!userId || !transactionId || !amount || !description || !date || !category) {
//         return res.status(400).json({ error: "Missing required fields in transaction" });
//       }

//       const transactionRef = db.collection("transactions").doc(transactionId);
//       batch.set(transactionRef, { userId, amount, description, date, category });

//       const budgetsSnapshot = await db.collection("budgets")
//         .where("userId", "==", userId)
//         .where("fromDate", "<=", date)
//         .where("toDate", ">=", date)
//         .get();

//       if (!budgetsSnapshot.empty) {
//         const budgetId = budgetsSnapshot.docs[0].id;
//         const budgetTxnRef = db.collection("budget-transactions").doc(budgetId);

//         if (!budgetUpdates[budgetId]) {
//           const budgetTxnDoc = await budgetTxnRef.get();
//           budgetUpdates[budgetId] = budgetTxnDoc.exists ? budgetTxnDoc.data().categoryTotals : {};
//         }
//         budgetUpdates[budgetId][category] = (budgetUpdates[budgetId][category] || 0) + amount;
//       }
//     }

//     await batch.commit();

//     const budgetTxnBatch = db.batch();
//     for (const [budgetId, categoryTotals] of Object.entries(budgetUpdates)) {
//       const budgetTxnRef = db.collection("budget-transactions").doc(budgetId);
//       budgetTxnBatch.set(budgetTxnRef, { categoryTotals }, { merge: true });
//     }

//     await budgetTxnBatch.commit();

//     res.status(201).json({ message: "Transactions added successfully and budgets updated" });
//   } catch (error) {
//     res.status(500).json({ error: error.message });
//   }
// });


/**
 * @swagger
 * /transactions:
 *   post:
 *     summary: Add multiple transactions
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               transactions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     userId:
 *                       type: string
 *                     transactionId:
 *                       type: string
 *                     amount:
 *                       type: number
 *                     description:
 *                       type: string
 *                     date:
 *                       type: string
 *                     category:
 *                       type: string
 *     responses:
 *       201:
 *         description: Transactions added successfully
 *       400:
 *         description: Invalid request body
 */
router.post("/", async (req, res) => {
    try {
        const { transactions } = req.body;

        if (!Array.isArray(transactions) || transactions.length === 0) {
            return res.status(400).json({ error: "Transactions array is required" });
        }

        const batch = db.batch();
        const budgetUpdates = {};

        for (const txn of transactions) {
            const { userId, transactionId, amount, description, date, category } = txn;

            if (!userId || !transactionId || !amount || !description || !date || !category) {
                return res.status(400).json({ error: `Missing required fields in transaction: ${JSON.stringify(txn)}` });
            }

            const transactionRef = db.collection("transactions").doc(transactionId);

            batch.set(transactionRef, { userId, amount: safeAmount(amount), description, date, category }, { merge: true });

            const budgetsSnapshot = await db.collection("budgets")
                .where("userId", "==", userId)
                .where("fromDate", "<=", date)
                .where("toDate", ">=", date)
                .get();

            if (!budgetsSnapshot.empty) {
                const budgetId = budgetsSnapshot.docs[0].id;
                const budgetTxnRef = db.collection("budget-transactions").doc(budgetId);

                if (!budgetUpdates[budgetId]) {
                    const budgetTxnDoc = await budgetTxnRef.get();
                    budgetUpdates[budgetId] = budgetTxnDoc.exists ? budgetTxnDoc.data().categoryTotals : {};
                }

                budgetUpdates[budgetId][category] = safeAmount(
                    (budgetUpdates[budgetId][category] || 0) + amount);
            }
        }

        await batch.commit();

        const budgetTxnBatch = db.batch();
        for (const [budgetId, categoryTotals] of Object.entries(budgetUpdates)) {
            const budgetTxnRef = db.collection("budget-transactions").doc(budgetId);
            budgetTxnBatch.set(budgetTxnRef, { categoryTotals }, { merge: true });
        }

        await budgetTxnBatch.commit();

        res.status(201).json({ message: "Transactions synced successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update a transaction category
/**
 * @swagger
 * /transactions/{transactionId}:
 *   patch:
 *     summary: Update a transaction's category
 *     description: Allows the user to update the category of a specific transaction.
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         example: "txn_001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               category:
 *                 type: string
 *                 example: "Health & Wellness"
 *     responses:
 *       200:
 *         description: Transaction updated successfully
 *       404:
 *         description: Transaction not found
 */
router.patch("/:transactionId", async (req, res) => {
    try {
        const { transactionId } = req.params;
        const { category } = req.body;
        if (!category) return res.status(400).json({ error: "Missing category" });

        const transactionDoc = await db.collection("transactions").doc(transactionId).get();
        if (!transactionDoc.exists) return res.status(404).json({ error: "Transaction not found" });

        const txnData = transactionDoc.data();
        await db.collection("transactions").doc(transactionId).update({ category });
        const txnAmount = safeAmount(txnData.amount);


        // Update budget-transactions
        const budgetsSnapshot = await db.collection("budgets")
            .where("userId", "==", txnData.userId)
            .where("fromDate", "<=", txnData.date)
            .where("toDate", ">=", txnData.date)
            .get();

        if (!budgetsSnapshot.empty) {
            const budgetId = budgetsSnapshot.docs[0].id;
            const budgetTxnRef = db.collection("budget-transactions").doc(budgetId);
            const budgetTxnDoc = await budgetTxnRef.get();
            if (budgetTxnDoc.exists) {
                const categoryTotals = budgetTxnDoc.data().categoryTotals;
                categoryTotals[txnData.category] = safeAmount((categoryTotals[txnData.category] || 0) - txnAmount);
                categoryTotals[category] = safeAmount((categoryTotals[category] || 0) + txnAmount);
                await budgetTxnRef.update({ categoryTotals });
            }
        }

        res.status(200).json({ message: "Transaction updated successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete a transaction
/**
 * @swagger
 * /transactions/{transactionId}:
 *   delete:
 *     summary: Delete a transaction
 *     description: Removes a transaction and updates the associated budget.
 *     parameters:
 *       - in: path
 *         name: transactionId
 *         required: true
 *         schema:
 *           type: string
 *         example: "txn_001"
 *     responses:
 *       200:
 *         description: Transaction deleted successfully
 *       404:
 *         description: Transaction not found
 */
router.delete("/:transactionId", async (req, res) => {
    try {
        const { transactionId } = req.params;
        const transactionDoc = await db.collection("transactions").doc(transactionId).get();
        if (!transactionDoc.exists) return res.status(404).json({ error: "Transaction not found" });

        const { userId, amount, date, category } = transactionDoc.data();
        const txnAmount = safeAmount(amount);
        await db.collection("transactions").doc(transactionId).delete();

        // Update budget-transactions
        const budgetsSnapshot = await db.collection("budgets")
            .where("userId", "==", userId)
            .where("fromDate", "<=", date)
            .where("toDate", ">=", date)
            .get();

        if (!budgetsSnapshot.empty) {
            const budgetId = budgetsSnapshot.docs[0].id;
            const budgetTxnRef = db.collection("budget-transactions").doc(budgetId);
            const categoryTotals = (await budgetTxnRef.get()).data().categoryTotals;
            categoryTotals[category] = safeAmount((categoryTotals[category] || 0) - txnAmount);
            await budgetTxnRef.update({ categoryTotals });
        }

        res.status(200).json({ message: "Transaction deleted successfully" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * @swagger
 * /transactions:
 *   get:
 *     summary: Get all transactions for a user
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: User ID to fetch transactions
 *     responses:
 *       200:
 *         description: Returns a list of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                   userId:
 *                     type: string
 *                   amount:
 *                     type: number
 *                   description:
 *                     type: string
 *                   date:
 *                     type: string
 *                     format: date
 *                   category:
 *                     type: string
 */
// Get all transactions for a user
router.get("/", async (req, res) => {
    try {
        const { userId } = req.query;
        if (!userId) return res.status(400).json({ error: "Missing userId" });

        const transactionsSnapshot = await db.collection("transactions").where("userId", "==", userId).get();
        const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), amount: safeAmount(doc.data().amount) }));

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get transactions for a specific budget
/**
 * @swagger
 * /transactions/by-budget:
 *   get:
 *     summary: Get transactions for a specific budget period
 *     description: Fetches transactions within a specified date range.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         example: "user123"
 *       - in: query
 *         name: fromDate
 *         required: true
 *         schema:
 *           type: string
 *         example: "2025-01-01"
 *       - in: query
 *         name: toDate
 *         required: true
 *         schema:
 *           type: string
 *         example: "2025-01-31"
 *     responses:
 *       200:
 *         description: Returns a list of transactions
 */
router.get("/by-budget", async (req, res) => {
    try {
        const { userId, fromDate, toDate } = req.query;
        if (!userId || !fromDate || !toDate) return res.status(400).json({ error: "Missing parameters" });

        const transactionsSnapshot = await db.collection("transactions")
            .where("userId", "==", userId)
            .where("date", ">=", fromDate)
            .where("date", "<=", toDate)
            .get();

        const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), amount: safeAmount(doc.data().amount)}));

        res.status(200).json(transactions);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;