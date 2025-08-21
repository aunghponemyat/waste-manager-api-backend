/* eslint-disable no-underscore-dangle */
/* eslint-disable no-plusplus */
const moment = require('moment');
const { ObjectId } = require('mongodb');

const Organization = require('../models/organization');
const User = require('../models/user');
const Logistics = require('../models/logistics');
const Training = require('../models/training');

const GREET = async (req, res) => res.status(200).send('Welcome to Waste Manager API');

const GET_DASHBOARD_DATA = async (req, res) => {
  try {
    const organizations = await Organization.countDocuments({});
    const users = await User.countDocuments({});
    const logistics = await Logistics.countDocuments({});
    const trainings = await Training.countDocuments({});
    const wastes = await Logistics.find({ items: { $ne: [] } }, { items: 1, _id: 0 });
    let collectedWastes = 0;
    for (let i = 0; i < wastes.length; i++) {
      for (let j = 0; j < wastes[i].items.length; j++) {
        collectedWastes += parseFloat(wastes[i].items[j].quantity);
      }
    }
    return res.status(200).send({
      data: {
        organizations,
        users,
        logistics,
        trainings,
        collectedWastes: parseFloat(collectedWastes.toFixed(2)),
      },
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const GET_WASTE_DATA = async (req, res) => {
  try {
    const logistics = await Logistics.find({ items: { $ne: [] } }, { items: 1, _id: 0 });
    // const logistics = await Logistics.find(
    //   {
    //     items: {
    //       $eq: {
    //         unit: 'kg',
    //         _id: '5dde478340ef396ed47dab54',
    //         productName: 'Shredded',
    //         productType: 'Papers',
    //       },
    //     },
    //   }, { items: 1, _id: 1 },
    // );
    let items = [];
    for (let i = 0; i < logistics.length; i++) {
      items = items.concat(logistics[i].items);
    }

    const data = {};
    for (let i = 0; i < items.length; i++) {
      if (data[items[i].productType]) {
        data[items[i].productType].quantity += parseFloat(items[i].quantity);
        data[items[i].productType].quantity = parseFloat(
          data[items[i].productType].quantity.toFixed(2),
        );
      } else {
        data[items[i].productType] = {
          quantity: parseFloat(items[i].quantity.toFixed(2)),
          unit: items[i].unit,
        };
      }
    }

    const reportData = [];

    Object.keys(data).forEach((item) => {
      reportData.push({
        name: item,
        quantity: parseFloat(data[item].quantity.toFixed(2)),
        unit: data[item].unit,
      });
    });

    return res.status(200).send({
      data: reportData,
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const GET_TOTAL_WASTE_BY_ORGANIZATION = async (req, res) => {
  try {
    const organizationId = req.params.id;
    let { duration } = req.query;
    let logistics = null;
    if (duration) {
      duration = JSON.parse(duration);
      logistics = await Logistics.find(
        {
          organizationId: ObjectId(organizationId),
          items: { $ne: [] },
          pickUpTime: { $gt: duration.from, $lt: duration.to },
        },
        { items: 1, pickUpTime: 1 },
      ).sort({ pickUpTime: 1 });
    } else {
      logistics = await Logistics.find(
        {
          organizationId: ObjectId(organizationId),
          items: { $ne: [] },
        },
        { items: 1, pickUpTime: 1 },
      ).sort({ pickUpTime: 1 });
    }
    let items = [];
    for (let i = 0; i < logistics.length; i++) {
      items = items.concat(logistics[i].items);
    }

    const data = {};
    for (let i = 0; i < items.length; i++) {
      if (data[items[i].productType]) {
        data[items[i].productType].quantity += items[i].quantity;
      } else {
        data[items[i].productType] = {
          quantity: items[i].quantity,
          unit: items[i].unit,
        };
      }
    }

    const reportData = [];

    Object.keys(data).forEach((item) => {
      reportData.push({
        name: item,
        quantity: parseFloat(data[item].quantity.toFixed(2)),
        unit: data[item].unit,
      });
    });

    return res.status(200).send({
      data: reportData,
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const GET_TOTAL_PICKUPS_BY_ORGANIZATION = async (req, res) => {
  try {
    const organizationId = req.params.id;
    let { duration } = req.query;
    let logistics = null;
    if (duration) {
      duration = JSON.parse(duration);
      logistics = await Logistics.countDocuments(
        {
          organizationId: ObjectId(organizationId),
          status: 'COMPLETED',
          pickUpTime: { $gt: duration.from, $lt: duration.to },
        },
      );
    } else {
      logistics = await Logistics.countDocuments(
        {
          organizationId: ObjectId(organizationId),
          status: 'COMPLETED',
        },
      );
    }
    
    return res.status(200).send({
      data: logistics,
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const GET_CONTRACT_DURATION_BY_ORGANIZATION = async (req, res) => {
  try {
    const organizationId = req.params.id;
    let contracts = await Organization.findOne(
      {
        _id: ObjectId(organizationId),
      },
      {
        contracts: 1, _id: 0
      }
    );
    contracts = contracts.contracts;
    const contractStartDate = contracts[0].startDate;
    const contractEndDate = contracts[contracts.length - 1].endDate;
    return res.status(200).send({
      data: {
        contractStartDate: contractStartDate,
        contractEndDate: contractEndDate,
      },
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

// const GET_MONTHLY_COLLECTED_WASTE_DATA = async (req, res) => {
//   try {
//     // const logistics = await Logistics.find({ items: { $ne: [] } }, { items: 1, _id: 0 });
//     const monthlyData = await Logistics.aggregate(
//       [
//         { $unwind: '$items' },
//         {
//           $project: {
//             month: {
//               $month: '$pickUpTime',
//             },
//             year: {
//               $year: '$pickUpTime',
//             },
//             items: '$items',
//           },
//         },
//         {
//           $group: {
//             _id: {
//               type: '$items.productType',
//               month: '$month',
//               year: '$year',
//             },
//             total: { $sum: '$items.quantity' },
//           },
//         },
//       ],
//     );

//     const data = {};

//     Object.keys(monthlyData).forEach((item) => {
//       let date = new Date(monthlyData[item]._id.year, monthlyData[item]._id.month - 1);
//       date = moment(date).format('MMMM Y');
//       // if (data.months && !data.months.includes(date)) {
//       //   data.months.push(date);
//       // } else {
//       //   data.months = [date];
//       // }
//       if (data.months) {
//         if (!data.months.includes(date)) {
//           data.months.push(date);
//         }
//       } else {
//         data.months = [date];
//       }
//       if (data[monthlyData[item]._id.type]) {
//         data[monthlyData[item]._id.type][data.months.indexOf(date)] = monthlyData[item].total;
//       } else {
//         data[monthlyData[item]._id.type] = [];
//         data[monthlyData[item]._id.type][data.months.indexOf(date)] = monthlyData[item].total;
//       }
//       // const index = data.findIndex(x => String(x.month) === String(date));
//       // if (index === -1) {
//       //   const tmp = {};
//       //   tmp.month = date;
//       //   tmp[monthlyData[item]._id.type] = monthlyData[item].total;
//       //   data.push(tmp);
//       // } else {
//       //   data[index][monthlyData[item]._id.type] = monthlyData[item].total;
//       // }
//     });


//     Object.keys(data).forEach((item) => {
//       if (item !== 'months') {
//         for (let i = 0; i < data[item].length; i++) {
//           if (!data[item][i]) {
//             data[item][i] = 0;
//           }
//         }
//       }
//     });

//     return res.status(200).send({
//       data,
//       message: 'Success',
//     });
//   } catch (error) {
//     return res.status(500).json(error);
//   }
// };

const GET_MONTHLY_COLLECTED_WASTE_DATA = async (req, res) => {
  try {
    // const logistics = await Logistics.find({ items: { $ne: [] } }, { items: 1, _id: 0 });
    const monthlyData = await Logistics.aggregate(
      [
        { $unwind: '$items' },
        {
          $project: {
            month: {
              $month: '$pickUpTime',
            },
            year: {
              $year: '$pickUpTime',
            },
            items: '$items',
          },
        },
        {
          $group: {
            _id: {
              type: '$items.productType',
              month: '$month',
              year: '$year',
            },
            total: { $sum: '$items.quantity' },
          },
        },
      ],
    );


    const data = [];
    const types = [];

    const wastes = {
      Papers: 'Paper',
      Plastics: 'Plastic',
      Cans: 'Can',
      Glasses: 'Glass',
      'E-waste': 'E-waste',
      Organic: 'Organic',
    };

    Object.keys(monthlyData).forEach((item) => {
      let date = new Date(monthlyData[item]._id.year, monthlyData[item]._id.month - 1);
      date = moment(date).format('MMMM Y');
      const index = data.findIndex(x => String(x.month) === String(date));
      const type = wastes[monthlyData[item]._id.type];
      if (index === -1) {
        const tmp = {};
        tmp.month = date;
        tmp[type] = monthlyData[item].total;
        data.push(tmp);
      } else {
        data[index][type] = monthlyData[item].total;
      }
      if (!types.includes(type)) {
        types.push(type);
      }
    });

    Object.keys(data).forEach((item) => {
      for (let i = 0; i < types.length; i++) {
        if (!Object.keys(data[item]).includes(types[i])) {
          data[item][types[i]] = 0;
        }
      }
    });
    data.sort((a, b) => {
      const c = new Date(a.month);
      const d = new Date(b.month);
      return c - d;
    });
    return res.status(200).send({
      data,
      message: 'Success',
    });
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
};

const GET_WASTE_DATA_BY_ORGANIZATION = async (req, res) => {
  try {
    // const logistics = await Logistics.find({ items: { $ne: [] } }, { items: 1, _id: 0 });
    const organizationId = req.params.id;
    let { duration } = req.query;
    let organizationData = null;
    if (duration) {
      duration = JSON.parse(duration);
      organizationData = await Logistics.aggregate([
        { $match: { organizationId: ObjectId(organizationId) } },
        { $match: { pickUpTime: { $gte: new Date(duration.from), $lt: new Date(duration.to) } }},
        { $unwind: '$items' },
        {
          $project: {
            month: {
              $month: '$pickUpTime',
            },
            year: {
              $year: '$pickUpTime',
            },
            items: '$items',
            organization: '$organizationId',
          },
        },
        {
          $group: {
            _id: {
              type: '$items.productType',
              month: '$month',
              year: '$year',
              organization: '$organization',
            },
            total: { $sum: '$items.quantity' },
          },
        },
        {
          $group: {
            _id: '$_id.organization',
            data: {
              $addToSet:
              {
                total: '$total',
                type: '$_id.type',
                month: '$_id.month',
                year: '$_id.year',
              },
            },
          },
        },
        {
          $lookup:
            {
              from: 'organizations',
              localField: '_id',
              foreignField: '_id',
              as: 'organization',
            },
        },
      ]);
      console.log(organizationData);
    } else {
      organizationData = await Logistics.aggregate([
        { $match: { organizationId: ObjectId(organizationId) } },
        { $unwind: '$items' },
        {
          $project: {
            month: {
              $month: '$pickUpTime',
            },
            year: {
              $year: '$pickUpTime',
            },
            items: '$items',
            organization: '$organizationId',
          },
        },
        {
          $group: {
            _id: {
              type: '$items.productType',
              month: '$month',
              year: '$year',
              organization: '$organization',
            },
            total: { $sum: '$items.quantity' },
          },
        },
        {
          $group: {
            _id: '$_id.organization',
            data: {
              $addToSet:
              {
                total: '$total',
                type: '$_id.type',
                month: '$_id.month',
                year: '$_id.year',
              },
            },
          },
        },
        {
          $lookup:
            {
              from: 'organizations',
              localField: '_id',
              foreignField: '_id',
              as: 'organization',
            },
        },
      ]);
    }

    // eslint-disable-next-line prefer-destructuring
    organizationData = organizationData[0];
    if (!organizationData) {
      return res.status(200).send({
        message: 'This organization has no data.',
      });
    }

    const data = [];
    const types = [];


    const wastes = {
      Papers: 'Paper',
      Plastics: 'Plastic',
      Cans: 'Can',
      Glasses: 'Glass',
      'E-waste': 'E-waste',
      Organic: 'Organic',
    };

    Object.keys(organizationData.data).forEach((item) => {
      let date = new Date(organizationData.data[item].year, organizationData.data[item].month - 1);
      date = moment(date).format('MMMM Y');
      const index = data.findIndex(x => String(x.month) === String(date));
      const type = wastes[organizationData.data[item].type];
      if (index === -1) {
        const tmp = {};
        tmp.month = date;
        // tmp[organizationData.data[item].type] = organizationData.data[item].total;
        tmp[type] = parseFloat(
          organizationData.data[item].total.toFixed(2),
        );
        data.push(tmp);
      } else {
        data[index][type] = parseFloat(
          organizationData.data[item].total.toFixed(2),
        );
      }
      if (!types.includes(type)) {
        types.push(type);
      }
    });

    Object.keys(data).forEach((item) => {
      for (let i = 0; i < types.length; i++) {
        if (!Object.keys(data[item]).includes(types[i])) {
          data[item][types[i]] = 0;
        }
      }
    });
    data.sort((a, b) => {
      const c = new Date(a.month);
      const d = new Date(b.month);
      return c - d;
    });
    return res.status(200).send({
      data,
      types,
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const GET_CONTRACT_EXPRIES = async (req, res) => {
  try {
    // const logistics = await Logistics.find({ items: { $ne: [] } }, { items: 1, _id: 0 });
    const data = await Organization.find(
      { expiredDate: { $exists: true } },
      { _id: 1, name: 1, expiredDate: 1 },
    )
      .sort({ expiredDate: 1 });
      // .limit(5);

    return res.status(200).send({
      data,
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const GET_GROWTH_RATE_DATA = async (req, res) => {
  try {
    const date = new Date();
    date.setDate(1);

    const present = await Organization.countDocuments({});
    const past = await Organization.countDocuments({
      'contracts.0.startDate': {
        $lt: date.toISOString(),
      },
    });
    const organizationGrowthRate = ((present - past) / past) * 100;
    return res.status(200).send({
      data: {
        organizations: organizationGrowthRate.toFixed(2),
      },
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const GET_TRENDLINE_DATA = async (req, res) => {
  try {
    const currentMonth = new Date();
    currentMonth.setDate(1);
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    lastMonth.setDate(1);

    const lastMonthData = await Organization.countDocuments({
      startDate: {
        $gt: lastMonth.toISOString(),
        $lt: currentMonth.toISOString(),
      },
    });
    const thisMonthData = await Organization.countDocuments({
      startDate: {
        $gt: currentMonth.toISOString(),
      },
    });
    let organizationTrend = 1;
    if (thisMonthData < lastMonthData) {
      organizationTrend = -1;
    }
    return res.status(200).send({
      data: {
        organizations: organizationTrend,
      },
      message: 'Success',
    });
  } catch (error) {
    return res.status(500).json(error);
  }
};

const UPLOAD_TO_S3 = async (req, res) => {
  console.log(req.files);
  if (!res.files) {
    return res.status(500).send('Please upload file in form-data.');
  }
  return res.status(200).send('Welcome to Waste Manager API');
};

module.exports = {
  GREET,
  GET_DASHBOARD_DATA,
  GET_WASTE_DATA,
  GET_TOTAL_WASTE_BY_ORGANIZATION,
  GET_WASTE_DATA_BY_ORGANIZATION,
  // GET_TRENDLINE_DATA_BY_ORGANIZATION,
  GET_MONTHLY_COLLECTED_WASTE_DATA,
  GET_CONTRACT_EXPRIES,
  GET_GROWTH_RATE_DATA,
  GET_TRENDLINE_DATA,
  UPLOAD_TO_S3,
  GET_TOTAL_PICKUPS_BY_ORGANIZATION,
  GET_CONTRACT_DURATION_BY_ORGANIZATION,
};
