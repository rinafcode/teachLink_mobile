# Security Officer Role

## Purpose

The Security Officer (SO) is responsible for the security posture of TeachLink Mobile, leading vulnerability management, secure development practices, and incident response to protect users, contributors, and the project's integrity.

## Responsibilities

### Vulnerability Management
- **Receive & triage reports**: Monitor `security@teachlink.mobile` (or GitHub Security Advisories); acknowledge within 24h
- **Coordinate disclosure**: Follow `Governance/processes/VULN_DISCLOSURE.md`; work with reporters on timeline
- **Severity assessment**: Apply `Governance/SECURITY_SEVERITY_RUBRIC.md` (CVSS + context)
- **Fix coordination**: Assign to maintainers/committers; track via private security advisories
- **Advisory publication**: Publish GitHub Security Advisory + CVE (if applicable) after fix release

### Secure Development Practices
- **Threat modeling**: Review architecture changes for security impact; maintain threat model docs
- **Dependency scanning**: Monitor `dependabot`, `npm audit`, `cargo audit`; prioritize fixes
- **Code review guidance**: Maintain security review checklist; train reviewers on common vuln classes
- **CI/CD security**: Enforce signed commits, provenance, SLSA levels; monitor supply chain risks

### Incident Response
- **Lead response**: Activate `Governance/processes/ESCALATION_PATH.md` for security incidents
- **Containment & eradication**: Coordinate fix development, deployment, verification
- **Post-incident review**: Blameless postmortem within 14 days; publish summary (redacted)
- **Credential rotation**: Manage rotation of compromised keys, tokens, certificates

### Compliance & Governance
- **Policy ownership**: Maintain `Governance/policies/EMBARGO.md`, `SECURITY_RESPONSE_TEAM.md`
- **Audit coordination**: Support external audits, penetration tests, compliance reviews
- **Training**: Annual security awareness for Maintainers/Committers; secure coding guidelines
- **Budget advocacy**: Recommend security tooling, audit, bug bounty budget to Treasurer

## Disclosure-Handling Authority

| Authority | Scope |
|-----------|-------|
| **Receive private reports** | `security@` email, GitHub Security Advisories, HackerOne (if enabled) |
| **Set disclosure timeline** | Standard: 90 days; negotiable based on severity/exploitability |
| **Coordinate with vendors** | Upstream deps (React Native, Expo, Apple, Google); coordinate disclosure |
| **Request CVE** | Initiate CVE assignment via MITRE/GitHub for qualifying vulnerabilities |
| **Authorize emergency releases** | Hotfix sign-off authority (with Release Manager) for P0 vulnerabilities |
| **Revoke credentials** | Rotate compromised keys, tokens, certificates immediately |

*SO does **not** have: general merge rights, governance voting, financial authority, or community moderation.*

## Appointment Process

1. **Nomination**: Maintainers nominate a trusted individual with:
   - **Security expertise**: Application security, mobile security, cryptography, or related
   - **Incident experience**: Led or significantly contributed to security incident response
   - **Trustworthiness**: Impeccable integrity; no conflicts of interest; handles sensitive data responsibly
   - **Availability**: Responsive to time-sensitive reports (24h acknowledgment target)
2. **Vetting**: Background check (if handling sensitive user data); reference check
3. **Approval**: Maintainer consensus (no objections) — **unanimous consent required**
4. **Onboarding**: Access to security@ email, private advisories, signing keys, infra secrets

## Term & Succession

- **Term**: 1 year, renewable with Maintainer unanimous consent
- **Transition**: 30-day handoff; outgoing SO mentors incoming
- **Interim**: Maintainers appoint interim within 7 days (must meet eligibility)
- **Removal**: Maintainer unanimous consent for:
  - Failure to meet response SLA (2+ missed 24h acknowledgments)
  - Mishandling of sensitive information
  - Conflict of interest (e.g., working for competitor, selling exploits)
  - CoC violations

## Security Response Team (SRT)

The SO **leads** the Security Response Team (per `Governance/SECURITY_RESPONSE_TEAM.md`):

| Role | Responsibility |
|------|----------------|
| **Security Officer (Lead)** | Triage, coordination, disclosure, sign-off |
| **Release Manager** | Build, sign, deploy fixes; store submission |
| **Maintainer(s)** | Code review, fix development, architecture decisions |
| **Committers** | Merge fixes; backport to release branches |
| **Community Manager** | Public communication (coordinated timing) |
| **Legal/Compliance** (if applicable) | Regulatory notification, liability assessment |

## Relationship to Other Roles

| Role | Interaction |
|------|-------------|
| **Release Manager** | Joint hotfix sign-off; coordinate deployment timing |
| **Maintainers** | Approve security fixes; allocate dev resources; unanimous SO appointment |
| **Committers** | Merge security fixes; backport to release branches |
| **Docs Lead** | Security advisories, best practices docs, crypto docs review |
| **Community Manager** | Public messaging for incidents/advisories (timing coordinated by SO) |
| **Treasurer** | Security budget (tools, audits, bug bounties) |

## Security Review Checklist (for PRs)

Reviewers and Committers should verify:
- [ ] No secrets, tokens, keys in code/config
- [ ] Input validation/sanitization on all user data
- [ ] Proper authentication/authorization checks
- [ ] Cryptographic operations use vetted libs (no custom crypto)
- [ ] Dependencies updated; no known CVEs (Dependabot clean)
- [ ] Permissions requested are minimal (iOS/Android)
- [ ] Network requests use TLS; certificate pinning where appropriate
- [ ] Logging doesn't expose PII/secrets
- [ ] Error messages don't leak stack traces/internal details

## Documentation

- Vulnerability disclosure: `Governance/processes/VULN_DISCLOSURE.md`
- Security severity rubric: `Governance/SECURITY_SEVERITY_RUBRIC.md`
- Security response team: `Governance/SECURITY_RESPONSE_TEAM.md`
- Embargo policy: `Governance/policies/EMBARGO.md`
- Escalation path: `Governance/processes/ESCALATION_PATH.md`
- This document: `Governance/roles/SECURITY_OFFICER.md`