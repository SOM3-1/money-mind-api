const express = require("express");
const { db } = require("../../firebaseConfig");
const admin = require("firebase-admin"); 

const router = express.Router();

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Retrieve a list of all users
 *     description: Fetches all registered users from the database.
 *     responses:
 *       200:
 *         description: A list of users.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: string
 *                     description: The unique user ID.
 *                   name:
 *                     type: string
 *                     description: The name of the user.
 *                   email:
 *                     type: string
 *                     description: The email of the user.
 *       404:
 *         description: No users found.
 *       500:
 *         description: Server error.
 */
router.get("/", async (req, res) => {
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

/**
 * @swagger
 * /users/{userId}:
 *   get:
 *     summary: Retrieve a specific user by ID
 *     description: Fetches the details of a user by their userId.
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *         description: The unique ID of the user.
 *     responses:
 *       200:
 *         description: The user details.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   description: The unique user ID.
 *                 name:
 *                   type: string
 *                   description: The name of the user.
 *                 email:
 *                   type: string
 *                   description: The email of the user.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Server error.
 */
router.get("/:userId", async (req, res) => {
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

/**
* @swagger
* /users/{userId}:
*   delete:
*     summary: Delete a user account
*     description: Deletes the user from Firebase Authentication and removes all their associated data from Firestore.
*     parameters:
*       - in: path
*         name: userId
*         required: true
*         schema:
*           type: string
*         description: The Firebase Authentication UID of the user.
*     responses:
*       200:
*         description: User account deleted successfully.
*       404:
*         description: User not found.
*       500:
*         description: Internal server error.
*/
router.delete("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    const userRef = db.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    await admin.auth().deleteUser(userId);

    await userRef.delete();

    const transactionsSnapshot = await db.collection("transactions").where("userId", "==", userId).get();
    const transactionBatch = db.batch();
    transactionsSnapshot.forEach((doc) => transactionBatch.delete(doc.ref));
    await transactionBatch.commit();

    const budgetsSnapshot = await db.collection("budgets").where("userId", "==", userId).get();
    const budgetBatch = db.batch();
    budgetsSnapshot.forEach((doc) => budgetBatch.delete(doc.ref));
    await budgetBatch.commit();

    const budgetTxnSnapshot = await db.collection("budget-transactions").where("userId", "==", userId).get();
    const budgetTxnBatch = db.batch();
    budgetTxnSnapshot.forEach((doc) => budgetTxnBatch.delete(doc.ref));
    await budgetTxnBatch.commit();

    res.status(200).json({ message: "User account and all associated data deleted successfully." });
  } catch (error) {
    console.error("Error deleting user account:", error.message);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;