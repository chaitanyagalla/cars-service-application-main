'use client';
import { useState } from 'react';
import { CarCard } from './site-shell';
import type { RatedCar } from '@/lib/car-ratings';
export default function CarFilters({ cars }: { cars: RatedCar[] }) {
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const shown = cars.filter(
    (c) =>
      (filter === 'ALL' || c.category === filter) &&
      c.name.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <>
      <div className="filter-tabs" aria-label="Car categories">
        {[
          ['ALL', 'All Cars'],
          ['HATCHBACK', 'Hatchback'],
          ['SEDAN', 'Sedan'],
          ['MPV', 'MPV'],
          ['SUV', 'SUV'],
        ].map(([value, label]) => (
          <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
            {label}
          </button>
        ))}
      </div>
      <div style={{ maxWidth: 450, margin: '0 auto 32px' }}>
        <label className="form-label" htmlFor="car-search">
          Search by car name
        </label>
        <input
          id="car-search"
          className="input"
          placeholder="Search cars..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      {shown.length ? (
        <div className="car-grid">
          {shown.map((c) => (
            <CarCard car={c} key={c.id} />
          ))}
        </div>
      ) : (
        <p className="center muted">No matching cars. Try another category.</p>
      )}
    </>
  );
}
