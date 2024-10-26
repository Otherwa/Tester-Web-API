require('dotenv').config();

const cors = require("cors");
const logger = require("./utils/logger");
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User'); // Ensure this User model contains the family member schema
const PatientDataSchema = require('./models/UserFormData');
const fs = require("fs");
const axios = require('axios');

const app = express();
const JWT_SECRET = process.env.JWT_SECRET || 'Tatakae'; // Use environment variable for secret

const corsOptions = {
  origin: "*",
  credentials: false,
  optionSuccessStatus: 200,
};

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to authenticate token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Extract token from "Bearer <token>"

  if (!token) return res.status(401).send({ message: 'No token provided' });

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(403).send({ message: 'Failed to authenticate token' });

    req.userId = decoded.userId;
    next();
  });
};

// Patient data route
app.post("/postdata", authenticateToken, async (req, res) => {
  try {
    if (req.body.data._id) {
      const { _id, ...rest } = req.body.data;

      const patientData = new PatientDataSchema({
        ...rest,
        user_id: _id,
        type: 'family_member'
      });


      await patientData.save();

    } else {
      const patientData = new PatientDataSchema({
        ...req.body.data,
        user_id: req.userId,
        type: 'user'
      });

      await patientData.save();
    }

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

// Get JSON for form
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
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = new User({ email, password: hashedPassword, role, phone });

  try {
    await user.save();
    res.send({ message: 'User registered successfully' });
  } catch (error) {
    logger.error(error.stack);
    res.status(500).send({ message: 'Error registering user' });
  }
});

// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  console.log(req.body)
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).send({ message: 'User not found' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(400).send({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '1h' });
  res.send({ token, message: 'Login successful', role: user.role });
});

// Protected route (Dashboard)
app.get('/dashboard', authenticateToken, (req, res) => {
  res.send({ message: 'Welcome to the dashboard!' });
});

// Profile route (GET)
app.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) return res.status(404).send({ message: 'User not found' });

    // Return user details along with family members
    res.json({ name: user.name, email: user.email, phone: user.phone, role: user.role, familyDetails: user.familyDetails });
  } catch (error) {
    res.status(500).send({ message: 'Error fetching user profile' });
  }
});

// Profile route (PUT)
app.put('/profile', authenticateToken, async (req, res) => {
  try {
    const { userId } = req;
    const { name, email, phone, role, familyDetails } = req.body; // Include family details if needed

    const updatedUser = await User.findByIdAndUpdate(userId, { name, email, phone, role, familyDetails }, { new: true });

    if (!updatedUser) {
      return res.status(404).send({ message: 'User not found' });
    }

    res.send(updatedUser);
  } catch (error) {
    res.status(500).send({ message: 'Error updating profile', error });
  }
});

app.get('/patients', authenticateToken, async (req, res) => {
  try {
    // Find users with the role of "patient"
    const patients = await User.find({ role: 'patient' });

    // Fetch corresponding patient data for each patient
    const patientDataPromises = patients.map(async (patient) => {
      const patientData = await PatientDataSchema.find({ user_id: patient._id });
      return {
        user: patient,
        data: patientData,
      };
    });

    const patientData = await Promise.all(patientDataPromises);

    res.json(patientData);
  } catch (error) {
    logger.error(error.stack);
    res.status(500).send({ message: 'Error fetching patient data' });
  }
});

app.get('/records', authenticateToken, async (req, res) => {
  try {
    const { userId } = req;; // Get patientId from query parameters if provided

    let records;
    if (userId) {
      // Fetch records for a specific patient
      records = await PatientDataSchema.find({ user_id: userId });
    } else {
      // Fetch all patient records
      records = await PatientDataSchema.find({});
    }

    // Send the records data as a JSON response
    res.json(records);
  } catch (error) {
    logger.error(error.stack);
    res.status(500).send({ message: 'Error fetching patient records' });
  }
});

// Flask API model

app.post('/report', authenticateToken, async (req, res) => {
  try {
    const { patientId, submissionId, data } = req.body;

    if (!patientId || !data) {
      return res.status(400).send({ message: 'Patient ID and data are required' });
    }

    // Fetch patient information
    const patient = await User.findById(patientId);
    if (!patient) {
      return res.status(404).send({ message: 'Patient not found' });
    }

    // Fetch the specific submission data if provided
    let submissionData;
    if (submissionId) {
      submissionData = await PatientDataSchema.findById(submissionId);
      if (!submissionData) {
        return res.status(404).send({ message: 'Submission not found' });
      }
    }

    // Prepare the data to send to Flask
    const requestData = {
      gender: patient.gender,
      patientAge: patient.age,
      ...data, // Spread additional data fields required for the Flask API
    };

    // Send data to the Flask API and receive the prediction/report
    const flaskResponse = await axios.post(process.env.FLASK_API + "/predict", requestData);
    const reportData = flaskResponse.data;

    console.log(reportData)
    // Save the report data in MongoDB under the PatientDataSchema
    const report = {
      patientInfo: {
        id: patient._id,
        name: patient.name,
        email: patient.email,
        phone: patient.phone,
      },
      data: reportData, // Use the data received from the Flask API
      generatedAt: new Date(),
    };

    const patientData = await PatientDataSchema.findOneAndUpdate(
      { user_id: patientId },
      { $set: { reports: report }, }, // Replaces the existing report field or sets it if it doesn't exist
      { new: true, upsert: true }
    );


    res.json({ message: 'Report generated and saved successfully', report: patientData });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error generating report' });
  }
});


// Start server
app.listen(10000, () => {
  logger.info("Server running on port (10000");
});
