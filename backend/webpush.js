import webpush from 'web-push';

const publicVapidKey = process.env.PUBLICVAPIDKEY;
const privateVapidKey = process.env.PRIVATEVAPIDKEY;
const contactEmail = process.env.CONTACTEMAIL;

export default () => {
  webpush.setVapidDetails(
    contactEmail,
    publicVapidKey,
    privateVapidKey,
  );
};
