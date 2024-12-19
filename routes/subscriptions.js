const express = require('express');
const router = express.Router();
const { Subscription, UserSubscription, User } = require('../models');
const { Op } = require('sequelize');

// Create Subscription
router.post('/', async (req, res) => {
  try {
    const { name, type, renewalPeriodMonths, streams } = req.body;

    // Validate the request
    if (!name || !type || !renewalPeriodMonths) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Create the subscription
    const subscription = await Subscription.create({
      name,
      type,
      renewalPeriodMonths,
      streams: type === 'IPTV' ? streams || 1 : null,
    });

    res.status(201).json(subscription);
  } catch (error) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// Fetch All Subscriptions
router.get('/', async (req, res) => {
  try {
    const subscriptions = await Subscription.findAll({
      order: [['createdAt', 'ASC']],
    });
    res.json(subscriptions);
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// Fetch Expiring Subscriptions This Month
router.get('/expiring-this-month', async (req, res) => {
  try {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const expiringSubscriptions = await UserSubscription.findAll({
      where: {
        nextRenewalDate: {
          [Op.between]: [now, endOfMonth],
        },
      },
      include: [
        {
          model: User,
          attributes: ['name', 'email'],
        },
        {
          model: Subscription,
          attributes: ['name', 'type'],
        },
      ],
    });

    res.json(expiringSubscriptions);  // Return empty array if no results found
  } catch (error) {
    console.error('Error fetching expiring subscriptions:', error);
    res.status(500).json({ error: 'Failed to fetch expiring subscriptions' });
  }
});

// Fetch Single Subscription by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const subscription = await Subscription.findByPk(id);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    res.json(subscription);
  } catch (error) {
    console.error('Error fetching subscription:', error);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// Update Subscription
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, renewalPeriodMonths, streams } = req.body;

    const subscription = await Subscription.findByPk(id);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await subscription.update({
      name,
      type,
      renewalPeriodMonths,
      streams: type === 'IPTV' ? streams || 1 : null,
    });

    res.json(subscription);
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: 'Failed to update subscription' });
  }
});

// Delete Subscription
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const subscription = await Subscription.findByPk(id);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    await subscription.destroy();
    res.json({ message: 'Subscription deleted successfully' });
  } catch (error) {
    console.error('Error deleting subscription:', error);
    res.status(500).json({ error: 'Failed to delete subscription' });
  }
});

module.exports = router;
