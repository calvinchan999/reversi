const authService = require('../services/authService');
const jwtService = require('../services/jwtService');

exports.googleAuth = async (req, res, next) => {
  try {
    const { 
      sub: google_id, 
      email, 
      name,
      given_name: first_name,
      family_name: last_name,
      picture: avatar_url,
      email_verified
    } = req.body;
   
    if (!email || !email_verified) {
      return res.status(400).json({ error: 'Valid email required' });
    }

    const user = await authService.findOrCreateGoogleUser({
      google_id, email, first_name, last_name, avatar_url
    });

    const token = jwtService.generateToken(user);

    res.json({ token });
  } catch (error) {
    next(error);
  }
};
