import type { Car } from '@prisma/client';
export type BookingDetails = {
  customerName?: string;
  customerPhone?: string;
  pickupLocation?: string;
  pickupDate?: string;
  returnDate?: string;
  notes?: string;
};
export function whatsAppUrl(number: string, car: Car, detail: BookingDetails = {}) {
  const digits = number.replace(/\D/g, '');
  if (!/^\d{10,15}$/.test(digits)) throw new Error('Invalid WhatsApp number in admin settings');
  const lines = [
    `Hi! I'm interested in renting the ${car.name} for self-drive.`,
    `Car: ${car.name} (${car.category.toLowerCase()}, ${car.seats} seats, ${car.fuel}, ${car.transmission})`,
    `Daily rental: ₹${car.priceDay.toLocaleString('en-IN')}`,
    `Deposit: ₹${car.deposit}, included distance: ${car.includedKm} km`,
    `Extra distance: ₹${car.extraKmRate}/km; extra time: ₹${car.extraHourRate}/hour`,
    detail.customerName && `Name: ${detail.customerName}`,
    detail.customerPhone && `Phone: ${detail.customerPhone}`,
    detail.pickupLocation && `Pickup area: ${detail.pickupLocation}`,
    detail.pickupDate && `Pickup: ${detail.pickupDate}`,
    detail.returnDate && `Return: ${detail.returnDate}`,
    detail.notes && `Notes: ${detail.notes}`,
    'Please confirm availability, final price and booking requirements.',
  ]
    .filter(Boolean)
    .join('\n');
  return `https://wa.me/${digits}?text=${encodeURIComponent(lines)}`;
}
