const AWS = require('aws-sdk');

const credentials = new AWS.SharedIniFileCredentials({ profile: 'recyglo' });
AWS.config.credentials = credentials;

AWS.config.update({
  region: 'ap-southeast-1',
});
AWS.config.apiVersions = {
  s3: '2006-03-01',
};

const s3bucket = new AWS.S3({ params: { Bucket: 'waste-b2b' } });

module.exports = {
  s3: s3bucket,
};
