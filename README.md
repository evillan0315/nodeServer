# Google Sheets Server

This project is a Node.js server application that interacts with Google Sheets to read and write data. It provides endpoints to fetch data from a Google Sheet and submit new entries, ensuring duplicate entries are not added.

## Features
- Fetch data from a specified Google Sheet.
- Append new data to the Google Sheet.
- Check for duplicate email entries before appending.

## Prerequisites
1. Node.js installed on your machine.
2. A Google Cloud project with the **Google Sheets API** enabled.
3. A service account with a key file.
4. Access to a Google Sheet with a tab named `BasicInfo`.

## Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd google-sheets-server
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment Variables
1. Create a `.env` file in the root of the project.
2. Add the following variables:
   ```env
   CLIENT_EMAIL=your-service-account-email
   PRIVATE_KEY="your-private-key"
   SHEET_ID=your-google-sheet-id
   ```
   - Replace `your-service-account-email` with the service account's email.
   - Replace `your-private-key` with the private key (ensure to escape newlines `\n` in `.env`).
   - Replace `your-google-sheet-id` with the ID of your Google Sheet.

### 4. Start the Server
```bash
node server.js
```
The server will run on [http://localhost:5000](http://localhost:5000).

## Endpoints

### GET `/data`
Fetches data from the `BasicInfo` tab in the Google Sheet.

**Response:**
- `200 OK`: Returns rows from the Google Sheet as JSON.
- `404 Not Found`: If the sheet contains no data.
- `500 Internal Server Error`: If there is an issue accessing the Google Sheet.

### POST `/submit`
Submits a new entry to the Google Sheet.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john.doe@example.com",
  "message": "Hello World"
}
```

**Response:**
- `200 OK`: Confirms data was added.
- `400 Bad Request`: If the email already exists in the sheet.
- `500 Internal Server Error`: If there is an issue appending data to the Google Sheet.

## Example Google Sheet Structure
Ensure your Google Sheet has the following headers in the `BasicInfo` tab:
```
Name        Email                Message
John Doe    john.doe@example.com Hello World
```

## Testing
You can test the endpoints using:
- [Postman](https://www.postman.com/)
- cURL:
  ```bash
  curl -X POST http://localhost:5000/submit \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe", "email":"john.doe@example.com", "message":"Hello World"}'
  ```

## Deployment
Deploy this server to any cloud platform, such as:
- [Heroku](https://www.heroku.com/)
- [AWS Elastic Beanstalk](https://aws.amazon.com/elasticbeanstalk/)
- [Google Cloud App Engine](https://cloud.google.com/appengine/)

## License
This project is licensed under the MIT License.

