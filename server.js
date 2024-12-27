const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const app = express();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require("dotenv").config();

app.use(cors());
app.use(bodyParser.json());

const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const SHEET_ID = process.env.SHEET_ID;
const JWT_SECRET = process.env.JWT_SECRET; 
const PORT = process.env.PORT;

const auth = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  
  const sheets = google.sheets({ version: "v4", auth });

  // Function to get user data from Google Sheets
const getUsersFromSheet = async () => {
  try {
    const result = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Users!A:C', // Assuming data is in columns A (username), B (hashedPassword), and C (email)
    });
    return result.data.values || [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw new Error('Unable to fetch users from Google Sheets');
  }
};
  // Function to append user data to Google Sheets
const addUserToSheet = async (username, hashedPassword, email) => {
  try {
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Users!A:C', // Assuming Users data is in columns A to C
      valueInputOption: 'USER_ENTERED',
      resource: {
        values: [[username, hashedPassword, email]],
      },
    });
  } catch (error) {
    console.error('Error adding user to sheet:', error);
    throw new Error('Failed to add user to sheet');
  }
};
// Login route
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: 'Email and password are required' });
  }

  try {
    // Fetch users from Google Sheets
    const users = await getUsersFromSheet();

    // Find the user by email
    const user = users.find((user) => user[2] === email); // Assuming email is in column C

    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }

    const [username, hashedPassword] = user;

    // Compare the hashed password
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (isPasswordValid) {
      // If login is successful, generate a JWT token
  const token = jwt.sign(
    { email: user }, // Payload
    JWT_SECRET,             // Secret key
    { expiresIn: '1h' }     // Expiration time (1 hour)
  );

      res.status(200).send({ message: 'Login successful', token });
    } else {
      res.status(400).send({ message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send({ message: 'Server error during login' });
  }
});
// Endpoint to handle signup
app.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).send({ message: 'All fields are required' });
  }

  try {
    // Hash the password using bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Add the user to Google Sheets
    await addUserToSheet(username, hashedPassword, email);

    res.status(200).send({ message: 'User signed up successfully!' });
  } catch (error) {
    console.error('Error signing up user:', error);
    res.status(500).send({ message: 'Failed to sign up user' });
  }
});
  // Function to check if email already exists in the sheet
  const checkEmailExists = async (email) => {
    try {
      const result = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "BasicInfo!B:B", // Assuming emails are in column B
      });
  
      const emailColumn = result.data.values;
      if (emailColumn) {
        return emailColumn.some(row => row[0] === email); // Check if email exists
      }
      return false;
    } catch (error) {
      console.error("Error checking email:", error);
      return false; // If error, consider email doesn't exist
    }
  };
  // Endpoint to fetch data from Google Sheets
  app.get("/data", async (req, res) => {
    try {
      const token = req.headers['authorization'];
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "BasicInfo!A:C", // Adjust the range as needed (e.g., A:C for the first three columns)
      });
  if (!token) {
    return res.status(401).send({ message: 'No token provided' });
  }

  // Verify the JWT token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ message: 'Invalid or expired token' });
    }
    

    const rows = response.data.values;
    if (rows.length) {
      res.status(200).json(rows); // Send rows data as JSON
    } else {
      res.status(404).send("No data found in the sheet.");
    }
    // Token is valid, proceed with the protected route logic
    //res.status(200).send({ message: 'Welcome to the dashboard', user: decoded });
  });
      
    } catch (error) {
      console.error("Error retrieving data from sheet:", error);
      res.status(500).send("Error retrieving data from Google Sheets");
    }
  });
  app.post("/submit", async (req, res) => {
    const { name, email, message } = req.body;
  
    try {
      // Check if email already exists
      const emailExists = await checkEmailExists(email);
      if (emailExists) {
        return res.status(400).send("This email has already been submitted.");
      }
  
      // Append new data to the sheet
      await sheets.spreadsheets.values.append({
        spreadsheetId: SHEET_ID,
        range: "BasicInfo!A1:C1", // Adjust range as needed
        valueInputOption: "USER_ENTERED",
        resource: {
          values: [[name, email, message]],
        },
      });
  
      res.status(200).send("Data added to Google Sheet!");
    } catch (error) {
      console.error("Error appending data to sheet:", error);
      res.status(500).send("Error adding data to Google Sheet");
    }
  });
  
  app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


