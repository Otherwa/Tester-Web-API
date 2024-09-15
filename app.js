require('dotenv').config();

const cors = require("cors");
const logger = require("./utils/logger");
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const PatientDataSchema = require('./models/UserFormData');
const fs = require("fs");


const app = express();
const JWT_SECRET = 'Tatakae';

const corsOptions = {
  origin: "*",
  credentials: false,
  optionSuccessStatus: 200,
};

mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true })); //

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  // Extract the token from the Authorization header
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  // Check if token exists
  if (!token) return res.status(401).send({ message: 'No token provided' });

  // Verify the token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'Failed to authenticate token' });

    // Add userId to the request object
    req.userId = decoded.userId;
    next();
  });
};



app.post("/postdata", authenticateToken, async (req, res) => {
  try {
    const patientData = new PatientDataSchema({
      ...req.body.data,
      user_id: req.userId, // Link patient data to the user
    });

    await patientData.save();
    logger.info("Successfully inserted patient data into MongoDB");
    res.send({ status: "success" });
  } catch (err) {
    if (err.name === 'ValidationError') {
      let errors = {};
      Object.keys(err.errors).forEach((key) => {
        errors[key] = err.errors[key].message;
      });
      res.status(400).send({ status: "validation_error", errors });
    } else {
      logger.error(err.stack);
      res.status(500).send({ status: "error", message: err.message });
    }
  }
});

app.get("/formjson", async (req, res) => {
  try {
    logger.info("App initialized");
    let data = fs.readFileSync("data_collector.json");
    let formattedData = JSON.parse(data.toString());
    res.json(formattedData);
  } catch (error) {
    logger.error(error.stack);
    res.send({ status: "unsuccess", msg: error.message });
  }
});

// Register route
app.post('/register', async (req, res) => {
  const { email, password, role, phone } = req.body;
  console.log(req.body)
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword, role, phone });

  try {
    await user.save();
    res.send({ message: 'User registered successfully' });
  } catch (error) {
    console.log(error)
    res.status(500).send({ message: 'Error registering user' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
  res.send({ token, message: 'Login successful' });
});

// Protected route (Dashboard)
app.get('/dashboard', authenticateToken, (req, res) => {
  res.send({ message: 'Welcome to the dashboard!' });
});


// Profile route
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId); // Fetch user by ID from token
    if (!user) return res.status(404).send({ message: 'User not found' });
    res.json({ name: user.name, email: user.email, phone: user.phone, role: user.role });
  } catch (error) {
    res.status(500).send({ message: 'Error fetching user profile' });
  }
});

app.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req;
    const { name, email, phone, role } = req.body;

    // Find the user by ID and update the profile
    const updatedUser = await User.findByIdAndUpdate(userId, { name, email, phone, role }, { new: true });

    if (!updatedUser) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send(updatedUser);
  } catch (error) {
    res.status(500).send({ message: 'Error updating profile', error });
  }
});

app.listen(10000, () => {
  logger.info("Server running on port 10000");
});
