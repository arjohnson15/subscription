const sqlite3 = require('sqlite3').verbose();

// Connect to the database
const db = new sqlite3.Database('./database.sqlite');

db.serialize(() => {
  // Query users
  db.all("SELECT * FROM Users", (err, rows) => {
    if (err) {
      console.error("Error fetching users:", err);
    } else {
      console.log("Users:", rows);
    }
  });

  // Query subscriptions
  db.all("SELECT * FROM Subscriptions", (err, rows) => {
    if (err) {
      console.error("Error fetching subscriptions:", err);
    } else {
      console.log("Subscriptions:", rows);
    }
  });

  // Query user subscriptions
  db.all("SELECT * FROM UserSubscriptions", (err, rows) => {
    if (err) {
      console.error("Error fetching user subscriptions:", err);
    } else {
      console.log("User Subscriptions:", rows);
    }
  });
});

db.close();
