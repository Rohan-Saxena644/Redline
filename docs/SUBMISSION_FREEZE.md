# Submission candidate and preservation checklist

This is a preparation procedure, not an external freeze, publication or submission. No remote repository, uploaded video or hosted app is assumed. The public-repository setup path is README → `.env.example` → `docs/INTEGRATIONS.md`; public files contain configuration **names**, not private values.

## Prepare a reviewable candidate

1. Complete relevant checks and update `docs/VERIFICATION.md` with actual results. Real model proposal and PayPal sandbox checkout remain required live evidence; fixtures do not satisfy those stages.
2. Commit reviewed source, lockfile, migrations, instructions and original assets. Use `git status --short` and a credential/artifact scan. Never commit `.env`, merchant secrets, API keys, session tokens, addresses or payer details.
3. From that clean committed tree run `npm run submission:manifest`. It writes `docs/SUBMISSION_MANIFEST.json` containing the exact **source commit/tree**, lockfile hash, workspace/dependency versions, supported runtime, deployment absence and required external configuration names. It never reads `.env`, contacts providers, uploads or publishes anything.
4. Commit the generated manifest in a metadata-only commit. It necessarily identifies the preceding source commit: a file cannot contain the hash of its own future commit. Record both that source commit and the final metadata commit in your private submission notes. A later code change requires a new manifest and another review; do not silently reuse old evidence.
5. After separate authorization, publish the repository and video, verify their actual logged-out URLs/access, and enter exact links in Devpost. If a hosted version exists, record its actual deployment identity separately; the current manifest uses `null` because no deployment exists. Do not invent a URL or version.

The manifest describes a **local candidate**, not a submitted or live-verified release. It points to the human verification record; generating JSON is not a test run or a certification. Do not share private credentials with that file.

## Deadline through actual announcement

The [official rules](https://paypalaihackathon.devpost.com/rules) currently list the submission deadline as **November 12, 2026, noon PST** (**November 13, 1:30 AM IST**) and the announcement on or around **December 21, 2 PM Pacific** (**December 22, 3:30 AM IST**). Recheck the rules/form and the owner's organizer-email requirements before submission; preserve access through the actual announcement if it is delayed.

- [ ] Record the exact submitted source SHA, final manifest metadata SHA, public repository URL, video URL/checksum and any deployment version/URL after authorization.
- [ ] Preserve the submitted repository commit and linked setup/assets. Do not force-push/rewrite submitted history, delete or replace its branch/tag/reference, or change the judge-facing README underneath the submitted reference.
- [ ] Keep the submitted video public and unchanged. Do not trim/replace narration or footage, substitute a new video behind a link, delete it, or add unverified claims after the deadline.
- [ ] Keep linked demo, attachments, receipt examples and other submitted materials available with the same content and access permissions through the announcement. Store a private archive/checksum of the actual submitted bundle; the local manifest alone does not preserve external content.
- [ ] Continue only operational actions necessary to preserve authorized access (uptime, backups, reconciliation, private security-driven credential rotation). Do not alter application behavior or source after the deadline under the guise of maintenance.
- [ ] If a critical security/access problem requires a material change, preserve the submitted version and obtain organizer guidance/authorization first; keep a dated record of the change and its reason. Do not expose secrets to preserve an unchanged demo.
- [ ] Verify that model quotas/trial dates and sandbox test access remain usable, following `ACCESS_CONTINUITY.md`. Unknown quotas are unresolved risks, not promised access.
- [ ] Remove restrictions only after the actual winner announcement or explicit organizer instructions. This checklist does not perform an external freeze or control a remote repository/video host.
