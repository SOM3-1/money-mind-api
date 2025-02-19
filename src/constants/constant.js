const dotenv = require("dotenv");
dotenv.config();

module.exports = {
  PORT: process.env.PORT || 5000,
  CATEGORY_LIST: ["Essentials", "Food & Entertainment", "Shopping", "Health & Wellness", "Other"]
};
