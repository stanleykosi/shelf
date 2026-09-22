import Link from "next/link";

export default function NotFound() {
  return (
    <section className="card stack">
      <p className="eyebrow">Not found</p>
      <h1>This Shelf page isn’t available</h1>
      <p>The link may have expired or the item may no longer be published.</p>
      <Link className="button" href="/">
        Return to Discover
      </Link>
    </section>
  );
}
