const fs = require('fs');
const AWS = require('aws-sdk');
const formidable = require('formidable');
const EmailJs = require('emailjs');
const Encryption = require('node_triple_des');

const credentials = new AWS.SharedIniFileCredentials({ profile: 'recyglo' });
AWS.config.credentials = credentials;

AWS.config.update({
  region: 'ap-southeast-1',
});
AWS.config.apiVersions = {
  s3: '2006-03-01',
};

const GREET = async (req, res) => res.status(200).send('Welcome to Waste Manager API');

const UPLOAD_TO_S3 = async (req, res) => {
  // console.log(Object.keys(req));
  const form = new formidable.IncomingForm();
  form.parse(req, (err, fields, files) => {
    // console.log(files);
    // console.log(fields);
    if (!files.files) {
      return res.status(500).send('Please upload file in form-data.');
    }
    const file = files.files;
    fs.readFile(file.path, (err, data) => {
      if (err) throw err; // Something went wrong!
      const s3bucket = new AWS.S3({ params: { Bucket: 'recyglo-b2b' } });
      let ext = file.name.split('.');
      ext = ext[ext.length - 1];
      const filename = `${Number(new Date())}.${ext}`;
      s3bucket.createBucket(() => {
        const params = {
          Key: filename,
          Body: data,
          ACL: 'public-read',
        };
        s3bucket.upload(params, (error, data) => {
          fs.unlink(file.path, (err) => {
            if (err) {
              console.error(err);
            }
          });
          if (err) {
            // console.log('ERROR MSG: ', error);
            return res.status(500).send(error);
          }
          console.log(data);
          return res.status(200).send({
            file: data.Location,
            message: 'Successfully uploaded data',
          });
        });
      });
    });
  });
};

const ENCRYPT = async (string) => {
  let cypher = null;
  await Encryption.encrypt('managewasteingit', string)
    .then(res => cypher = res);
  return cypher;
};


const DECRYPT = async (cypher) => {
  let message = null;
  // await Encryption.decrypt('weloverecyglo', cypher)
  await Encryption.decrypt('mangewasteingit', cypher)
    .then(res => message = res);
  return message;
};

const SEND_EMAIL = async (email) => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  let cypher = await ENCRYPT(JSON.stringify({email: email, exp: tomorrow}));
  cypher = cypher.replace(/\//g, "SLASH");
  cypher = cypher.substring(0, cypher.length - 2);
  console.log(cypher);
  // const email = await DECRYPT(cypher);
  // console.log(email);
  const client = new EmailJs.SMTPClient({
    user: 'noreply.recyglo@gmail.com',
    password: 'ziHqoc-ranmu3-zikbum',
    host: 'smtp.gmail.com',
    secure: false, // use SSL
    port: 587, // port for secure SMTP
    tls: true
  });

  return new Promise((resolve,reject)=>{

    message = '<html><p>We heard that you lost your Waste Manager password. Sorry about that!</p><p>But don’t worry! You can use the following link to reset your password:</p><p>https://recyglo.net/password_reset/'+cypher+'</p><p>If you don’t use this link within 3 hours, it will expire. To get a new password reset link, visit https://recyglo.net/password_reset</p></html>';
    client.send(
      {
        text: 'Hello',
        from: 'Waste Manager Support<noreply.recyglo@gmail.com>',
        to: email,
        subject: '[Waste Manager] Please reset your password',
        attachment: [
          { data: message, alternative: true },
        ],
      },
      (err, message) => {
        if(!err) {
          // console.log(message);
          resolve(true);
        } else {
          // console.log(err);
          resolve(false);
        }
      }
    );
  });
};

module.exports = {
  GREET,
  UPLOAD_TO_S3,
  SEND_EMAIL,
  ENCRYPT,
  DECRYPT,
};
