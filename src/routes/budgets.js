const express = require("express");
const { db } = require("../../firebaseConfig");
const { CATEGORY_LIST } = require("../constants/constant");

const router = express.Router();

// Create a budget & initialize budget-transactions
/**
 * @swagger
 * /budgets:
 *   post:
 *     summary: Create a budget & initialize budget-transactions
 *     description: Creates a budget entry for a user and initializes budget transactions for expense tracking.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userId:
 *                 type: string
 *                 example: "user123"
 *               amount:
 *                 type: number
 *                 example: 1000
 *               title:
 *                 type: string
 *                 example: "January Budget"
 *               fromDate:
 *                 type: string
 *                 example: "2025-01-01"
 *               toDate:
 *                 type: string
 *                 example: "2025-01-31"
 *     responses:
 *       201:
 *         description: Budget created successfully
 *       400:
 *         description: Missing required fields
 *       500:
 *         description: Internal server error
 */
router.post("/", async (req, res) => {
  try {
    const { userId, amount, title, fromDate, toDate } = req.body;
    if (!userId || !amount || !title || !fromDate || !toDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const budgetRef = db.collection("budgets").doc();
    const budgetId = budgetRef.id;

    const categoryTotals = Object.fromEntries(CATEGORY_LIST.map(cat => [cat, 0]));

    const transactionsSnapshot = await db.collection("transactions")
      .where("userId", "==", userId)
      .where("date", ">=", fromDate)
      .where("date", "<=", toDate)
      .get();

    transactionsSnapshot.forEach(doc => {
      const txn = doc.data();
      categoryTotals[txn.category] += parseFloat(txn.amount.toFixed(2));
    });

    await budgetRef.set({ userId, amount, title, fromDate, toDate });
    await db.collection("budget-transactions").doc(budgetId).set({
      userId, 
      budgetId,
      title,
      amount: parseFloat(amount.toFixed(2)),
      fromDate,
      toDate, 
      categoryTotals
    });

    res.status(201).json({ id: budgetId, amount, title, fromDate, toDate, categoryTotals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update budget & re-calculate transactions
/**
 * @swagger
 * /budgets/{budgetId}:
 *   patch:
 *     summary: Update a budget & re-calculate transactions
 *     description: Updates an existing budget and recalculates transactions in the budget period.
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the budget to update.
 *         example: "budget_001"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *                 example: 1200
 *               fromDate:
 *                 type: string
 *                 example: "2025-01-01"
 *               toDate:
 *                 type: string
 *                 example: "2025-01-31"
 *     responses:
 *       200:
 *         description: Budget updated successfully
 *       404:
 *         description: Budget not found
 *       500:
 *         description: Internal server error
 */
router.patch("/:budgetId", async (req, res) => {
  try {
    const { budgetId } = req.params;
    const updates = req.body;

    const budgetRef = db.collection("budgets").doc(budgetId);
    const budgetDoc = await budgetRef.get();
    if (!budgetDoc.exists) return res.status(404).json({ error: "Budget not found" });

    const oldBudget = budgetDoc.data();

    await budgetRef.update(updates);

    const transactionsSnapshot = await db.collection("transactions")
      .where("userId", "==", oldBudget.userId)
      .where("date", ">=", updates.fromDate || oldBudget.fromDate)
      .where("date", "<=", updates.toDate || oldBudget.toDate)
      .get();

    const categoryTotals = Object.fromEntries(CATEGORY_LIST.map(cat => [cat, 0]));
    transactionsSnapshot.forEach(doc => {
      const txn = doc.data();
      categoryTotals[txn.category] += parseFloat(txn.amount.toFixed(2));
    });

    await db.collection("budget-transactions").doc(budgetId).update({
      title: updates.title || oldBudget.title,
      amount: parseFloat(updates.amount).toFixed(2) || parseFloat(oldBudget.amount).toFixed(2),
      fromDate: updates.fromDate || oldBudget.fromDate,
      toDate: updates.toDate || oldBudget.toDate,
      categoryTotals
    });

    res.status(200).json({ message: "Budget updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a budget & its budget-transactions
/**
 * @swagger
 * /budgets/{budgetId}:
 *   delete:
 *     summary: Delete a budget
 *     description: Deletes a budget and its associated budget transactions.
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The ID of the budget to delete.
 *         example: "budget_001"
 *     responses:
 *       200:
 *         description: Budget deleted successfully
 *       500:
 *         description: Internal server error
 */
router.delete("/:budgetId", async (req, res) => {
  try {
    const { budgetId } = req.params;
    await db.collection("budgets").doc(budgetId).delete();
    await db.collection("budget-transactions").doc(budgetId).delete();

    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all budgets for a user
/**
 * @swagger
 * /budgets:
 *   get:
 *     summary: Get all budgets for a user
 *     description: Fetches all budgets associated with a user.
 *     parameters:
 *       - in: query
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique user ID.
 *         example: "user123"
 *     responses:
 *       200:
 *         description: Successfully retrieved all budgets.
 *       400:
 *         description: Missing userId.
 *       500:
 *         description: Internal server error.
 */
router.get("/", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const budgetsSnapshot = await db.collection("budgets")
      .where("userId", "==", userId)
      .orderBy("fromDate", "desc")
      .get();

    const budgets = budgetsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(budgets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /budgets/{budgetId}:
 *   get:
 *     summary: Get a single budget by ID
 *     description: Retrieves the details of a specific budget.
 *     parameters:
 *       - in: path
 *         name: budgetId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique budget ID.
 *         example: "budget_001"
 *     responses:
 *       200:
 *         description: Budget details retrieved successfully.
 *       404:
 *         description: Budget not found.
 *       500:
 *         description: Internal server error.
 */
router.get("/:budgetId", async (req, res) => {
  try {
    const { budgetId } = req.params;
    const budgetDoc = await db.collection("budgets").doc(budgetId).get();
    if (!budgetDoc.exists) return res.status(404).json({ error: "Budget not found" });

    res.status(200).json({ id: budgetDoc.id, ...budgetDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;