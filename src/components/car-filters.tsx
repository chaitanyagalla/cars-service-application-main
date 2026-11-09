'use client';
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { CarCard } from './site-shell';
import type { RatedCar } from '@/lib/car-ratings';
export default function CarFilters({ cars }: { cars: RatedCar[] }) {
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const shown = cars.filter(
    (c) =>
      (filter === 'ALL' || c.category === filter) &&
      c.name.toLowerCase().includes(query.trim().toLowerCase()),
  );
  const filtered = filter !== 'ALL' || query.trim() !== '';
  const reset = () => {
    setFilter('ALL');
    setQuery('');
  };
  return (
    <div className="catalog-browser">
      <div className="catalog-header">
        <h1 id="catalog-heading">
          Our <span className="text-accent">fleet</span>
        </h1>
        <div className="catalog-results">
          <span role="status" aria-live="polite" aria-atomic="true">
            {filtered ? `${shown.length} of ${cars.length}` : cars.length}{' '}
            {shown.length === 1 && !filtered ? 'car' : 'cars'}
          </span>
          {filtered && (
            <button type="button" className="catalog-reset" onClick={reset}>
              Reset filters
            </button>
          )}
        </div>
      </div>
      <form
        className="catalog-toolbar"
        role="search"
        aria-label="Find a car"
        onSubmit={(event) => event.preventDefault()}
      >
        <div className="catalog-search">
          <Search size={18} aria-hidden="true" />
          <label className="sr-only" htmlFor="car-search">
            Search by car name
          </label>
          <input
            id="car-search"
            type="search"
            placeholder="Search by car name"
            autoComplete="off"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
          {query && (
            <button
              type="button"
              className="catalog-clear"
              aria-label="Clear search"
              onClick={() => setQuery('')}
            >
              <X size={16} aria-hidden="true" />
            </button>
          )}
        </div>
        <div className="catalog-categories" role="group" aria-label="Car categories">
          {[
            ['ALL', 'All Cars'],
            ['HATCHBACK', 'Hatchback'],
            ['SEDAN', 'Sedan'],
            ['MPV', 'MPV'],
            ['SUV', 'SUV'],
          ].map(([value, label]) => (
            <button
              type="button"
              key={value}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
      </form>
      {shown.length ? (
        <div className="car-grid">
          {shown.map((c) => (
            <CarCard car={c} key={c.id} />
          ))}
        </div>
      ) : (
        <div className="catalog-empty">
          <Search size={26} aria-hidden="true" />
          <h2>No cars found</h2>
          <p>Try another car name or category to find your next drive.</p>
          <button type="button" className="btn btn-outline" onClick={reset}>
            Show all cars
          </button>
        </div>
      )}
    </div>
  );
}
