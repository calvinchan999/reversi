const db = require('../database/db');

exports.findByGoogleId = (google_id) => {
  return db('users').where({ google_id }).first();
};

exports.create = (user) => {
  return db('users').insert(user).returning('*');
};

exports.update = (id, updates) => {
  return db('users').where({ id }).update(updates);
};
