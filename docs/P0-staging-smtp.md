# P0 staging email capture

The default mail transport remains SendGrid. For the integrated staging reset flow, set:

```
NODE_ENV=staging
DB_NAME=cto01_staging
MAIL_TRANSPORT=staging-smtp
SMTP_HOST=srv-captain--cto-p0-mail
SMTP_PORT=1025
EMAIL_USER=p0-sender@example.test
```

This opt-in transport refuses any other environment, database, SMTP host or port, and accepts only `@example.test` recipients. It sends actual SMTP to a temporary Mailpit capture service; no relay or forwarding must be configured. Keep ports 1025 and 8025 internal with no CapRover web exposure or host port mapping. It requires no production key.

Run `npm run build && node scripts/test-staging-mail.cjs`. The integration check must request a reset through the HTTPS API, read the captured message from the internal Mailpit API, follow the staging reset link, confirm the new password, and verify token single use and session revocation. A passing transport capture does not validate SendGrid deliverability or an external mailbox.
