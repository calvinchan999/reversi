const User = require("../models/user");
const crypto = require("crypto");

exports.findOrCreateGoogleUser = async (userData) => {
  let user = await User.findByGoogleId(userData.google_id);

  if (!user) {
    const newUser = {
      ...userData,
      username: userData.email.split("@")[0],
      auth_provider: "google",
      status: "active",
      role: "user",
    };
    user = await User.create(newUser);
  } else {
    user = await User.update(user.id, {
      ...userData,
      last_login: new Date(),
    });
  }

  return user;
};

exports.createAnonymous = async (userData) => {
  const id = await crypto.randomBytes(20).toString('hex');
  const newUser = {
    ...userData,
    username: `Anonymous_${id}`,
    auth_provider: "anonymous",
    status: "active",
    role: "user",
  };
  user = await User.create(newUser);

  return user;
};
