# Initial official-source collection status — 2026-10-20

The initial batch contains eight current CommDDL entities: `ofc-2027-main`, `ofc-2027-postdeadline`, `twc`, `jsac`, `jsac-underwater-2027`, `jsac-flexible-2026`, `jsac-quantum-series`, and `sigcomm-2027`.

| Evidence | Count |
|---|---:|
| Distinct catalog entities with an official rendered page read | 8 |
| Structured review sections prepared from those pages | 26 |
| Sections marked human verified / published to catalog YAML | 0 |
| Official YAML records changed | 0 |

A local collector run through the explicitly requested proxy could not resolve the official hosts (`getaddrinfo ENOTFOUND`). To make progress without fabricating a local fetch, the eight official pages were read through a web renderer, and a local-only candidate batch was prepared at `artifacts/initial-official-review-batch.json`. It preserves the visible official headings and heading levels, uses brief Chinese summaries and selected date/topic facts, links each section to its source, and leaves `verifiedAt` unset. It explicitly identifies its capture method as a rendered-page readback, not a raw-HTML collection by the repository script.

The artifact is ignored by Git and is not deployed or included in the public catalog. It still needs an authorized maintainer to compare the section structure and summaries with the linked pages before any candidate can be accepted. The frozen HTML tests verify local parser behavior, but they do not prove the local HTTP collector can fetch these hosts or that its raw DOM extraction matches the rendered-page candidate. Repeat the batch in an egress-enabled environment and compare its output before enabling scheduled updates.
