const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { db } = require("./firebaseConfig");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

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


app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
