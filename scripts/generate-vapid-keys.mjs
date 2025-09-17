#!/usr/bin/env node
import webpush from 'web-push';

try {
  const keys = webpush.generateVAPIDKeys();
  const out = `\n=== VAPID Keys Generated ===\n\nWEB_PUSH_PUBLIC_KEY=${keys.publicKey}\nWEB_PUSH_PRIVATE_KEY=${keys.privateKey}\n\nHow to use:\n1) Copy the two lines above into your .env.local file.\n2) Set WEB_PUSH_CONTACT to a valid email or URL (e.g. mailto:you@example.com).\n3) Restart your dev server if running.\n\nSecurity notes:\n- Keep the PRIVATE key secret (do NOT commit to git).\n- Public key can be exposed to clients.\n`;
  console.log(out);
  process.exit(0);
} catch (e) {
  console.error('Failed to generate VAPID keys:', e?.message || e);
  process.exit(1);
}
