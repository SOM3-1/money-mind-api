const express = require("express");
const { db } = require("../../firebaseConfig");

const router = express.Router();

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Register a new user
 *     description: Adds a new user to the database with their userId, name, and email.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - name
 *               - email
 *             properties:
 *               userId:
 *                 type: string
 *                 description: The unique user ID.
 *                 example: "user123"
 *               name:
 *                 type: string
 *                 description: The full name of the user.
 *                 example: "John Doe"
 *               email:
 *                 type: string
 *                 description: The email of the user.
 *                 example: "john.doe@example.com"
 *     responses:
 *       201:
 *         description: User registered successfully.
 *       400:
 *         description: Missing userId, name, or email.
 *       500:
 *         description: Server error.
 */
router.post("/", async (req, res) => {
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
module.exports = router;