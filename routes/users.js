const express = require('express');
const router = express.Router();
const { User, Subscription, UserSubscription, Sequelize } = require('../models');

// Create or Update User
router.post('/', async (req, res) => {
  try {
    const {
      id, name, email, tags, username, password, implayerInfo, deviceCount,
      freeUser, subscriptions, removals, owner
    } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and Email are required.' });
    }

    let user;

    if (id) {
      // Update Existing User
      user = await User.findByPk(id);
      if (!user) return res.status(404).json({ error: 'User not found' });

      await user.update({
        name,
        email,
        tags: tags || [],
        username: username || '',
        password: password || '',
        implayerInfo: implayerInfo || '',
        deviceCount: deviceCount || 0,
        freeUser: freeUser || false,
        owner: owner || ''
      });
    } else {
      // Create New User
      user = await User.create({
        name,
        email,
        tags: tags || [],
        username: username || '',
        password: password || '',
        implayerInfo: implayerInfo || '',
        deviceCount: deviceCount || 0,
        freeUser: freeUser || false,
        owner: owner || ''
      });
    }

    // Handle Subscriptions
    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        const subscription = await Subscription.findByPk(sub.id);
        if (subscription) {
          const startDate = new Date();
          const nextRenewalDate = sub.nextRenewalDate
            ? new Date(sub.nextRenewalDate)
            : new Date(startDate.setMonth(startDate.getMonth() + subscription.renewalPeriodMonths));

          await UserSubscription.upsert({
            userId: user.id,
            subscriptionId: subscription.id,
            startDate,
            nextRenewalDate,
          });
        }
      }
    }

    // Handle Subscription Removals
    if (removals && removals.length > 0) {
      for (const type of removals) {
        const subToRemove = await UserSubscription.findOne({
          where: { userId: user.id },
          include: {
            model: Subscription,
            where: { type },
          },
        });
        if (subToRemove) {
          await subToRemove.destroy();
        }
      }
    }

    // If freeUser is true, remove any Plex subscription
    if (freeUser) {
      const plexToRemove = await UserSubscription.findOne({
        where: { userId: user.id },
        include: {
          model: Subscription,
          where: { type: 'Plex' },
        },
      });
      if (plexToRemove) {
        await plexToRemove.destroy();
      }
    }

    res.status(201).json({ message: 'User saved successfully' });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});

// Update User by ID
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const {
      name, email, tags, username, password, implayerInfo, deviceCount, freeUser, subscriptions, removals, owner
    } = req.body;

    await user.update({
      name,
      email,
      tags: tags || [],
      username: username || '',
      password: password || '',
      implayerInfo: implayerInfo || '',
      deviceCount: deviceCount || 0,
      freeUser: freeUser || false,
      owner: owner || ''
    });

    // Update Subscriptions
    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        const subscription = await Subscription.findByPk(sub.id);
        if (subscription) {
          const startDate = new Date();
          const nextRenewalDate = sub.nextRenewalDate
            ? new Date(sub.nextRenewalDate)
            : new Date(startDate.setMonth(startDate.getMonth() + subscription.renewalPeriodMonths));

          await UserSubscription.upsert({
            userId: user.id,
            subscriptionId: subscription.id,
            startDate,
            nextRenewalDate,
          });
        }
      }
    }

    // Handle Subscription Removals
    if (removals && removals.length > 0) {
      for (const type of removals) {
        const subToRemove = await UserSubscription.findOne({
          where: { userId: user.id },
          include: {
            model: Subscription,
            where: { type },
          },
        });
        if (subToRemove) {
          await subToRemove.destroy();
        }
      }
    }

    // If freeUser is true, remove any Plex subscription
    if (freeUser) {
      const plexToRemove = await UserSubscription.findOne({
        where: { userId: user.id },
        include: {
          model: Subscription,
          where: { type: 'Plex' },
        },
      });
      if (plexToRemove) {
        await plexToRemove.destroy();
      }
    }

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Fetch All Users
router.get('/', async (req, res) => {
  try {
    const users = await User.findAll({
      include: {
        model: UserSubscription,
        include: Subscription,
      },
    });

    const formattedUsers = users.map((user) => {
      const userData = user.get({ plain: true });

      // Find Plex and IPTV subscriptions
      const plexSub = user.UserSubscriptions.find(sub => sub.Subscription.type === 'Plex');
      const iptvSub = user.UserSubscriptions.find(sub => sub.Subscription.type === 'IPTV');

      // If freeUser, plexExpiration is 'FREE'; otherwise use date or ''
      let plexExpiration = '';
      if (userData.freeUser) {
        plexExpiration = 'FREE';
      } else {
        plexExpiration = plexSub && plexSub.nextRenewalDate
          ? plexSub.nextRenewalDate.toISOString().split('T')[0]
          : '';
      }

      const iptvExpiration = iptvSub && iptvSub.nextRenewalDate
        ? iptvSub.nextRenewalDate.toISOString().split('T')[0]
        : '';

      return {
        ...userData,
        plexExpiration,
        iptvExpiration,
      };
    });

    res.json(formattedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Fetch User by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id, {
      include: {
        model: UserSubscription,
        include: Subscription,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Delete User
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findByPk(id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await UserSubscription.destroy({ where: { userId: id } });
    await user.destroy();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;