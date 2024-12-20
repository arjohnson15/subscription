const nodeCron = require('node-cron');
const { Sequelize } = require('sequelize');
const { UserSubscription, User, Subscription, EmailTemplate } = require('../models');
const sendEmail = require('../utils/email');
const { DateTime } = require('luxon');

/**
 * Function to send reminder emails for renewals
 */
async function sendRenewalReminders() {
    console.log("⏰ Running Scheduled Job for Renewal Reminders");

    // Define renewal reminder types and their respective template names
    const reminders = [
        { daysBefore: 7, templateName: 'IPTV Renewal Notice', type: 'IPTV' },
        { daysBefore: 2, templateName: 'IPTV Renewal Notice 2 Days', type: 'IPTV' },
        { daysBefore: 7, templateName: 'Plex Renewal Notice', type: 'Plex' },
        { daysBefore: 2, templateName: 'Plex Renewal Notice 2 Days', type: 'Plex' }
    ];

    const today = DateTime.now().setZone('America/Chicago');

    for (const reminder of reminders) {
        const checkDate = today.plus({ days: reminder.daysBefore }).toISODate();

        console.log(`🔍 Checking for renewals on: ${checkDate} for template: ${reminder.templateName}`);

        try {
            const subscriptions = await UserSubscription.findAll({
                where: Sequelize.where(
                    Sequelize.fn('DATE', Sequelize.col('nextRenewalDate')),
                    checkDate
                ),
                include: [
                    {
                        model: User,
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: Subscription,
                        where: {
                            type: reminder.type
                        },
                        attributes: ['id', 'name', 'type']
                    }
                ]
            });

            if (subscriptions.length === 0) {
                console.log(`ℹ️ No subscriptions found for ${reminder.templateName}`);
                continue;
            }

            const template = await EmailTemplate.findOne({
                where: Sequelize.where(
                    Sequelize.fn('LOWER', Sequelize.col('name')),
                    reminder.templateName.toLowerCase()
                )
            });

            if (!template) {
                console.error(`❌ Template "${reminder.templateName}" not found`);
                continue;
            }

            for (const subscription of subscriptions) {
                const { User: user, Subscription: sub } = subscription;

                if (!user || !sub) {
                    console.error("❌ User or Subscription not properly defined.");
                    continue;
                }

                const emailKey = `${user.email}-${sub.name}-${checkDate}`;
                console.log(`🔎 Checking email key: ${emailKey}`);

// Extract the exact date from the database field
const nextRenewalDate = subscription.nextRenewalDate
  ? new Date(subscription.nextRenewalDate).toISOString().split('T')[0]
  : 'N/A';

// Format the date to a readable format (optional)
const formattedNextRenewalDate = nextRenewalDate !== 'N/A'
  ? DateTime.fromISO(nextRenewalDate).toFormat('MMMM dd, yyyy')
  : 'N/A';

// Generate the email body with the extracted date
const emailBody = template.body
  .replace('{{name}}', user.name || '')
  .replace('{{subscriptionName}}', sub.name || '')
  .replace('{{nextRenewalDate}}', formattedNextRenewalDate)
  .replace('{{iptvExpiration}}', 
    sub.type === 'IPTV' ? formattedNextRenewalDate : 'N/A'
  )
  .replace('{{plexExpiration}}', 
    sub.type === 'Plex' ? formattedNextRenewalDate : 'N/A'
  );



                try {
                    await sendEmail(
                        user.email,
                        template.subject,
                        emailBody
                    );

                    console.log(`✅ Email sent to ${user.email} for ${reminder.templateName}`);
                } catch (emailError) {
                    console.error(`❌ Error sending email to ${user.email}:`, emailError.message);
                }
            }
        } catch (error) {
            console.error(`❌ Error fetching records for ${reminder.templateName}:`, error.message);
        }
    }
}

// Schedule the cron job to run every day at 8:00 AM CST
nodeCron.schedule('0 8 * * *', sendRenewalReminders);

// Export the function
module.exports = { sendRenewalReminders };
