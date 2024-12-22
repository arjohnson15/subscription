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

    if (subscriptions && subscriptions.length > 0) {
      for (const sub of subscriptions) {
        const subscription = await Subscription.findByPk(sub.id);
        if (subscription) {
          await UserSubscription.destroy({
            where: {
              userId: user.id,
              type: subscription.type,
            },
          });

          const startDate = new Date();
          const nextRenewalDate = sub.nextRenewalDate
            ? new Date(sub.nextRenewalDate)
            : new Date(startDate.setMonth(startDate.getMonth() + subscription.renewalPeriodMonths));

          await UserSubscription.create({
            userId: user.id,
            subscriptionId: subscription.id,
            startDate,
            nextRenewalDate,
            type: subscription.type,
          });
        }
      }
    }

    if (removals && removals.length > 0) {
      await UserSubscription.destroy({
        where: {
          userId: user.id,
          type: {
            [Sequelize.Op.in]: removals,
          },
        },
      });
    }

    if (freeUser) {
      await UserSubscription.destroy({
        where: {
          userId: user.id,
          type: 'Plex',
        },
      });
    }

    res.status(201).json({ message: 'User saved successfully' });
  } catch (error) {
    console.error('Error saving user:', error);
    res.status(500).json({ error: 'Failed to save user' });
  }
});


// Update User by ID
router.put('/:id', async (req, res) => {
  console.log('Received data:', req.body); // Log incoming data for debugging

  try {
    const { id } = req.params;
    const {
      name, email, tags, username, password, implayerInfo,
      deviceCount, freeUser, subscriptions, removals, owner,
    } = req.body;

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user fields
    await user.update({
      name,
      email,
      tags: tags || [],
      username: username || '',
      password: password || '',
      implayerInfo: implayerInfo || '',
      deviceCount: deviceCount || 0,
      freeUser: freeUser || false,
      owner: owner || '',
    });
    console.log('Updated user:', user);

    // Handle removals
 if (removals && removals.length > 0) {
  for (const type of removals) {
    console.log(`Removing subscription of type: ${type} for user ID: ${id}`);
    await UserSubscription.destroy({
      where: { userId: id, type },
    });
  }
}

// Automatically remove Plex subscription if Free User is enabled
if (freeUser) {
  console.log(`Free User selected. Removing Plex subscription for user ID: ${id}`);
  await UserSubscription.destroy({
    where: { userId: id, type: 'Plex' },
  });
}

    // Handle subscriptions
if (subscriptions && subscriptions.length > 0) {
  for (const subscription of subscriptions) {
    const { type, subscriptionId, nextRenewalDate } = subscription;

    // Fetch the subscription details
    const subDetails = await Subscription.findByPk(subscriptionId);
    if (!subDetails) {
      console.warn(`Subscription ID ${subscriptionId} not found`);
      continue;
    }

    // Calculate `startDate` and use `nextRenewalDate` if provided
    const startDate = new Date();
    const renewalDate = nextRenewalDate ? new Date(nextRenewalDate) : new Date();
    if (!nextRenewalDate) {
      renewalDate.setMonth(startDate.getMonth() + subDetails.renewalPeriodMonths);
    }

    // Check if the subscription exists for the user
    const existing = await UserSubscription.findOne({
      where: { userId: id, type },
    });

    if (existing) {
      // Update the subscription
      await existing.update({
        subscriptionId,
        startDate,
        nextRenewalDate: renewalDate,
      });
      console.log(`Updated subscription: ${type} for user ID: ${id}`);
    } else {
      // Create a new subscription
      await UserSubscription.create({
        userId: id,
        type,
        subscriptionId,
        startDate,
        nextRenewalDate: renewalDate,
      });
      console.log(`Created new subscription: ${type} for user ID: ${id}`);
    }
  }
}


    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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

      const plexSub = user.UserSubscriptions.find(sub => sub.Subscription.type === 'Plex');
      const iptvSub = user.UserSubscriptions.find(sub => sub.Subscription.type === 'IPTV');

      const plexExpiration = userData.freeUser
        ? 'FREE'
        : plexSub && plexSub.nextRenewalDate
          ? plexSub.nextRenewalDate.toISOString().split('T')[0]
          : '';

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

// Get user by email
router.get("/email/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({
      where: { email },
      include: {
        model: UserSubscription,
        include: Subscription,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("Error fetching user by email:", error);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});


// Fetch User by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findByPk(id, {
      include: {
        model: UserSubscription,
        include: {
          model: Subscription,
          attributes: ['id', 'name', 'type'], // Include subscription name and type
        },
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
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
