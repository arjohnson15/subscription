const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/email');
const { EmailTemplate, User, Subscription, UserSubscription } = require('../models');
const { Op } = require('sequelize');
const { DateTime } = require('luxon');

// Function to Get Users by Tags
async function getUsersByTags(tags) {
  try {
    const users = await User.findAll({
      where: {
        [Op.or]: tags.map(tag => ({
          tags: { [Op.like]: `%${tag}%` }
        }))
      },
      attributes: ['email'],
    });
    return users.map(user => user.email);
  } catch (error) {
    console.error('Error fetching BCC emails:', error);
    throw error;
  }
}

// Create a New Template
router.post('/templates', async (req, res) => {
  try {
    const { name, subject, body } = req.body;
    if (!name || !subject || !body) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const newTemplate = await EmailTemplate.create({ name, subject, body });
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Error creating template:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Get All Templates
router.get('/templates', async (req, res) => {
  try {
    const templates = await EmailTemplate.findAll();
    res.json(templates);
  } catch (error) {
    console.error('Error fetching templates:', error);
    res.status(500).json({ error: 'Failed to fetch templates' });
  }
});

// Get Template by ID
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json(template);
  } catch (error) {
    console.error('Error fetching template:', error);
    res.status(500).json({ error: 'Failed to fetch template' });
  }
});

// Update a Template
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body } = req.body;

    const template = await EmailTemplate.findByPk(id);
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await template.update({ subject, body });
    res.json({ message: 'Template updated successfully' });
  } catch (error) {
    console.error('Error updating template:', error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

// Delete a Template
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await EmailTemplate.findByPk(id);

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    await template.destroy();
    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Function to format dates
const formatDate = (date) => {
  if (!date) return 'N/A';
  try {
    return DateTime.fromISO(new Date(date).toISOString().split('T')[0]).toFormat('MMMM dd, yyyy');
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'N/A';
  }
};

// Send an Email
router.post('/send', async (req, res) => {
  try {
    const { recipient, subject, body, userId, bccTags } = req.body;

    if (!recipient || !subject || !body) {
      return res.status(400).json({ error: 'Recipient, subject, and body are required.' });
    }

    const recipients = recipient.split(',').map(email => email.trim());
    let emailPromises = [];
    let bccRecipients = [];

    // Handle BCC Recipients and Prepare Replacements
    if (bccTags && bccTags.length > 0) {
      console.log("Resolving users for BCC tags:", bccTags);

      const users = await User.findAll({
        where: {
          [Op.or]: bccTags.map(tag => ({
            tags: { [Op.like]: `%${tag}%` },
          })),
        },
        include: {
          model: UserSubscription,
          include: Subscription,
        },
      });

      emailPromises = users.map(async (user) => {
        const iptvSubscription = user.UserSubscriptions.find(sub => sub.Subscription.type === 'IPTV');
        const plexSubscription = user.UserSubscriptions.find(sub => sub.Subscription.type === 'Plex');

        const formatDate = (dateString) => {
          if (!dateString) return 'N/A';
          return DateTime.fromISO(new Date(dateString).toISOString().split('T')[0]).toFormat('MMMM dd, yyyy');
        };

        const replacements = {
          name: user.name || 'N/A',
          email: user.email || 'N/A',
          username: user.username || 'N/A',
          password: user.password || 'N/A',
          implayerInfo: user.implayerInfo || 'N/A',
          deviceCount: user.deviceCount || 'N/A',
          subscriptionName: iptvSubscription?.Subscription?.name || 'N/A',
          iptvExpiration: iptvSubscription?.nextRenewalDate ? formatDate(iptvSubscription.nextRenewalDate) : 'N/A',
          plexExpiration: plexSubscription?.nextRenewalDate ? formatDate(plexSubscription.nextRenewalDate) : 'N/A',
        };

        console.log("BCC User Replacements:", replacements);

        // Replace placeholders in the body for each BCC user
        const filledBody = body.replace(/\{\{(.*?)\}\}/g, (_, key) => {
          const trimmedKey = key.trim();
          const replacementValue = replacements[trimmedKey];
          console.log(`Replacing {{${trimmedKey}}} with:`, replacementValue || `[MISSING: ${trimmedKey}]`);
          return replacementValue !== undefined
            ? replacementValue
            : `[MISSING: ${trimmedKey}]`; // Leave placeholder if not found
        });

        console.log("Final Filled Email Body for BCC:", filledBody);

        // Send the email to the BCC user
        await sendEmail(user.email, subject, filledBody, []);
      });
    }

    // Handle Multiple Recipients Entered Manually
    if (recipients && recipients.length > 0) {
      console.log("Processing multiple recipients:", recipients);

      const recipientPromises = recipients.map(async (email) => {
        // Fetch user data based on email
        const user = await User.findOne({
          where: { email },
          include: {
            model: UserSubscription,
            include: Subscription,
          },
        });

        if (!user) {
          console.warn(`User not found for email: ${email}`);
          return; // Skip this email if user not found
        }

        const iptvSubscription = user.UserSubscriptions.find(sub => sub.Subscription.type === 'IPTV');
        const plexSubscription = user.UserSubscriptions.find(sub => sub.Subscription.type === 'Plex');

        const formatDate = (dateString) => {
          if (!dateString) return 'N/A';
          return DateTime.fromISO(new Date(dateString).toISOString().split('T')[0]).toFormat('MMMM dd, yyyy');
        };

        const replacements = {
          name: user.name || 'N/A',
          email: user.email || 'N/A',
          username: user.username || 'N/A',
          password: user.password || 'N/A',
          implayerInfo: user.implayerInfo || 'N/A',
          deviceCount: user.deviceCount || 'N/A',
          subscriptionName: iptvSubscription?.Subscription?.name || 'N/A',
          iptvExpiration: iptvSubscription?.nextRenewalDate ? formatDate(iptvSubscription.nextRenewalDate) : 'N/A',
          plexExpiration: plexSubscription?.nextRenewalDate ? formatDate(plexSubscription.nextRenewalDate) : 'N/A',
        };

        console.log(`Replacements for ${email}:`, replacements);

        // Replace placeholders in the body
        const filledBody = body.replace(/\{\{(.*?)\}\}/g, (_, key) => {
          const trimmedKey = key.trim();
          const replacementValue = replacements[trimmedKey];
          console.log(`Replacing {{${trimmedKey}}} with:`, replacementValue || `[MISSING: ${trimmedKey}]`);
          return replacementValue !== undefined
            ? replacementValue
            : `[MISSING: ${trimmedKey}]`; // Leave placeholder if not found
        });

        console.log(`Final Email Body for ${email}:`, filledBody);

        // Send the email
        await sendEmail(email, subject, filledBody, []);
      });

      emailPromises.push(...recipientPromises);
    }

    await Promise.all(emailPromises);
    res.json({ message: 'Emails sent successfully' });
  } catch (error) {
    console.error('Unexpected Error:', error);
    res.status(500).json({ error: 'An unexpected error occurred' });
  }
});



module.exports = router;



module.exports = router;
