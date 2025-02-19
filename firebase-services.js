const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { db } = require("./firebaseConfig");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const CATEGORY_LIST = ["Essentials", "Food & Entertainment", "Shopping", "Health & Wellness", "Other"];

app.get("/", (req, res) => {
  res.send("Finance API is running...");
});

app.post("/register", async (req, res) => {
  try {
    const { userId, name, email } = req.body;

    if (!userId || !name || !email) {
      return res.status(400).json({ error: "Missing userId, name, or email" });
    }

    await db.collection("users").doc(userId).set({
      name,
      email
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/users", async (req, res) => {
  try {
    const usersSnapshot = await db.collection("users").get();
    if (usersSnapshot.empty) {
      return res.status(404).json({ message: "No users found" });
    }

    const users = usersSnapshot.docs.map(doc => ({
      id: doc.id, 
      ...doc.data() 
    }));

    res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get("/users/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ id: userDoc.id, ...userDoc.data() });
  } catch (error) {
    console.error("Error fetching user:", error.message);
    res.status(500).json({ error: error.message });
  }
});

// ---------- BUDGET API ----------

// Create a budget & initialize budget-transactions
app.post("/budgets", async (req, res) => {
  try {
    const { userId, amount, title, fromDate, toDate } = req.body;
    if (!userId || !amount || !title || !fromDate || !toDate) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const budgetRef = db.collection("budgets").doc();
    const budgetId = budgetRef.id;

    // Initialize budget-transactions with category totals set to 0
    const categoryTotals = Object.fromEntries(CATEGORY_LIST.map(cat => [cat, 0]));

    // Consolidate transactions for this budget period
    const transactionsSnapshot = await db.collection("transactions")
      .where("userId", "==", userId)
      .where("date", ">=", fromDate)
      .where("date", "<=", toDate)
      .get();

    transactionsSnapshot.forEach(doc => {
      const txn = doc.data();
      categoryTotals[txn.category] += txn.amount;
    });

    await budgetRef.set({ userId, amount, title, fromDate, toDate });
    await db.collection("budget-transactions").doc(budgetId).set({ userId, budgetId, categoryTotals });

    res.status(201).json({ id: budgetId, amount, title, fromDate, toDate, categoryTotals });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update budget & re-calculate transactions
app.patch("/budgets/:budgetId", async (req, res) => {
  try {
    const { budgetId } = req.params;
    const updates = req.body;
    
    const budgetRef = db.collection("budgets").doc(budgetId);
    const budgetDoc = await budgetRef.get();
    if (!budgetDoc.exists) return res.status(404).json({ error: "Budget not found" });

    const oldBudget = budgetDoc.data();

    // Update budget
    await budgetRef.update(updates);

    // If date range changes, recalculate `budget-transactions`
    const transactionsSnapshot = await db.collection("transactions")
      .where("userId", "==", oldBudget.userId)
      .where("date", ">=", updates.fromDate || oldBudget.fromDate)
      .where("date", "<=", updates.toDate || oldBudget.toDate)
      .get();

    const categoryTotals = Object.fromEntries(CATEGORY_LIST.map(cat => [cat, 0]));
    transactionsSnapshot.forEach(doc => {
      const txn = doc.data();
      categoryTotals[txn.category] += txn.amount;
    });

    await db.collection("budget-transactions").doc(budgetId).update({ categoryTotals });

    res.status(200).json({ message: "Budget updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a budget & its budget-transactions
app.delete("/budgets/:budgetId", async (req, res) => {
  try {
    const { budgetId } = req.params;
    await db.collection("budgets").doc(budgetId).delete();
    await db.collection("budget-transactions").doc(budgetId).delete();

    res.status(200).json({ message: "Budget deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------- TRANSACTION API ----------

// Create a transaction & update budget-transactions
app.post("/transactions", async (req, res) => {
  try {
    const { userId, transactionId, amount, description, date, category } = req.body;
    if (!userId || !transactionId || !amount || !description || !date || !category) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const transactionRef = db.collection("transactions").doc(transactionId);
    await transactionRef.set({ userId, amount, description, date, category });

    // Find the relevant budget
    const budgetsSnapshot = await db.collection("budgets")
      .where("userId", "==", userId)
      .where("fromDate", "<=", date)
      .where("toDate", ">=", date)
      .get();

    if (!budgetsSnapshot.empty) {
      const budgetId = budgetsSnapshot.docs[0].id;
      const budgetTxnRef = db.collection("budget-transactions").doc(budgetId);
      const budgetTxnDoc = await budgetTxnRef.get();
      if (budgetTxnDoc.exists) {
        const categoryTotals = budgetTxnDoc.data().categoryTotals;
        categoryTotals[category] += amount;
        await budgetTxnRef.update({ categoryTotals });
      }
    }

    res.status(201).json({ id: transactionId, userId, amount, description, date, category });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update transaction category & update budget-transactions
app.patch("/transactions/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const { category } = req.body;
    if (!category) return res.status(400).json({ error: "Missing category" });

    const transactionDoc = await db.collection("transactions").doc(transactionId).get();
    if (!transactionDoc.exists) return res.status(404).json({ error: "Transaction not found" });

    const txnData = transactionDoc.data();
    await db.collection("transactions").doc(transactionId).update({ category });

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
        categoryTotals[txnData.category] -= txnData.amount;
        categoryTotals[category] += txnData.amount;
        await budgetTxnRef.update({ categoryTotals });
      }
    }

    res.status(200).json({ message: "Transaction updated successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete transaction & update budget-transactions
app.delete("/transactions/:transactionId", async (req, res) => {
  try {
    const { transactionId } = req.params;
    const transactionDoc = await db.collection("transactions").doc(transactionId).get();
    if (!transactionDoc.exists) return res.status(404).json({ error: "Transaction not found" });

    const { userId, amount, date, category } = transactionDoc.data();
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
      categoryTotals[category] -= amount;
      await budgetTxnRef.update({ categoryTotals });
    }

    res.status(200).json({ message: "Transaction deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all transactions for a user
app.get("/transactions", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const transactionsSnapshot = await db.collection("transactions").where("userId", "==", userId).get();
    const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get transactions for a specific budget
app.get("/transactions/by-budget", async (req, res) => {
  try {
    const { userId, fromDate, toDate } = req.query;
    if (!userId || !fromDate || !toDate) return res.status(400).json({ error: "Missing parameters" });

    const transactionsSnapshot = await db.collection("transactions")
      .where("userId", "==", userId)
      .where("date", ">=", fromDate)
      .where("date", "<=", toDate)
      .get();

    const transactions = transactionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all budget transactions for a user
app.get("/budget-transactions", async (req, res) => {
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

// Get a single budget by ID
app.get("/budgets/:budgetId", async (req, res) => {
  try {
    const { budgetId } = req.params;
    const budgetDoc = await db.collection("budgets").doc(budgetId).get();
    if (!budgetDoc.exists) return res.status(404).json({ error: "Budget not found" });

    res.status(200).json({ id: budgetDoc.id, ...budgetDoc.data() });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
