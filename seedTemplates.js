const { EmailTemplate, sequelize } = require('./models');

async function seedTemplates() {
  try {
    await sequelize.sync();

    const templates = [
      {
        name: 'Welcome IPTV',
        subject: 'Welcome to Our IPTV Service',
        body: 'Dear [Name],\n\nThank you for subscribing to our IPTV service! Enjoy your content.',
      },
      {
        name: 'Welcome Plex',
        subject: 'Welcome to Our Plex Service',
        body: 'Dear [Name],\n\nYour Plex subscription is now active. Enjoy streaming!',
      },
      {
        name: 'Welcome IPTV and Plex',
        subject: 'Welcome to IPTV and Plex',
        body: 'Dear [Name],\n\nYou now have access to both IPTV and Plex services. Enjoy!',
      },
      {
        name: 'Plex Renewal Notice',
        subject: 'Plex Subscription Renewal Reminder',
        body: 'Dear [Name],\n\nYour Plex subscription is about to expire. Renew today!',
      },
      {
        name: 'IPTV Renewal Notice',
        subject: 'IPTV Subscription Renewal Reminder',
        body: 'Dear [Name],\n\nYour IPTV subscription is about to expire. Renew to avoid interruptions.',
      },
    ];

    await EmailTemplate.bulkCreate(templates);
    console.log('Templates seeded successfully!');
    process.exit();
  } catch (error) {
    console.error('Error seeding templates:', error);
    process.exit(1);
  }
}

seedTemplates();
