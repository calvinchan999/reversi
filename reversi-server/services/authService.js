const User = require('../models/user');

exports.findOrCreateGoogleUser = async (userData) => {
  let user = await User.findByGoogleId(userData.google_id);

  if (!user) {
    const newUser = {
      ...userData,
      username: userData.email.split('@')[0],
      auth_provider: 'google',
      status: 'active',
      role: 'user'
    };
    [user] = await User.create(newUser);
  } else {
    await User.update(user.id, {
      ...userData,
      last_login: new Date()
    });
  }

  return user;
};
