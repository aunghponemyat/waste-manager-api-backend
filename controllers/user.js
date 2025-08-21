/* eslint-disable consistent-return */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const joi = require('joi');
const moment = require('moment');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { ObjectId } = require('mongodb');

const config = require('../config/config');
const User = require('../models/user');

const GET_ALL_USERS = async (req, res) => {
  try {
    const { where } = req.query;
    let query = {};
    if (where) {
      query = JSON.parse(where);
    }
    const users = await User.find(query)
      .populate('organizationId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    // eslint-disable-next-line array-callback-return
    users.map((user) => {
      delete user.password;
      user.createdAt = moment(user.createdAt).format('DD-MM-YYYY');
    });
    return res.status(200).send({
      data: users,
      message: 'Success',
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

const GET_SPECIFIC_USER = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findOne({ _id: id })
      .populate('organizationId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (user) {
      delete user.password;
      user.createdAt = moment(user.createdAt).format('DD-MM-YYYY');
      return res.status(200).send({
        data: user,
        message: 'Success',
      });
    }
    return res.sendStatus(404);
  } catch (error) {
    if (error.name && error.name === 'CastError') {
      return res.sendStatus(404);
    }
    res.status(500).json(error);
  }
};

const LOG_IN = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.sendStatus(400);
    }
    const user = await User.findOne({ email })
      .populate('organizationId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (user) {
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err) return res.status(500).json(err);
        if (isMatch) {
          delete user.password;
          user.createdAt = moment(user.createdAt).format('DD-MM-YYYY');
          const token = jwt.sign(
            { email },
            config.jwtSecret,
            { expiresIn: '1h' },
          );
          return res.status(200).send({
            data: user,
            token,
            message: 'Success',
          });
        }
        return res.sendStatus(401);
      });
    } else {
      return res.sendStatus(401);
    }
  } catch (error) {
    return res.status(500).json(error);
  }
};


const CREATE_USER = async (req, res) => {
  const { body } = req;

  const schema = {
    name: joi.string().required(),
    email: joi
      .string()
      .email()
      .required(),
    phoneNumber: joi.string(),
    profileImage: joi.string(),
    type: joi.string().required(),
    organizationId: joi.string(),
  };

  const { error } = joi.validate(body, schema);
  if (!error) {
    try {
      const { email, phoneNumber, organizationId } = body;
      const userType = body.type;
      const password = 'waste_manager';
      const emailExist = await User.find({ email });
      // const phoneNumberExist = await User.find({ phoneNumber });

      if (emailExist && emailExist.length) {
        return res.status(409).json('Email address already exist');
      }

      // if (phoneNumberExist && phoneNumberExist.length) {
      //   return res.status(409).json('Phone Number already exist');
      // }

      if (userType === 3 && organizationId.length === 0) {
        // no need to check type using ===
        return res.status(406).json('User must have an organization');
      }

      const newUser = new User(req.body);
      newUser.organizationId = organizationId || null;
      newUser.password = password;
      await newUser.save();

      return res.status(201).send({
        message: 'Successfully created a new user',
      });
    } catch (err) {
      res.status(500).json({ err });
    }
  } else {
    res.status(500).json({ error });
  }
};

const UPDATE_USER = (req, res) => {
  const query = { _id: req.params.id };
  const { body } = req;

  const schema = {
    name: joi.string(),
    email: joi
      .string()
      .email(),
    phoneNumber: joi.string(),
    profileImage: joi.string(),
    type: joi.string(),
    // organizationId: joi.string(),
    organizationId: [joi.string().optional(), joi.allow(null)],
    isConfirm: joi.boolean(),
  };

  const { error } = joi.validate(body, schema);

  if (!error) {
    User.findOneAndUpdate(query, body, { upsert: false }, (err) => {
      if (err) return res.send(500, { error: err });
      return res.send('Successfully updated');
    });
  } else {
    res.send(500, { error });
  }
};

const CHANGE_PASSWORD = async (req, res) => {
  const query = { _id: ObjectId(req.params.id) };
  const { body } = req;

  const schema = {
    currentPassword: joi.string(),
    newPassword: joi.string(),
  };

  const { error } = joi.validate(body, schema);

  if (!error) {
    let userPassword = await User.findOne(
      query,
      { password: 1, _id: 0 },
    );
    userPassword = userPassword.password;
    bcrypt.compare(body.currentPassword, userPassword, async (err, response) => {
      if (response === true) {
        const salt = await bcrypt.genSalt(10);
        const hash = await bcrypt.hash(body.newPassword, salt);
        // eslint-disable-next-line no-shadow
        User.findOneAndUpdate(query, { password: hash }, { upsert: false }, (err) => {
          if (err) return res.send(500, { error: err });
          return res.status(200).send('Successfully updated');
        });
      } else if (response === false) {
        return res.status(401).json({
          message: 'Auth Failed',
        });
      }
      // return res.status(500).send(response);
    });
  } else {
    res.send(500, { error });
  }
};

const DELETE_USER = async (req, res) => {
  const userId = req.params.id;
  User.findByIdAndDelete(userId, (err) => {
    if (err) return res.send(500, { error: err });
    return res.send('Successfully deleted');
  });
};

module.exports = {
  GET_ALL_USERS,
  GET_SPECIFIC_USER,
  LOG_IN,
  CREATE_USER,
  UPDATE_USER,
  CHANGE_PASSWORD,
  DELETE_USER,
};
