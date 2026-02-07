import webpush from 'web-push';

const VAPID_PUBLIC = process.env.WEB_PUSH_PUBLIC_KEY || '';
const VAPID_PRIVATE = process.env.WEB_PUSH_PRIVATE_KEY || '';
const VAPID_CONTACT = process.env.WEB_PUSH_CONTACT || 'mailto:REDACTED_EMAIL';

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails(VAPID_CONTACT, VAPID_PUBLIC, VAPID_PRIVATE);
}

export const getVapidPublicKey = () => VAPID_PUBLIC;
export const hasVapid = () => Boolean(VAPID_PUBLIC && VAPID_PRIVATE);
export default webpush;
