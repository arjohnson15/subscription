const nodeCron = require('node-cron');
const nodemailer = require('nodemailer');
const UserSubscription = require('../models/UserSubscription');
const User = require('../models/User');
const Subscription = require('../models/Subscription');

// Configure nodemailer transporter
// IMPORTANT: Replace 'yourgmail@example.com' and 'yourpassword' with valid credentials.
// For Gmail, consider using an App Password if you're using 2-factor auth.
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'johnsonflixemail@gmail.com',
    pass: 'ammrxksmskyaepwm'
  }
});

// Schedule the job to run daily at midnight
nodeCron.schedule('0 0 * * *', async () => {
  const today = new Date();
  const reminderDate = new Date();
  reminderDate.setDate(today.getDate() + 7);

  // Find all user subscriptions that renew in 7 days
  const dueSubscriptions = await UserSubscription.findAll({
    where: {
      nextRenewalDate: reminderDate
    },
    include: [User, Subscription]
  });

  // Send reminder emails
  for (const record of dueSubscriptions) {
    const { User: user, Subscription: subscription } = record;

    await transporter.sendMail({
      from: 'yourgmail@example.com',   // match the user above
      to: user.email,
      subject: `Your subscription ${subscription.name} is coming up for renewal`,
      text: `Hello ${user.name},\n\nYour subscription to ${subscription.name} will renew on ${record.nextRenewalDate.toDateString()}.\n\nThank you!`
    });
  }
});
