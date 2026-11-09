const { Resolver, lookup } = require('node:dns/promises');
const { spawn } = require('node:child_process');
const { loadEnvConfig } = require('@next/env');

async function main() {
  loadEnvConfig(process.cwd(), true);
  const env = { ...process.env };
  const resolver = new Resolver({ timeout: 2000, tries: 2 });
  resolver.setServers(['8.8.8.8', '1.1.1.1']);

  for (const key of ['DATABASE_URL', 'DATABASE_URL_POOLED']) {
    if (!env[key]) continue;
    const url = new URL(env[key]);
    if (!url.hostname.endsWith('.neon.tech')) continue;

    try {
      await lookup(url.hostname);
    } catch (error) {
      if (!['ENOTFOUND', 'EAI_AGAIN'].includes(error.code)) throw error;
      // Prisma uses the system resolver, so changing Node's DNS servers alone
      // does not fix it. Resolve once and pass Neon's endpoint routing option.
      const [address] = await resolver.resolve4(url.hostname);
      const endpoint = url.hostname.split('.')[0].replace(/-pooler$/, '');
      url.hostname = address;
      const options = url.searchParams.get('options');
      url.searchParams.set(
        'options',
        options ? `${options} endpoint=${endpoint}` : `endpoint=${endpoint}`,
      );
      env[key] = url.toString();
      console.log(`${key}: using public DNS for this local session.`);
    }
  }

  const child = spawn(
    process.execPath,
    [require.resolve('next/dist/bin/next'), 'dev', ...process.argv.slice(2)],
    { stdio: 'inherit', env },
  );
  child.on('error', () => {
    console.error('Could not start Next.js. Check that npm dependencies are installed.');
    process.exitCode = 1;
  });
  child.on('exit', (code) => {
    process.exitCode = code ?? 1;
  });
  for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => child.kill(signal));
  }
}

main().catch((error) => {
  // Never print errors that might contain database credentials.
  console.error(
    `Local startup failed (${error.code || error.name}). Check your network and .env.local settings.`,
  );
  process.exitCode = 1;
});
