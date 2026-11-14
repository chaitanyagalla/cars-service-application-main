const { loadEnvConfig } = require('@next/env');
const { PrismaClient } = require('@prisma/client');
const { lookup, Resolver } = require('node:dns/promises');

// Explicit, repeatable demo seed. IDs identify sample stories in the public UI.
// Existing records (including edited/unpublished samples) are never overwritten.
const stories = [
  {
    id: 'sample-testimonial-01',
    name: 'Arjun Reddy',
    area: 'Gachibowli, Hyderabad',
    carName: 'Maruti Swift',
    text: 'A last-minute weekend plan turned into our favourite road trip. The Swift was ready on time, the handover was simple, and we were out of the city before breakfast.',
    rating: 5,
  },
  {
    id: 'sample-testimonial-02',
    name: 'Sneha Rao',
    area: 'Kondapur, Hyderabad',
    carName: 'Maruti Dzire',
    text: 'Booked a Dzire for a family visit. Clean interiors, a comfortable drive, and a team that explained everything before handing over the keys. Would happily book again.',
    rating: 5,
  },
  {
    id: 'sample-testimonial-03',
    name: 'Vikram Shah',
    area: 'Madhapur, Hyderabad',
    carName: 'Tata Tiago',
    text: 'Needed a car while mine was in the workshop. A quick conversation, an easy pickup, and I had my week back on track. The Tiago was perfect for getting around town.',
    rating: 4,
  },
  {
    id: 'sample-testimonial-04',
    name: 'Priya Sharma',
    area: 'Kukatpally, Hyderabad',
    carName: 'Toyota Glanza',
    text: 'Our little escape to Ananthagiri Hills was all the better with a car we could drive at our own pace. No rushing for a cab, just good music and a lovely open road.',
    rating: 5,
  },
  {
    id: 'sample-testimonial-05',
    name: 'Rahul Mehta',
    area: 'Vanasthalipuram, Hyderabad',
    carName: 'Hyundai Exter',
    text: 'From sharing my dates to returning the car, the whole process felt easy. The team answered my questions patiently and the Exter was a comfortable companion for the trip.',
    rating: 5,
  },
  {
    id: 'sample-testimonial-06',
    name: 'Ananya Iyer',
    area: 'LB Nagar, Hyderabad',
    carName: 'Suzuki Baleno',
    text: 'Spent the weekend showing visiting friends around Hyderabad. Having our own car meant we could stop for chai, take the scenic route, and make a day of it.',
    rating: 4,
  },
];

async function main() {
  loadEnvConfig(process.cwd(), process.env.NODE_ENV !== 'production');
  // Use the same session-only Neon DNS fallback as local-dev.cjs.
  for (const key of ['DATABASE_URL', 'DATABASE_URL_POOLED']) {
    const value = process.env[key];
    if (!value) continue;
    const url = new URL(value);
    if (!url.hostname.endsWith('.neon.tech')) continue;
    try {
      await lookup(url.hostname);
    } catch (error) {
      if (!['ENOTFOUND', 'EAI_AGAIN'].includes(error.code ?? '')) throw error;
      const resolver = new Resolver({ timeout: 2000, tries: 2 });
      resolver.setServers(['8.8.8.8', '1.1.1.1']);
      const [address] = await resolver.resolve4(url.hostname);
      const endpoint = url.hostname.split('.')[0].replace(/-pooler$/, '');
      const options = url.searchParams.get('options');
      url.hostname = address;
      url.searchParams.set(
        'options',
        options ? `${options} endpoint=${endpoint}` : `endpoint=${endpoint}`,
      );
      process.env[key] = url.toString();
    }
  }

  const prisma = new PrismaClient({ log: [] });
  try {
    const result = await prisma.testimonial.createMany({
      data: stories.map((story, index) => ({
        ...story,
        published: true,
        verified: false,
        // Stable ordering: the first story appears first, even after rerunning.
        createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0, stories.length - index)),
      })),
      skipDuplicates: true,
    });
    const count = await prisma.testimonial.count({
      where: { id: { in: stories.map((story) => story.id) }, published: true },
    });
    console.log(`Added ${result.count} sample testimonials; ${count} samples are published.`);
    console.log(
      'Manage them at /admin/testimonials. Sample stories are labeled and are not verified reviews.',
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  // Connection errors can contain credentials; keep them out of terminal output.
  console.error(
    `Testimonial seed failed (${error.code || error.name}). Check your database connection and environment settings.`,
  );
  process.exitCode = 1;
});
