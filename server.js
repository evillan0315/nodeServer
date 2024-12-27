const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const { google } = require("googleapis");
const app = express();
require("dotenv").config();
const CLIENT_EMAIL = process.env.CLIENT_EMAIL;
const PRIVATE_KEY = process.env.PRIVATE_KEY.replace(/\\n/g, "\n");
const SHEET_ID = process.env.SHEET_ID;
app.use(cors());
app.use(bodyParser.json());

const PORT = process.env.PORT;

const auth = new google.auth.JWT(
    CLIENT_EMAIL,
    null,
    PRIVATE_KEY,
    ["https://www.googleapis.com/auth/spreadsheets"]
  );
  
  const sheets = google.sheets({ version: "v4", auth });
  
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
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: "BasicInfo!A:C", // Adjust the range as needed (e.g., A:C for the first three columns)
      });
  
      const rows = response.data.values;
      if (rows.length) {
        res.status(200).json(rows); // Send rows data as JSON
      } else {
        res.status(404).send("No data found in the sheet.");
      }
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


