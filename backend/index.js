// Import required libraries
const express = require('express')
const path = require('path')

const app = express()
const port = 3000

// Serve all files in frontend
app.use(express.static(path.join(__dirname, '../frontend')));

// Start the Express server
app.listen(port, () => {
  console.log(`PS2-Alert-Notify listening at http://localhost:${port}`)
});
