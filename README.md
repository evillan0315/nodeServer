# Simple Node.js Server with Google Sheets Integration

This Node.js application serves as a basic backend server that integrates with Google Sheets for user management and data storage. The application includes user authentication (signup and login) and allows data submission and retrieval from Google Sheets.

## Prerequisites

- Node.js installed on your machine
- Google Cloud project with Google Sheets API enabled
- Service account credentials for Google Sheets API
- `.env` file with the following variables:
  - `CLIENT_EMAIL`: Service account email
  - `PRIVATE_KEY`: Service account private key
  - `SHEET_ID`: Google Sheets ID
  - `JWT_SECRET`: Secret key for JWT token generation
  - `PORT`: Port number for the server

## Installation

1. Clone the repository.
2. Install dependencies with `npm install`.
3. Create a `.env` file with the required environment variables.
4. Start the server with `node app.js`.

## Dependencies

- `express`: Web framework for Node.js
- `body-parser`: Middleware for parsing incoming request bodies
- `cors`: Middleware for enabling CORS
- `googleapis`: Library for accessing Google APIs
- `bcryptjs`: Library for hashing passwords
- `jsonwebtoken`: Library for generating and verifying JWT tokens
- `dotenv`: Library for loading environment variables from a `.env` file

## Code Overview

### Initial Setup

```javascript
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
```

- Import required libraries.
- Load environment variables.
- Initialize Express app.
- Use CORS and body-parser middleware.

### Environment Variables

```javascript
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const SHEET_ID = process.env.SHEET_ID;
const JWT_SECRET = process.env.JWT_SECRET; 
const PORT = process.env.PORT;
```

- Retrieve environment variables for Google Sheets API, JWT, and server port.

### Google Sheets Authentication

```javascript
const auth = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
);
const sheets = google.sheets({ version: "v4", auth });
```

- Authenticate with Google Sheets API using service account credentials.

### Helper Functions

#### Get Users from Google Sheets

```javascript
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
```

- Fetch user data from Google Sheets.

#### Add User to Google Sheets

```javascript
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
```

- Append new user data to Google Sheets.

### Routes

#### Login Route

```javascript
app.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).send({ message: 'Email and password are required' });
  }

  try {
    const users = await getUsersFromSheet();
    const user = users.find((user) => user[2] === email); // Assuming email is in column C

    if (!user) {
      return res.status(400).send({ message: 'User not found' });
    }

    const [username, hashedPassword] = user;
    const isPasswordValid = await bcrypt.compare(password, hashedPassword);

    if (isPasswordValid) {
      const token = jwt.sign({ email: user }, JWT_SECRET, { expiresIn: '1h' });
      res.status(200).send({ message: 'Login successful', token });
    } else {
      res.status(400).send({ message: 'Invalid password' });
    }
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).send({ message: 'Server error during login' });
  }
});
```

- Handle user login, validate credentials, and generate JWT token.

#### Signup Route

```javascript
app.post('/signup', async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).send({ message: 'All fields are required' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await addUserToSheet(username, hashedPassword, email);
    res.status(200).send({ message: 'User signed up successfully!' });
  } catch (error) {
    console.error('Error signing up user:', error);
    res.status(500).send({ message: 'Failed to sign up user' });
  }
});
```

- Handle user signup, hash password, and add new user to Google Sheets.

#### Check Email Existence

```javascript
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
    return false;
  }
};
```

- Check if email already exists in Google Sheets.

#### Data Retrieval Route

```javascript
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
    });
  } catch (error) {
    console.error("Error retrieving data from sheet:", error);
    res.status(500).send("Error retrieving data from Google Sheets");
  }
});
```

- Retrieve data from Google Sheets, verify JWT token, and send data as JSON.

#### Data Submission Route

```javascript
app.post("/submit", async (req, res) => {
  const { name, email, message } = req.body;

  try {
    const emailExists = await checkEmailExists(email);
    if (emailExists) {
      return res.status(400).send("This email has already been submitted.");
    }

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
```

- Handle data submission to Google Sheets, check for duplicate emails, and append new data.

### Start Server

```javascript
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
```

- Start the server on the specified port.

## Usage

1. **Signup**: `POST /signup`
   - Request body: `{ "username": "user1", "password": "password123", "email": "user1@example.com" }`
   - Response: `{ "message": "User signed up successfully!" }`

2. **Login**: `POST /login`
   - Request body: `{ "email": "user1@example.com", "password": "password123" }`
   - Response: `{ "message": "Login successful", "token": "JWT_TOKEN" }`

3. **Submit Data**: `POST /submit`
   - Request body: `{ "name": "John Doe", "email": "john@example.com", "message": "Hello!" }`
   - Response: `"Data added to Google Sheet!"`

4. **Get Data**: `GET /data`
   - Headers: `{ "Authorization": "Bearer JWT_TOKEN" }`
   - Response: `[[ "name", "email", "message" ], ...]`

## Error Handling

- The server responds with appropriate status codes and messages for different error scenarios, such as invalid input, authentication failure, and server errors.

## Conclusion

This application demonstrates a simple implementation of user authentication and data management using Node.js, Google Sheets API, and JWT. It provides a basic structure that can be extended for more complex use cases.