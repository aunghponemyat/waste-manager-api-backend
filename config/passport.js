/* eslint-disable no-underscore-dangle */
require('dotenv').config({ path: './.env' });

const passportJWT = require('passport-jwt');

const JwtStrategy = require('passport-jwt').Strategy;
const { ExtractJwt } = require('passport-jwt');
const User = require('../models/user');

const jwtSecret = process.env.SECRET || 'WasteManager';

module.exports = function (passport) {
  passport.use(
    new JwtStrategy(
      {
        jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
        secretOrKey: jwtSecret,
      },
      async (jwtPayload, cb) => {
        try {
          const user = await User.findById(jwtPayload._id);
          cb(null, user);
        } catch (error) {
          cb(error);
        }
      },
    ),
  );
};
