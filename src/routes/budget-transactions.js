const express = require("express");
const { db } = require("../../firebaseConfig");

const router = express.Router();

/**
 * @swagger
 * /budget-transactions:
 *   get:
 *     summary: Get all budget transactions for a user
 *     description: Retrieves all budget transactions associated with a user.
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
 *         description: Successfully retrieved budget transactions.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: The budget transaction ID.
 *                     example: "budgetTxn_001"
 *                   userId:
 *                     type: string
 *                     description: The ID of the user.
 *                     example: "user123"
 *                   budgetId:
 *                     type: string
 *                     description: The associated budget ID.
 *                     example: "budget_001"
 *                   categoryTotals:
 *                     type: object
 *                     description: Total spending per category in the budget period.
 *                     example:
 *                       Essentials: 500
 *                       Food & Entertainment: 300
 *                       Shopping: 200
 *       400:
 *         description: Missing userId in query parameters.
 *       500:
 *         description: Internal server error.
 */
router.get("/", async (req, res) => {
    try {
      const { userId } = req.query;
      if (!userId) return res.status(400).json({ error: "Missing userId" });
  
      const budgetTxnSnapshot = await db.collection("budget-transactions").where("userId", "==", userId).get();
      const budgetTransactions = budgetTxnSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  
      res.status(200).json(budgetTransactions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

module.exports = router;