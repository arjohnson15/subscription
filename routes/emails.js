const express = require('express');
const router = express.Router();
const sendEmail = require('../utils/email');
const { EmailTemplate, User, Subscription, UserSubscription } = require('../models');
const { Op } = require('sequelize');

// Function to Get Users by Tags
async function getUsersByTags(tags) {
  try {
    const users = await User.findAll({
      where: {
        tags: {
          [Op.or]: tags.map(tag => ({
            [Op.like]: `%${tag}%`,
          })),
        },
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

// Send an Email
router.post('/send', async (req, res) => {
  try {
    const { recipient, subject, body, userId, bccTags } = req.body;

    if (!recipient || !subject || !body) {
      return res.status(400).json({ error: 'Recipient, subject, and body are required.' });
    }

    let replacements = {};

    // Load User Data if userId is provided
    if (userId) {
      const user = await User.findByPk(userId, {
        include: {
          model: UserSubscription,
          include: Subscription,
        },
      });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Build replacement object
      replacements = {
        name: user.name || '',
        email: user.email || '',
        username: user.username || '',
        password: user.password || '',
        implayerInfo: user.implayerInfo || '',
        deviceCount: user.deviceCount || '',
        plexExpiration: user.UserSubscriptions.find(sub => sub.Subscription.type === 'Plex')?.nextRenewalDate || '',
        iptvExpiration: user.UserSubscriptions.find(sub => sub.Subscription.type === 'IPTV')?.nextRenewalDate || '',
      };
    }

    // Replace placeholders in the email body
    const filledBody = body.replace(/\{\{(.*?)\}\}/g, (_, key) => {
		const trimmedKey = key.trim();
		return replacements[trimmedKey] !== undefined ? replacements[trimmedKey] : `{{${trimmedKey}}}`;
	});

    // Handle BCC Recipients
    let bccRecipients = [];
    if (bccTags && bccTags.length > 0) {
      const users = await User.findAll({
        where: {
          tags: { [Op.overlap]: bccTags }, // Ensure correct Sequelize operator
        },
      });
      bccRecipients = users.map(user => user.email);
    }

    await sendEmail(recipient, subject, filledBody, bccRecipients);

    res.json({ message: 'Email sent successfully' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Failed to send email' });
  }
});

module.exports = router;
