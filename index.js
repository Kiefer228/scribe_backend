const express = require("express");
const cors = require("cors");

const app = express();

// Allow requests from your Netlify frontend
app.use(cors({ origin: "https://your-frontend.netlify.app" }));

// Example API endpoint
app.get("/", (req, res) => {
  res.json({ message: "Backend is working!" });
});

// Start server
const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
