# Code of Conduct Reporting Process

## Purpose

This document defines how to report Code of Conduct (CoC) violations, how reports are handled, and what protections exist for reporters. It ensures a safe, fair, and transparent process for all community members.

## Reporting Channel

### Primary Channel: Secure Email

**Email**: `conduct@teachlink.mobile` (or GitHub Security Advisories for code-related issues)

- **Encryption**: PGP key available at `https://teachlink.mobile/pgp-key.asc` (optional but recommended)
- **Access**: Only Code of Conduct Committee (see below) has access
- **Retention**: Reports retained for 3 years; then securely deleted

### Alternative Channels

| Channel | Use Case |
|---------|----------|
| **GitHub Security Advisories** | Code-related CoC issues (e.g., malicious code, supply chain) |
| **Direct Message to CoC Committee Member** | If email unavailable; member forwards to `conduct@` |
| **In-Person/Event** | Event staff → written report → forwarded to `conduct@` |

### Anonymous Reporting

- **Allowed**: Reporters may omit identifying information
- **Limitation**: Anonymous reports may limit investigation scope and ability to follow up
- **Protection**: Anonymous reporters receive same confidentiality guarantees

## Response Timeline

| Stage | Target | Escalation |
|-------|--------|------------|
| **Acknowledgment** | 24 hours | If no ack in 48h → escalate to Maintainers |
| **Initial Assessment** | 72 hours | Determine severity, jurisdiction, conflicts |
| **Investigation Start** | 5 business days | Assign investigators; notify parties |
| **Resolution Target** | 30 calendar days | Complex cases: extend with reporter notice |
| **Appeal Window** | 14 days from decision | Appeal to Maintainers (if not conflicted) |

*All timelines are targets; complex cases may extend with written notice to reporter.*

## Code of Conduct Committee (CoCC)

### Composition

- **3–5 members**: Diverse roles (Maintainer, Community Manager, Contributor, external advisor if needed)
- **Appointment**: Maintainer consensus; 1-year terms, staggered
- **Conflict of Interest**: Members recuse from cases involving themselves, close collaborators, or family

### Current Members

Listed in `Governance/CoC_COMMITTEE.md` (maintained separately for privacy).

## Report Handling Process

### 1. Intake (0–24h)

1. **Receive** report at `conduct@`
2. **Acknowledge** receipt (auto-reply + personal within 24h)
3. **Assign** case ID; log in secure tracker (access: CoCC only)
3. **Assess immediate safety**: If physical threat → contact authorities; pause process

### 2. Triage (24–72h)

1. **Determine jurisdiction**: Project spaces (GitHub, Discord, events) vs. external
2. **Check conflicts**: Any CoCC member conflicted → recuse
3. **Classify severity** (per `Governance/SECURITY_SEVERITY_RUBRIC.md` adapted for CoC):
   - **Critical**: Physical harm, doxxing, sustained harassment, threats
   - **High**: Targeted harassment, hate speech, doxxing (attempted)
   - **Medium**: Disruptive behavior, microaggressions, unwelcome contact
   - **Low**: Minor policy violation, first offense, misunderstanding
4. **Decide path**: Investigate, mediate, refer, or dismiss (with rationale)

### 3. Investigation (5–30 days)

1. **Assign investigators**: 2 CoCC members (not conflicted)
2. **Collect evidence**: Screenshots, logs, witness statements (with consent)
3. **Interview parties**: Reporter, accused, witnesses (separately; written summary)
4. **Document**: All steps logged with timestamps; evidence preserved
5. **Confidentiality**: Details shared only with CoCC; not shared with Maintainers unless required for action

### 4. Resolution

| Outcome | Action | Authority |
|---------|--------|-----------|
| **No violation** | Dismiss; notify reporter + accused | CoCC consensus |
| **Mediation** | Facilitated conversation; written agreement | CoCC + parties consent |
| **Warning** | Written warning; documented; expires 12 months | CoCC consensus |
| **Temporary ban** | 7–90 days from project spaces | CoCC + Maintainer notification |
| **Permanent ban** | Removal from all project spaces; GitHub org removal | CoCC + Maintainer consensus |
| **Referral** | Legal/authorities if criminal | CoCC + Maintainers |

*All resolutions documented with rationale; stored securely.*

### 5. Communication

- **Reporter**: Notified of outcome + rationale (within 24h of decision)
- **Accused**: Notified of outcome + rationale + appeal rights (within 24h)
- **Community**: Public summary if public incident (anonymized; approved by CoCC)
- **Maintainers**: Notified of bans/appeals (no unnecessary detail)

### 6. Appeal (14 days)

- **Who**: Accused party (reporter may appeal dismissal)
- **To**: Maintainers (excluding conflicted)
- **Grounds**: Procedural error, new evidence, disproportionate sanction
- **Timeline**: Maintainers respond within 14 days; decision final

## Confidentiality Guarantee

### What Is Confidential

- Reporter identity (unless reporter consents to disclosure)
- Accused identity (until resolution requires disclosure)
- Evidence details, witness statements, investigation notes
- Medical/legal information shared during process

### Exceptions

- **Legal obligation**: Subpoena, court order, mandatory reporting laws
- **Imminent harm**: Threat to life/safety → authorities notified
- **Consent**: Reporter/accused consents to specific disclosure

### Data Handling

- **Storage**: Encrypted at rest; access logged
- **Access**: CoCC members only; Maintainers only for bans/appeals
- **Retention**: 3 years from resolution; then secure deletion
- **Deletion**: Reporter may request deletion after 1 year (if no ongoing risk)

## Protections for Reporters

- **No retaliation**: Retaliation against reporters is a CoC violation (permanent ban)
- **Anonymity option**: Reporters may remain anonymous throughout
- **Support**: Referral to external support resources (listed in `SUPPORT_RESOURCES.md`)
- **Process transparency**: Reporter informed of each stage; can ask questions

## Protections for Accused

- **Presumption of fairness**: Process is impartial; evidence-based
- **Right to respond**: Opportunity to present evidence, witnesses
- **No public naming**: Unless permanent ban + public incident requires it
- **Appeal right**: 14-day window; independent review by Maintainers

## Public Incidents

If violation occurs in public channel (GitHub, Discord, event):

1. **Immediate**: Community Manager locks/removes content; documents
2. **Public statement** (within 24h): "We're aware of an incident and are investigating per our CoC process. No further details at this time."
3. **Post-resolution**: Public summary (anonymized) if community impact

## Support Resources

Listed in `SUPPORT_RESOURCES.md`:
- Crisis hotlines (international)
- Legal aid organizations
- Mental health resources
- Digital safety guides

## Training & Awareness

- **Annual CoCC training**: Trauma-informed interviewing, bias awareness, legal obligations
- **Community orientation**: CoC summary in onboarding; link in welcome messages
- **Annual review**: Process reviewed by Maintainers + CoCC; updates via PR

## Related Documents

- Code of Conduct: `CODE_OF_CONDUCT.md`
- Community guidelines: `COMMUNITY_GUIDELINES.md`
- Security severity rubric: `Governance/SECURITY_SEVERITY_RUBRIC.md`
- Escalation path: `Governance/processes/ESCALATION_PATH.md`
- Support resources: `SUPPORT_RESOURCES.md`
- CoC Committee roster: `Governance/CoC_COMMITTEE.md`
- This document: `Governance/COC_REPORTING.md`