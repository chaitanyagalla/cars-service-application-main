import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { locationSchema } from './validation';
import { locationNameKey, locationOrderBy } from './location-names';

export class LocationConflictError extends Error {}

type LocationInput = z.infer<typeof locationSchema>;

// All area writers take the same lock, so concurrent additions/moves cannot
// overwrite one another's positions. The caller also writes its audit in this transaction.
export async function saveLocation(tx: Prisma.TransactionClient, data: LocationInput, id?: string) {
  await tx.$executeRaw`LOCK TABLE "Location" IN EXCLUSIVE MODE`;
  const rows = await tx.location.findMany({ orderBy: [...locationOrderBy] });
  if (rows.some((row) => row.id !== id && locationNameKey(row.name) === locationNameKey(data.name)))
    throw new LocationConflictError(
      'That service area already exists. Names ignore capitalization and extra spaces. Edit the existing area instead.',
    );
  const current = rows.findIndex((row) => row.id === id);
  const others = rows.filter((row) => row.id !== id);
  const position = Math.min(
    data.sortOrder ?? (current < 0 ? others.length : current),
    others.length,
  );
  const row = id
    ? await tx.location.update({ where: { id }, data: { ...data, sortOrder: position } })
    : await tx.location.create({ data: { ...data, sortOrder: position } });
  others.splice(position, 0, row);
  for (const [sortOrder, area] of others.entries()) {
    if (area.sortOrder !== sortOrder)
      await tx.location.update({ where: { id: area.id }, data: { sortOrder } });
  }
  return row;
}

export async function deleteLocation(tx: Prisma.TransactionClient, id: string) {
  await tx.$executeRaw`LOCK TABLE "Location" IN EXCLUSIVE MODE`;
  await tx.location.delete({ where: { id } });
  const rows = await tx.location.findMany({ orderBy: [...locationOrderBy] });
  for (const [sortOrder, area] of rows.entries()) {
    if (area.sortOrder !== sortOrder)
      await tx.location.update({ where: { id: area.id }, data: { sortOrder } });
  }
}
