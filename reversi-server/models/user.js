const db = require("../database/db");

const USER_FIELDS = [
  "id",
  "username",
  "email",
  "is_anonymous",
  "google_id",
  "avatar_url",
  "first_name",
  "last_name",
  "auth_provider",
  "status",
  "last_login",
  "role",
  "created_at",
  "updated_at",
];

exports.findById = (id) => {
  return db("users").where({ id }).first().select(USER_FIELDS);
};

exports.findByGoogleId = (google_id) => {
  return db("users").where({ google_id }).first().select(USER_FIELDS);
};

exports.create = async (user) => {
  const [id] = await db("users").insert(user);
  return this.findById(id);
};

exports.update = (id, updates) => {
  return db("users").where({ id }).update(updates);
};
