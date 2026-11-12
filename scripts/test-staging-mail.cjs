const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const valid = { MAIL_TRANSPORT: 'staging-smtp', NODE_ENV: 'staging', DB_NAME: 'cto01_staging', SMTP_HOST: 'srv-captain--cto-p0-mail', SMTP_PORT: '1025' };
const modulePath = './build/src/middlewares/NodeMailerConfig.js';
for (const override of [ {NODE_ENV:'production'}, {DB_NAME:'cto'}, {SMTP_HOST:'smtp.example.com'}, {SMTP_PORT:'25'} ]) {
  const result = spawnSync(process.execPath, ['-e', `require('${modulePath}')`], { env: {...process.env,...valid,...override}, encoding:'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Staging SMTP requires/);
}
const result = spawnSync(process.execPath, ['-e', `const mail=require('${modulePath}').default; mail.send({to:'real@example.com',from:'p0@example.test',subject:'guard',text:'guard'}).then(()=>process.exitCode=1).catch(e=>{if(!e.message.includes('only accepts synthetic'))process.exitCode=1})`], {env:{...process.env,...valid},encoding:'utf8'});
assert.equal(result.status,0,result.stderr);
console.log('Staging SMTP production/database/host/port/recipient guards: OK');
