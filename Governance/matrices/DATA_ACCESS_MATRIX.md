# Data Access Matrix -- TeachLink Mobile

## Purpose

This document is the versioned, authoritative reference for who may access which classes of data within TeachLink Mobile. It closes the governance gap identified in the issue tracker and is scoped to the `Governance/` folder.

This matrix applies to all data stored, processed, or transmitted by the TeachLink Mobile application, including on-device storage, backend services, and any third-party integrations.

## Data Classifications

Data is classified into four levels. Classification determines the minimum controls required for access.

| Classification | ID | Description | Examples |
| --- | --- | --- | --- |
| Public | `P-0` | Data intended for open distribution; no confidentiality impact if disclosed. | Course catalog, marketing content, public profiles |
| Internal | `I-1` | Operational data restricted to the organization; minor impact if disclosed. | Aggregated usage metrics, content drafts, internal notes |
| Confidential | `C-2` | Personally identifiable information (PII) and business-sensitive data; moderate to significant impact if disclosed. | Names, email addresses, enrollment records, grades, payment metadata |
| Restricted | `R-3` | Highly sensitive data requiring strict need-to-know access; severe impact if disclosed or misused. | Authentication secrets, payment credentials, guardian-student messages, special-category data |

## Roles

Access is granted to roles, not individuals, and follows the principle of least privilege.

| Role | ID | Description |
| --- | --- | --- |
| Student | `ROLE STUDENT` | End user enrolled in courses; accesses their own records and publicly available content. |
| Guardian | `ROLE PUARDAIN` | Parent or legal guardian of a student; accesses the linked student's records. |
| Teacher | `ROLE TEACHER` | Educator responsible for courses and assessments. |
| Administrator | `ROLE ADMIN` | Operational staff managing enrollments, support, and configuration. |
| Support Engineer | `ROLE SUPPORT` | Engineering staff providing break-fix support under break-glass procedures. |
| Service Account | `ROLE SERVICE` | Automated systems and background jobs operating with scoped credentials. |

## Access Matrix

Legend: `:white_check_mark:` = full access; `:large_blue_circle:` = access limited to own or linked records; `:x:` = no access.

| Data Classification | Student | Guardian | Teacher | Administrator | Support Engineer | Service Account |
| --- | --- | --- | --- | --- | --- | --- |
| Public (`P-0`) | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: | :white_check_mark: |
| Internal (`I-1`) | :x: internal metrics only | :x: | :large_blue_circle: course-scoped | :white_check_mark: | :large_blue_circle: break-glass only | :large_blue_circle: job-scoped |
| Confidential (`C-2`) | :large_blue_circle: own records | :large_blue_circle: linked student | :large_blue_circle: assigned courses | :white_check_mark: | :large_blue_circle: break-glass only | :large_blue_circle: job-scoped |
| Restricted (`R-3`) | :x: | :x: | :x: | :large_blue_circle: audited need-to-know | :x: | :large_blue_circle: job-scoped, audited |

## Access Conditions

- All access to Confidential and Restricted data MUST be authenticated and authorized server-side; client-side checks are not sufficient.
- Guardian access requires a verified guardian-student link and MUST be limited to the linked student's records.
- Support Engineer access MUST occur under a time-bounded, audited break-glass procedure with explicit approval.
- Service Account access MUST be scoped to the minimum permissions required by the job and rotated on a schedule.
- Access to Restricted data MUST be logged with actor, timestamp, resource, and justification.
- Data MUST be transmitted over TLS 1.2+ and encrypted at rest using the project-approved encryption standard.

## Review Cadence

| Review Activity | Cadence | Owner |
| --- | --- | --- |
| Full matrix review and re-approval | Annually, and on any material change to data classifications or roles | Governance lead |
| Access grants for Confidential and Restricted data | Quarterly re-certification | Security lead |
| Break-glass access logs | Monthly review | Security lead |
| Service Account credential rotation and scope audit | Quarterly | Platform lead |

Reviews MUST be recorded in the governance changelog with the reviewer, date, and any approved deviations.

## Change Management

- Any change to this matrix MUST be submitted as a pull request scoped to the `Governance/` folder.
- Changes MUST include a description of the rationale and the affected classifications or roles.
- Changes MUST be reviewed by the Governance lead and the Security lead before merge.

## Version History

| Version | Date | Description |
| --- | --- | --- |
| 1.0.0 | 2024-01-01 | Initial data access matrix for TeachLink Mobile. }
