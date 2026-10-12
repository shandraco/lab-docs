# Lab Docs

Contracts and client letters for a small development lab, filled in from templates instead of
copied from the last one. Pick a document, pick the client, answer the questions, and download
a PDF or Word file. Anything still missing is highlighted in yellow on the page and listed
beside it, so nothing goes out with a blank in it.

Starter templates:

- **Master Services Agreement**: the main contract with a client, with choices for payment
  terms, liability cap, IP, non-solicitation and publicity.
- **Statement of Work**: one project under an MSA, covering deliverables with acceptance
  criteria, exclusions, assumptions, milestones, and fixed or hourly pricing with a total.
- **Outreach email**: a first email to a prospect, copied as subject and message, with the
  address and opt-out line that US commercial email (CAN-SPAM) needs.
- **Capability statement**: one page on what the lab does and has done, with optional UEI,
  CAGE and NAICS codes for government buyers.

> **These templates are not legal advice.** They are a starting point written in plain
> English. Have a lawyer in your jurisdiction review each one before a client signs it. When
> they have, an owner can mark the template as reviewed, which removes the warning in the editor.

## What it does

- **Sign in with a code by email.** There are no passwords. An owner adds people; nobody can
  sign themselves up.
- **Three roles.** Owners see everything and manage lab details, people and templates. Staff see
  everything. Partners see only the clients and documents they made.
- **Saves as you type.** There is no Save button. If a save fails, it keeps trying, and the page
  warns you before you leave with unsaved changes.
- **Final means final.** Marking a version final stores exactly what was produced, with a
  SHA-256 fingerprint printed in the footer. The database refuses to change it afterwards. To
  change a final document, you start version 2 from it.
- **Undo instead of "are you sure".** This covers moving a document to the bin, removing a line
  and changing someone's role.
- **One source for every format.** The page preview, PDF, Word file and email text all come
  from the same resolved document, so they cannot disagree.

## Run it locally

You need Node 22 or later, pnpm 9 and PostgreSQL 15 or later.

```sh
pnpm install
cp .env.example .env.local        # then set DATABASE_URL and BETTER_AUTH_SECRET
createdb lab_docs_dev
pnpm db:migrate                   # tables, plus triggers that lock final versions
pnpm db:seed                      # the four starter templates
pnpm person:add "Your Name" you@example.com owner
pnpm dev                          # http://localhost:3000
```

In development, without `RESEND_API_KEY`, sign-in codes are printed in the dev server's output
instead of emailed. Then, as the owner:

1. Open **Lab details** and fill them in: your legal name, address, who signs, and governing law.
2. Add a client.
3. Make a document.

## Deploy

It runs anywhere Next.js runs with a Postgres database. On Vercel with Neon:

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Postgres connection string (Neon: the pooled one) |
| `BETTER_AUTH_SECRET` | 32+ random characters: `openssl rand -base64 32` |
| `SITE_URL` | The public URL, e.g. `https://docs.example.com` |
| `RESEND_API_KEY`, `MAIL_FROM` | For emailing sign-in codes ([Resend](https://resend.com)); `MAIL_FROM` must be on a domain you verified there |

Run `pnpm db:migrate` and `pnpm db:seed` against the production database once, then add the
first owner with `pnpm person:add`. A production server without the mail settings refuses to
send codes at all, rather than writing them to a log.

Run it behind a proxy that sets `X-Forwarded-For` to the real client address (Vercel, Fly,
Render and a standard nginx or Caddy setup all do). The general rate limits are counted per
IP from that header, so on a server exposed directly a caller can fake it. Two limits hold
either way: each email address gets at most 3 sign-in codes in 10 minutes, and each code
allows 5 guesses.

## Change the templates

Templates are TypeScript files in `lib/templates/`. Each one has form sections (the questions)
and blocks (the document), with placeholders like `{{project_name}}`, `{{client.legal_name}}`,
`{{lab.signer_name}}` and `{{today}}`. `{{a|b}}` means use `a`, or `b` if `a` is empty;
`**text**` is bold; a block with `when` only appears for some answers. After editing, run
`pnpm db:seed`. It saves a new template version only when the wording changed, and documents
already started keep the version they were made with.

## Tests

```sh
pnpm typecheck && pnpm lint
pnpm test          # unit tests for the document engine
pnpm test:e2e      # builds the app and drives it in Chromium
```

The end-to-end run needs a database whose name ends in `_test` (default
`postgres://$USER@localhost:5433/lab_docs_test`, or set `E2E_DATABASE_URL`). It wipes and
reseeds that database each time. It covers:

- the security headers and strict CSP
- sign-in redirects
- partner scoping
- axe accessibility checks in light and dark
- the whole SoW journey: fill in, PDF and Word downloads, mark as final, new version

## Built with

Next.js, React, PostgreSQL, Better Auth, @react-pdf/renderer and docx. See
[THIRD-PARTY.md](THIRD-PARTY.md) for the fonts and their licences.

## Licence

MIT. See [LICENSE](LICENSE). The licence covers the code and the template wording; it does not
make the templates fit for your situation.
