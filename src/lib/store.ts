import { prisma } from './db';
import { withCarRatings } from './car-ratings';
import { locationOrderBy } from './location-names';
export const getSettings = () =>
  prisma.siteSettings.findUnique({ where: { id: 'main' } }).then(
    (s) =>
      s ?? {
        id: 'main',
        businessName: 'Universal Self Drive Cars',
        whatsappNumber: '919700093666',
        phoneNumber: '+91 97000 93666',
        contactEmail: 'info@universalselfdrivecars.in',
        address: 'Vanasthalipuram, Hyderabad',
        mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Vanasthalipuram+Hyderabad',
        headline: 'Drive Your Way. No Deposit.',
        description:
          'Self-drive cars in Hyderabad. Zero security deposit and convenient doorstep delivery.',
      },
  );
export const getCars = async () =>
  withCarRatings(
    await prisma.car.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    }),
  );
export const getLocations = () =>
  prisma.location.findMany({ where: { active: true }, orderBy: [...locationOrderBy] });
export const getFaqs = () =>
  prisma.faq.findMany({ where: { published: true }, orderBy: { sortOrder: 'asc' } });
export const getTestimonials = () =>
  prisma.testimonial.findMany({
    where: { published: true },
    orderBy: { createdAt: 'desc' },
    take: 9,
  });
