const express = require('express');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');

// Import Routes
const usersRouter = require('./routes/users');
const subscriptionsRouter = require('./routes/subscriptions');
const emailsRouter = require('./routes/emails');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(express.static('public'));

// Define Routes
app.use('/users', usersRouter);
app.use('/subscriptions', subscriptionsRouter);
app.use('/emails', emailsRouter);

// Root Route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Start Server
sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
});
