const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { db } = require("./firebaseConfig");
const setupSwagger = require("./swaggerConfig");
const { PORT } = require("./src/constants/constant");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());


setupSwagger(app);

app.get("/", (req, res) => {
  res.send("Finance API is running...");
});
const transactionsRoutes = require("./src/routes/transactions");
const budgetsRoutes = require("./src/routes/budgets");
const registerRoutes = require("./src/routes/register");
const usersRoutes = require("./src/routes/users");
const budgetTransactionsRoutes = require("./src/routes/budget-transactions");
const plaidTransactionsRoutes = require("./src/routes/plaid")

app.use("/transactions", transactionsRoutes);
app.use("/budgets", budgetsRoutes);
app.use("/register", registerRoutes);
app.use("/users", usersRoutes);
app.use("/budget-transactions", budgetTransactionsRoutes);
app.use("/plaid", plaidTransactionsRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
