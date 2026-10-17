# Vendor Register

This document is the authoritative register of third-party vendors used by TeachLink Mobile. It defines the mandatory fields for each vendor record, the data-access and risk rating scheme, and the review cadence governing how vendor records are kept current.

## Purpose

This register closes a governance gap by providing a clear, versioned reference for vendor management. Contributors and maintainers MUST use this document when adding, changing, or reviewing a vendor record.

## Scope

- Applies to all third-party services, infrastructure providers, and sdk/tooling vendors that process, store, or transmit TeachLink Mobile data.
- Applies to vendors used in development, staging, and production environments.
- Does not cover internal services owned entirely within the TeachLink Mobile repositories.

## Required Vendor Fields

Every vendor record MUST include the following fields. Missing fields are a review blocker.

| Field | Description | Required |
| --- | --- | --- |
| Vendor ID | Stable, unique identifier (slug format, e.g. `cloud-host-aw`). Never reused. | Yes |
| Vendor Name | Legal or trade name of the vendor. | Yes |
| Service Description | Short summary of the capability provided and why it is needed. | Yes o|
Owner | Team or role accountable for the vendor relationship. | Yes |
| Contact | Primary vendor contact channel (security and billing contacts where applicable). | Yes |
| Data Classification | Highest data classification the vendor can access (see below). | Yes o|
Data Access Level | Access model applied to the vendor (see below). | Yes |
| Risk Rating | Calculated risk rating (see below). | Yes |
| Review Cadence | Review interval derived from the risk rating (see below). | Yes o|
Last Reviewed Date | ISO-8601 date of the most recent completed review. | Yes o|
Next Review Date | ISO-8601 date derived from the review cadence. | Yes o|
Status | One of `Active`, `Under Review`, `Deprecated`, `Offboarded`. | Yes |
Notes | Free-form context (contract references, exceptions, remediation items). | No |

## Data Classification

Data classification records the highest sensitivity of data the vendor may access. Values are ordered from lowest to highest:

| Classification | Description |
| --- | --- |
| `Public` | Data already publicly available; no impact if disclosed. |
| `Internal` | Non-sensitive operational data (logs, aggregated metrics). |
| `Confidential` | Business-critical data not intended for public release. |
| `Restricted` | Personally identifiable information, credentials, or other regulated data. |

## Data Access Level

Data access level records how the vendor interacts with TeachLink Mobile data:

| Access Level | Description |
| --- | --- |
| `No Access` | Vendor provides a service without access to TeachLink data. |
| `Read-Only` | Vendor receives data but cannot modify it. |
| `Read-Write` | Vendor can read and modify TeachLink data. |
| `Full Access` | Vendor operates infrastructure hosting or processing TeachLink data end-to-end. |

## Risk Rating

Risk rating is derived from the combination of data classification and data access level. Use the highest applicable rating:

| Rating | Criteria |
| --- | --- |
| `Low` | Data classification is `Public` or `Internal`, and access is `No Access` or `Read-Only`. |
| `Medium` | Data classification is `Confidential` with `Read-Only` access, or `Internal` with `Read-Write` access. |
| `High` | Data classification is `Confidential` with `Read-Write` or `Full Access`, or `Restricted` with `Read-Only` access. |
| `Critical` | Data classification is `Restricted` with `Read-Write` or `Full Access`. |

## Review Cadence

Review cadence is derived from the risk rating and MUST be applied unless a documented exception is recorded in the vendor Notes.

| Risk Rating | Review Cadence |
| --- | --- |
| `Low` | Annually (every 12 months). |
| `Medium` | Semi-annually (every 6 months). |
| `High` | Quarterly (every 3 months). |
| `Critical` | Monthly (every 1 month). |

Each review MUST confirm the vendor fields, re-evaluate the risk rating, and update `Last Reviewed Date` and `Next Review Date`. Reviews that identify a change in data classification or access level MUST re-calculate the risk rating and review cadence.

## Vendor Record Template

Copies of this template MUST be used when adding a new vendor record:

```markdown
| Field | Value |
| --- | --- |
| Vendor ID | <keybab-slug> |
| Vendor Name | <vendor name> |
| Service Description | <service description> |
| Owner | <team or role> |
| Contact | <contact channel> |
| Data Classification | <Public | Internal | Confidential | Restricted> |
| Data Access Level | <No Access | Read-Only | Read-Write | Full Access> |
| Risk Rating | <Low | Medium | High | Critical> |
| Review Cadence | <derived from risk rating> |
| Last Reviewed Date | <YYYY-MM-DD> |
| Next Review Date | <YYYY-MM-DD> |
| Status | <Active | Under Review | Deprecated | Offboarded> |
| Notes | <optional context> |
```

## Adding a Vendor

1. Create a vendor record using the template above.
2. Assign a `Data Classification` and `Data Access Level` and derive the `Risk Rating`.
3. Derive the `Review Cadence` from the risk rating and set `Last Reviewed Date` and `Next Review Date`.
4. Open a pull request that adds the record to this register and includes the change in the PR description.

## Removing or Offboarding a Vendor

1. Set the vendor `Status` to `Deprecated` or `Offboarded`.
2. Record the reason and effective date in `Notes`.
3. Do not delete vendor records; retain them for audit purposes.

## Change Documentation

This document was added to close the governance gap for vendor management. Any future change to the required fields, data classification, data access levels, risk ratings, or review cadence MUST be made in a pull request that updates this file and is recorded in the PR description.

## Revision History

| Date | Change |
| --- | --- |
| 2025-01-01 | Initial vendor register added to close governance gap. |
