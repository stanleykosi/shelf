"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="card stack" role="alert">
      <h1>We couldn’t load this page</h1>
      <p>Your input is still available where possible. Try the request again.</p>
      <button onClick={reset}>Try again</button>
    </section>
  );
}
