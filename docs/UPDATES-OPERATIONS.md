# CommDDL scheduled updates: deployment and operations

This repository now contains the local collector, structured candidate diff/apply code, a Cloudflare Worker + D1 admin service, a review UI, and GitHub Actions workflows. These are source files, not a claim that any remote service has been provisioned. Until the configuration below is completed, scheduled collection and publishing are not live.

## Required external setup

1. Create a Cloudflare D1 database named `commddl-admin`, update `services/admin/wrangler.toml` with its real database ID, then apply `services/admin/migrations/0001_initial.sql` using Wrangler migrations. Deploy the Worker and custom domain; set `ADMIN_ORIGIN` to that exact HTTPS origin.
2. Create a GitHub OAuth app for the admin origin. Set Worker secrets `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and a random high-entropy `SESSION_SECRET`. The callback URL is `<ADMIN_ORIGIN>/auth/callback`.
3. Configure Worker variables `GITHUB_OWNER=turambarr`, `GITHUB_REPO=commddl`; add `INTERNAL_HMAC_SECRET`, `RESEND_API_KEY`, and `MAIL_FROM` as Worker secrets/variables. Verify the sending domain with the selected email service. Do not put secrets in this repository.
4. Install a GitHub App on `turambarr/commddl`, limited to this repository, with Contents read/write, Pull requests read/write, and Metadata read. Create an App private key. Add Actions secrets `UPDATE_GITHUB_APP_ID`, `UPDATE_GITHUB_APP_PRIVATE_KEY`, `UPDATE_INTERNAL_HMAC_SECRET`; add Actions variable `UPDATE_ADMIN_API_URL=<ADMIN_ORIGIN>`.
5. Protect `main`: require pull requests, the catalog validation/build checks, and approval by a repository maintainer; dismiss stale approvals after new commits; prevent the publishing App from bypassing rules. Require `Validate and deploy CommDDL / build` and `CommDDL review gate / catalog, tests, and generated site`; restrict the `github-pages` environment to `main`. Require the Pages validation workflow before deployment.
6. Deploy the Worker and enable GitHub Pages. Set `adminPortalUrl` in `data/meta.yml` to the Worker admin URL so the public footer displays the management link. Add and verify recipient email addresses through the admin page; no address is preconfigured.

## What runs

- `collect-updates.yml` runs on the configured UTC schedule or manually from `main`. It registers the catalog IDs, reads due IDs and their persistent baselines from D1, fetches only allowed HTTPS pages, and submits a non-empty candidate batch. A manual dry run produces an Actions artifact without storing or mailing candidates. A manual selected-ID run can set `dry_run=false` to create a candidate batch.
- Candidate collection has a six-page per-entity and depth-two same-host link budget by default. Unsupported dynamic pages/PDFs, empty extraction, redirects, HTTP failures, and unread links remain visible as collection gaps. It does not infer that a missing section was deleted unless a complete crawl supports a review-only removal candidate.
- An admin logs into the Worker UI with GitHub. Add/verify email recipients, retry incomplete notification batches, inspect each official source and diff, and accept/reject items. Saving decisions dispatches `build-update-pr.yml`; the job exports the exact batch version, checks its base SHA, applies only accepted sections, validates, builds, and opens/updates a PR with a GitHub App token.
- When the final PR SHA is available, the service notifies recipients for that exact review version. The admin inspects the final PR and SHA in the page and approves it. The service posts the admin's GitHub review and requests a merge against the expected head SHA; GitHub branch rules remain authoritative. A merge to `main` triggers the Pages workflow.

## Local verification and diagnostics

- `npm run check`, `npm test`, and `npm run build` validate the catalog and generated site.
- `npm run update:collect -- --ids ofc,twc --dry-run --out /tmp/commddl-candidate.json` tests public sources without sending data to the admin service.
- `npm run update:apply -- --batch <candidate.json> --decisions <decisions.json>` is intended for the trusted PR workflow. It requires candidate `baseRevision` to equal the checked-out Git HEAD; it writes YAML only after validating a temporary copy.
- The admin API and email flows must be exercised against a provisioned Cloudflare preview/D1 database and a verified email sender before enabling schedule dispatch. Do not use simulated mail as release evidence.

## Current known boundaries

The generic parser extracts static HTML headings and typed blocks, not arbitrary JavaScript-rendered sites or PDF documents. It can preserve and classify any heading it sees, but category labels are heuristics and the source layout must be reviewed. Cross-host links are intentionally not followed. The first real coverage batch remains an acceptance task: review at least eight official entities from supported sources and record site-specific gaps before considering the collector operational. This workspace does not have Cloudflare, OAuth, GitHub App, email sender, or repository-protection credentials, so those remote setup and real-delivery checks cannot be completed locally.

## Recovery

If collection fails, inspect the Actions artifact and D1 source failure fields; failed entities get a retry time and do not erase the published section. If notification fails, repair the email configuration/recipient status and use “Retry review email” on the batch. If PR generation or catalog validation fails, the batch remains visible and the public `main` data is unchanged. If final SHA or checks change, the old approval is rejected; re-open the current PR and review again. If Pages deployment fails after merge, repair the workflow/environment and redeploy the known-good `main` revision.
