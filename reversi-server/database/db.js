require('dotenv').config({ path: require('path').resolve('../.env') })

const knex = require('knex');
const config = require('./knexfile');

const db = knex(config);

(async () => {
  try {
    await db.raw('SELECT 1+1 AS result'); // Test connection
    console.log('Connected to MySQL database!');
    await db.migrate.latest();
    console.log('Database migrations applied!');
  } catch (error) {
    console.error('Error connecting to database or running migrations:', error);
  }
})();

module.exports = db;

