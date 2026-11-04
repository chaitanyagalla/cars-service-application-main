import 'dotenv/config';
import { PrismaClient, CarCategory } from '@prisma/client';
const p = new PrismaClient();
const fleet: [string, string, CarCategory, number, string, string, string, boolean][] = [
  ['santro', 'Santro', 'HATCHBACK', 999, 'santro.webp', 'Petrol', 'Manual', true],
  ['tata-tiago', 'Tata Tiago', 'HATCHBACK', 1499, 'tiago.webp', 'Petrol', 'Manual', true],
  ['maruti-dzire', 'Maruti Dzire', 'SEDAN', 1999, 'dzire.webp', 'Petrol', 'Manual', true],
  ['maruti-swift', 'Maruti Swift', 'HATCHBACK', 1999, 'swift.webp', 'Petrol', 'Manual', true],
  [
    'toyota-glanza',
    'Toyota Glanza',
    'HATCHBACK',
    1999,
    'placeholder.svg',
    'Petrol',
    'Manual',
    false,
  ],
  [
    'suzuki-baleno',
    'Suzuki Baleno',
    'HATCHBACK',
    1999,
    'placeholder.svg',
    'Petrol',
    'Manual',
    false,
  ],
  [
    'hyundai-exter',
    'Hyundai Exter',
    'SUV',
    2399,
    'placeholder.svg',
    'CNG / Petrol',
    'Manual',
    false,
  ],
  ['kia-sonet', 'Kia Sonet', 'SUV', 2899, 'placeholder.svg', 'Diesel', 'Manual', false],
  ['ertiga-petrol', 'Ertiga Petrol', 'MPV', 2999, 'placeholder.svg', 'Petrol', 'Manual', false],
  ['ertiga-diesel', 'Ertiga Diesel', 'MPV', 3199, 'placeholder.svg', 'Diesel', 'Manual', false],
  ['ertiga-cng', 'Ertiga CNG', 'MPV', 2999, 'placeholder.svg', 'CNG', 'Manual', false],
  ['kia-seltos', 'Kia Seltos', 'SUV', 3499, 'placeholder.svg', 'Diesel', 'Automatic', false],
  ['kia-carens', 'Kia Carens', 'MPV', 3499, 'placeholder.svg', 'Diesel', 'Manual', false],
  [
    'mahindra-xuv-500',
    'Mahindra XUV 500',
    'SUV',
    3999,
    'placeholder.svg',
    'Diesel',
    'Manual',
    false,
  ],
  ['innova-crysta', 'Innova Crysta', 'MPV', 4499, 'placeholder.svg', 'Diesel', 'Manual', false],
  ['mahindra-thar', 'Mahindra Thar', 'SUV', 4499, 'placeholder.svg', 'Diesel', 'Automatic', false],
];
const places = [
  ['Vanasthalipuram', 'South East Hyderabad'],
  ['RGI Airport', 'Rajiv Gandhi International Airport'],
  ['Gachibowli', 'Financial District'],
  ['Kukatpally', 'North West Hyderabad'],
  ['Secunderabad', 'Twin City'],
  ['Miyapur', 'West Hyderabad'],
  ['Kompally', 'North Hyderabad'],
  ['ECIL', 'North East Hyderabad'],
  ['Khairathabad', 'Central Hyderabad'],
  ['Uppal', 'East Hyderabad'],
];
const questions = [
  [
    'Is there really zero security deposit?',
    'Our current sample fleet is configured with zero deposit. Confirm the current policy, documents, eligibility and fees with our team before payment.',
  ],
  [
    'What is the kilometer limit and extra km charges?',
    'The default plan includes 350 km. Extra km charges vary by car and are shown on its details page.',
  ],
  [
    'What are the extra hour charges?',
    'Extra hours are charged at the rate displayed on each car page.',
  ],
  [
    'How can I book a car?',
    'Select a car, click Book on WhatsApp, and send the prefilled message. You can also submit travel details to save an inquiry.',
  ],
  [
    'Is fuel included in the rental cost?',
    'Fuel is not included unless your final quotation explicitly says otherwise.',
  ],
  [
    'Can I book a car for an airport pickup?',
    'Contact us to check delivery availability at Rajiv Gandhi International Airport.',
  ],
];
async function main() {
  await p.siteSettings.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } });
  for (const [
    i,
    [slug, name, category, price, image, fuel, transmission, featured],
  ] of fleet.entries()) {
    await p.car.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name,
        category,
        priceDay: price,
        price12h: Math.round(price * 0.7),
        price3Days: Math.round(price * 2.7),
        priceWeek: Math.round(price * 6.3),
        imageUrl: `/cars/${image}`,
        fuel,
        transmission,
        featured,
        seats: category === 'MPV' ? 7 : 5,
        description: `${name} self-drive rental in Hyderabad. Enquire on WhatsApp to confirm dates, pickup and availability.`,
        mileage: slug === 'santro' ? '22 km/l' : '',
        bootSpace: slug === 'santro' ? '268 L' : '',
        engine: slug === 'santro' ? '1.2L K-Series' : '',
        sortOrder: i,
      },
    });
  }
  for (const [i, [name, subtitle]] of places.entries())
    await p.location.upsert({
      where: { name },
      update: {},
      create: { name, subtitle, sortOrder: i },
    });
  if ((await p.faq.count()) === 0)
    await p.faq.createMany({
      data: questions.map(([question, answer], sortOrder) => ({ question, answer, sortOrder })),
    });
  console.log(
    'Seeded example fleet, areas and FAQs. Images/prices are illustrative; edit before launch. No sample testimonials published.',
  );
}
main().finally(() => p.$disconnect());
