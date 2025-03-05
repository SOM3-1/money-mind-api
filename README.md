### **MoneyMind API**

The **Finance API** is a backend service for managing users, transactions, and budgets, supporting financial insights through AI-powered features.

---

## **📌 Features**
- **User Registration & Management**
- **Budget Creation, Updates, and Deletion**
- **Transaction Management (Batch & Individual)**
- **Budget-Transactions Sync**
- **Swagger API Documentation**

---

## **🚀 Getting Started**

### **1. Clone the Repository**
```sh
git clone https://github.com/SOM3-1/money-mind-api.git
cd finance-api
git checkout dev
create your own branch for development
```

### **2. Install Dependencies**
```sh
npm install
```

### **3. Obtain Configuration Files**
This project requires **environment variables** and **Firebase credentials**.  
- **Contact the repository owner** to obtain:
  - **`.env` file** containing API keys and secrets.
  - **`serviceAccountKey.json`** for Firebase authentication.

### **4. Run the Server**
```sh
npm start
```
or with **nodemon** for hot-reloading:
```sh
npm run dev
```

### **5. API Documentation**
Swagger documentation is available after running the server:
- 📖 **Swagger Docs:** [http://localhost:5002/api-docs](http://localhost:5002/api-docs)

---

## **📌 API Endpoints**

### **1️⃣ User Management**
| Method | Endpoint | Description | Request Body / Params |
|---------|----------|-------------|----------------|
| **POST** | `/register` | Register a new user | `{ userId, name, email }` |
| **GET** | `/users` | Fetch all users | - |
| **GET** | `/users/{userId}` | Fetch a user by ID | `{ userId }` |

---

### **2️⃣ Budgets**
| Method | Endpoint | Description | Request Body / Params |
|---------|----------|-------------|----------------|
| **POST** | `/budgets` | Create a new budget | `{ userId, amount, title, fromDate, toDate }` |
| **PATCH** | `/budgets/{budgetId}` | Update an existing budget | `{ amount, title, fromDate, toDate }` (partial updates allowed) |
| **DELETE** | `/budgets/{budgetId}` | Delete a budget | `{ budgetId }` |
| **GET** | `/budgets` | Get all budgets for a user | `?userId=user123` |
| **GET** | `/budgets/{budgetId}` | Get a specific budget by ID | `{ budgetId }` |

---

### **3️⃣ Transactions**
| Method | Endpoint | Description | Request Body / Params |
|---------|----------|-------------|----------------|
| **POST** | `/transactions` | Add multiple transactions | `{ transactions: [ { userId, transactionId, amount, description, date, category } ] }` |
| **PATCH** | `/transactions/{transactionId}` | Update a transaction category | `{ category }` |
| **DELETE** | `/transactions/{transactionId}` | Delete a transaction | `{ transactionId }` |
| **GET** | `/transactions` | Get all transactions for a user | `?userId=user123` |
| **GET** | `/transactions/by-budget` | Get transactions for a specific budget | `?userId=user123&fromDate=YYYY-MM-DD&toDate=YYYY-MM-DD` |

---

### **4️⃣ Budget-Transactions Sync**
| Method | Endpoint | Description | Request Body / Params |
|---------|----------|-------------|----------------|
| **GET** | `/budget-transactions` | Get all budget transactions for a user | `?userId=user123` |

---

## **🛠 How to Test**
1. **Using Postman**  
   - Import the **Swagger JSON** or manually test the API.
2. **Using CURL**  
   Example: Create a budget
   ```sh
   curl -X POST "http://localhost:5002/budgets" \
   -H "Content-Type: application/json" \
   -d '{
     "userId": "user123",
     "amount": 1000,
     "title": "January Budget",
     "fromDate": "2025-01-01",
     "toDate": "2025-01-31"
   }'
   ```
3. **Swagger UI**  
   - Open **[http://localhost:5002/api-docs](http://localhost:5002/api-docs)** in a browser.

---

## **🔧 Technologies Used**
- **Node.js** + **Express.js** (Backend)
- **Firebase Firestore** (Database)
- **Swagger** (API Documentation)
- **CORS** (Cross-Origin Support)
- **Nodemon** (Development Hot-Reload)

---

## **📢 Notes**
- Ensure you have **valid Firebase credentials** before running.
- Any changes to database **structure or indexes** require manual Firestore updates.
- Check the REFERENCE.md file for details on how to test the API using cURL or Axios, including request formats and expected responses.

---

### **📬 Need Help?**
For any issues or questions, contact the **repository owner**.
