### **API Testing Guide for Finance API**

---

## **📌 Prerequisites**
Before testing, ensure the following:
- **Node.js** is installed.
- The **server is running** on `http://localhost:5002` or your configured port.
- You have the **`.env` file** and **`serviceAccountKey.json`** (Request these from the repository owner).
- Install **cURL** (if not already available on your system).
- Install **Axios** if you prefer JavaScript-based testing:
  ```bash
  npm install axios
  ```

---

## **🔹 Base URL**
```
http://localhost:5002
```

---

## **🔹 API Endpoints & Testing Commands**

### **1️⃣ Register a User**
**cURL:**
```bash
curl -X POST "http://localhost:5002/register" \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user_123",
  "name": "Test User",
  "email": "testuser@example.com"
}'
```

**Axios:**
```javascript
const axios = require("axios");

axios.post("http://localhost:5002/register", {
  userId: "test_user_123",
  name: "Test User",
  email: "testuser@example.com"
}).then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **2️⃣ Create a Budget**
**cURL:**
```bash
curl -X POST "http://localhost:5002/budgets" \
-H "Content-Type: application/json" \
-d '{
  "userId": "test_user_123",
  "amount": 1000,
  "title": "January Budget",
  "fromDate": "2025-01-01",
  "toDate": "2025-01-31"
}'
```

**Axios:**
```javascript
axios.post("http://localhost:5002/budgets", {
  userId: "test_user_123",
  amount: 1000,
  title: "January Budget",
  fromDate: "2025-01-01",
  toDate: "2025-01-31"
}).then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **3️⃣ Get All Budgets for a User**
**cURL:**
```bash
curl -X GET "http://localhost:5002/budgets?userId=test_user_123"
```

**Axios:**
```javascript
axios.get("http://localhost:5002/budgets", {
  params: { userId: "test_user_123" }
}).then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **4️⃣ Create Multiple Transactions**
**cURL:**
```bash
curl -X POST "http://localhost:5002/transactions" \
-H "Content-Type: application/json" \
-d '{
  "transactions": [
    { "userId": "test_user_123", "transactionId": "txn_001", "amount": 50, "description": "Grocery", "date": "2025-01-05", "category": "Essentials" },
    { "userId": "test_user_123", "transactionId": "txn_002", "amount": 100, "description": "Dinner", "date": "2025-01-10", "category": "Food & Entertainment" }
  ]
}'
```

**Axios:**
```javascript
axios.post("http://localhost:5002/transactions", {
  transactions: [
    { userId: "test_user_123", transactionId: "txn_001", amount: 50, description: "Grocery", date: "2025-01-05", category: "Essentials" },
    { userId: "test_user_123", transactionId: "txn_002", amount: 100, description: "Dinner", date: "2025-01-10", category: "Food & Entertainment" }
  ]
}).then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **5️⃣ Get Budget Transactions**
**cURL:**
```bash
curl -X GET "http://localhost:5002/budget-transactions?userId=test_user_123"
```

**Axios:**
```javascript
axios.get("http://localhost:5002/budget-transactions", {
  params: { userId: "test_user_123" }
}).then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **6️⃣ Update Transaction Category**
**cURL:**
```bash
curl -X PATCH "http://localhost:5002/transactions/txn_001" \
-H "Content-Type: application/json" \
-d '{
  "category": "Other"
}'
```

**Axios:**
```javascript
axios.patch("http://localhost:5002/transactions/txn_001", {
  category: "Other"
}).then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **7️⃣ Delete a Transaction**
**cURL:**
```bash
curl -X DELETE "http://localhost:5002/transactions/txn_002"
```

**Axios:**
```javascript
axios.delete("http://localhost:5002/transactions/txn_002")
.then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **8️⃣ Update Budget Date Range**
**cURL:**
```bash
curl -X PATCH "http://localhost:5002/budgets/{BUDGET_ID}" \
-H "Content-Type: application/json" \
-d '{
  "fromDate": "2024-12-01",
  "toDate": "2024-12-31"
}'
```

**Axios:**
```javascript
axios.patch(`http://localhost:5002/budgets/{BUDGET_ID}`, {
  fromDate: "2024-12-01",
  toDate: "2024-12-31"
}).then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

### **9️⃣ Delete a Budget**
**cURL:**
```bash
curl -X DELETE "http://localhost:5002/budgets/{BUDGET_ID}"
```

**Axios:**
```javascript
axios.delete(`http://localhost:5002/budgets/{BUDGET_ID}`)
.then(response => console.log(response.data))
.catch(error => console.error(error.response?.data || error.message));
```

---

## **🛠 How to Run the API Locally**
### **1️⃣ Clone the Repository**
```bash
git clone https://github.com/SOM3-1/money-mind-api.git
cd money-mind-api
git checkout dev
```

### **2️⃣ Install Dependencies**
```bash
npm install
```

### **3️⃣ Get Required Files**
- `.env` file (Request from the repository owner)
- `serviceAccountKey.json` (Request from the repository owner)

### **4️⃣ Start the Server**
```bash
npm run dev
```

### **5️⃣ Access Swagger API Docs**
Once the server is running, visit:
```
http://localhost:5002/api-docs
```

---

## **🔎 Notes**
- All `BUDGET_ID` values must be replaced dynamically with the ones returned from API responses.
- If you modify any API endpoints, make sure to update your test commands accordingly.
