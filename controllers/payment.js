/* eslint-disable consistent-return */
/* eslint-disable max-len */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-param-reassign */
const joi = require('joi');
// const moment = require('moment');
// const jwt = require('jsonwebtoken');
// const bcrypt = require('bcryptjs');
// const { ObjectId } = require('mongodb');
const Payment = require('../models/payment');

const TEST = async (req, res) => res.status(200).send('Welcome to Waste Manager API');

const TESTPOST = async (req, res) => {
  console.log('test payment action');
  console.log(req);
  res.redirect('https://waste-manager.net/thankyou');
};

const GETPAYMENTACTION = async (req, res) => {
  console.log('get payment action');
  console.log(req.body);
  // const {
  //   order_id,
  //   currency,
  //   amount,
  //   transaction_ref,
  //   approval_code,
  //   eci,
  //   transaction_datetime,
  //   payment_channel,
  //   payment_status,
  //   process_by,
  //   channel_response_code,
  //   channel_response_desc,
  //   masked_pan,
  //   hash_value,
  //   paid_channel,
  //   paid_agent,
  // } = req.body;

  // res.redirect('http://localhost:5000/thankyou');
  res.status(200).send('Welcome to Payment API');
};


const GET_ALL_PAYMENTS = async (req, res) => {
  try {
    const { where } = req.query;
    let query = {};
    if (where) {
      query = JSON.parse(where);
    }
    const payments = await Payment.find(query)
      .populate('organizationId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    return res.status(200).send({
      data: payments,
      message: 'Success',
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

const GET_SPECIFIC_PAYMENT = async (req, res) => {
  try {
    const { id } = req.params;
    const payment = await Payment.findOne({ _id: id })
      .populate('organizationId')
      .sort({ createdAt: -1 })
      .lean()
      .exec();
    if (payment) {
      // payment.createdAt = moment(user.createdAt).format('DD-MM-YYYY');
      return res.status(200).send({
        data: payment,
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

const CREATE_PAYMENT = async (req, res) => {
  const { body } = req;

  const schema = {
    invoiceNo: joi.string().required(),
    description: joi.string().required(),
    organization: joi.string().required(),
    amount: joi.number().required(),
    currency: joi.string().required(),
    invoiceDate: joi.date(),
    paymentStatus: joi.string(),
    servicePeriod: joi.object({
      start: joi.string(),
      end: joi.string(),
    }),
    invoiceUrl: joi.string(),
    paymentDueDate: joi.date(),
  };

  const { error } = joi.validate(body, schema);
  if (!error) {
    try {
      const newPayment = new Payment(req.body);
      await newPayment.save();

      return res.status(201).send({
        message: 'Successfully created a new payment',
        data: newPayment,
      });
    } catch (err) {
      res.status(500).json({ err });
    }
  } else {
    res.status(500).json({ error });
  }
};

const UPDATE_PAYMENT = (req, res) => {
  const query = { _id: req.params.id };
  const { body } = req;

  const schema = {
    invoiceNo: joi.string().required(),
    description: joi.string().required(),
    organizationId: joi.string().required(),
    currency: joi.string().required(),
    amount: joi.number().required(),
    invoiceDate: joi.date(),
    paymentStatus: joi.string(),
    servicePeriod: joi.object({
      start: joi.string(),
      end: joi.string(),
    }),
    invoiceUrl: joi.string(),
    paymentDueDate: joi.date(),
  };

  const { error } = joi.validate(body, schema);

  if (!error) {
    Payment.findOneAndUpdate(query, body, { upsert: false }, (err) => {
      if (err) return res.send(500, { error: err });
      return res.send('Successfully updated');
    });
  } else {
    res.send(500, { error });
  }
};

const DELETE_PAYMENT = async (req, res) => {
  const paymentId = req.params.id;
  Payment.findByIdAndDelete(paymentId, (err) => {
    if (err) return res.send(500, { error: err });
    return res.send('Successfully deleted');
  });
};

const GET_PAYMENTS_FOR_SPECIFIC_ORGANIZATION = async (req, res) => {
  try {
    const { id } = req.params;
    const payments = await Payment.find({ organization: id })
      .populate('organization')
      .lean()
      .exec();
    return res.status(200).send({
      data: payments,
      message: 'Success',
    });
  } catch (error) {
    res.status(500).json(error);
  }
};

module.exports = {
  GET_ALL_PAYMENTS,
  GET_SPECIFIC_PAYMENT,
  CREATE_PAYMENT,
  UPDATE_PAYMENT,
  DELETE_PAYMENT,
  GET_PAYMENTS_FOR_SPECIFIC_ORGANIZATION,
  TEST,
  TESTPOST,
  GETPAYMENTACTION,
};
