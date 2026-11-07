import { leadStatuses, type AdminQuery } from '@/lib/admin-query';

export function AdminRecordFilters({
  resource,
  query,
  cars,
}: {
  resource: 'bookings' | 'audits';
  query: AdminQuery;
  cars: { id: string; name: string }[];
}) {
  return (
    <form method="get" action={`/admin/${resource}`} className="admin-filters">
      {resource === 'bookings' ? (
        <>
          <label>
            <span className="form-label">Name, phone or reference</span>
            <input className="input" name="q" maxLength={120} defaultValue={query.q} />
          </label>
          <label>
            <span className="form-label">Status</span>
            <select className="input" name="status" defaultValue={query.status}>
              <option value="">All statuses</option>
              {leadStatuses.map((status) => (
                <option key={status}>{status}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="form-label">Car</span>
            <select className="input" name="carId" defaultValue={query.carId}>
              <option value="">All cars</option>
              {cars.map((car) => (
                <option key={car.id} value={car.id}>
                  {car.name}
                </option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label>
            <span className="form-label">Actor email or ID</span>
            <input className="input" name="actor" maxLength={120} defaultValue={query.actor} />
          </label>
          <label>
            <span className="form-label">Action</span>
            <input
              className="input"
              name="action"
              maxLength={40}
              defaultValue={query.action}
              placeholder="CREATE, UPDATE, LOGIN…"
            />
          </label>
          <label>
            <span className="form-label">Resource</span>
            <input
              className="input"
              name="entity"
              maxLength={40}
              defaultValue={query.entity}
              placeholder="cars, bookings, users…"
            />
          </label>
        </>
      )}
      <label>
        <span className="form-label">Submitted from (India time)</span>
        <input className="input" name="from" type="date" defaultValue={query.from} />
      </label>
      <label>
        <span className="form-label">Through (India time)</span>
        <input className="input" name="to" type="date" defaultValue={query.to} />
      </label>
      <label>
        <span className="form-label">Per page</span>
        <select className="input" name="pageSize" defaultValue={query.pageSize}>
          {[25, 50, 100].map((size) => (
            <option key={size}>{size}</option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-gold">
        Apply filters
      </button>
      <a className="btn btn-outline" href={`/admin/${resource}`}>
        Clear
      </a>
    </form>
  );
}
