// server.js
const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');

// Import Routes
const usersRouter = require('./routes/users');
const subscriptionsRouter = require('./routes/subscriptions');
const emailsRouter = require('./routes/emails');

// Import the Correct Cron Function
const { sendRenewalReminders } = require('./cron/reminderJobs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Define Routes
app.use('/users', usersRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/emails', emailsRouter);

// Manual Trigger Route for Testing
app.get("/test-cron", async (req, res) => {
  try {
    const { sendRenewalReminders } = require("./cron/reminderJobs");
    await sendRenewalReminders();
    res.send("Cron job executed successfully!");
  } catch (error) {
    console.error("Error triggering cron job:", error);
    res.status(500).send("Error executing cron job.");
  }
});

// Root Route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start Server
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
});
