"use client";

/**
 * Replaces the root layout when the layout itself throws. It renders its own document, so
 * the app's stylesheet, fonts and theme do not apply; keep it plain and self-contained.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-GB">
      <body>
        <title>Error | Shed</title>
        <main>
          <h1>Sorry, there is a problem with the service</h1>
          <p>Try again in a moment.</p>
          <button type="button" onClick={() => retry()}>
            Try again
          </button>
          {error.digest ? <p>Reference: {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
