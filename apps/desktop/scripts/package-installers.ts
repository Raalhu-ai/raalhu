// GitHub expands unavailable optional secrets to empty strings. electron-builder
// treats CSC_LINK='' as the current directory rather than as an absent certificate.
const env = { ...process.env };
for (const name of [
  'CSC_LINK', 'CSC_KEY_PASSWORD', 'WIN_CSC_LINK', 'WIN_CSC_KEY_PASSWORD',
  'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID',
]) {
  if (!env[name]?.trim()) delete env[name];
}
const child = Bun.spawn(['bun', 'run', 'electron-builder', ...process.argv.slice(2)], {
  env, stdin: 'inherit', stdout: 'inherit', stderr: 'inherit',
});
process.exit(await child.exited);
