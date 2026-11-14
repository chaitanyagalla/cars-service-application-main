import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="container center" style={{ padding: '120px 20px' }}>
      <h1 className="display not-found-title">Page not found</h1>
      <p className="sub">We couldn&apos;t find that page or vehicle.</p>
      <Link className="btn btn-gold" href="/cars">
        Browse cars
      </Link>
    </main>
  );
}
