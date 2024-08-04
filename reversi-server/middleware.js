require("dotenv").config();
const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.id = decoded; // Attach the user info to the request object
    next(); // Proceed to the next middleware/route handler
  } catch (error) {
    console.error("Token validation error:", error);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = {
  validateToken,
};
