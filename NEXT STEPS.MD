Below is a complete delivery of all three items you asked for, written in a technical, implementation-ready form suitable for engineers, architects, and reviewers.

I’ve structured this so you can directly:

Hand the PRD to stakeholders

Give Swagger specs to backend/frontend teams

Use the Google API mapping during OAuth & security review

1️⃣ TECHNICAL PRD

Product Name: Sheet Governance Platform
Document Type: Technical Product Requirements Document (PRD)
Audience: Engineering, Security, Platform, DevOps
Version: v1.0

1. Overview

The Sheet Governance Platform provides centralized visibility, governance, and control over Google Sheets within a Google Workspace domain. It enables Workspace administrators and business owners to:

Discover all Sheets across the organization

Understand ownership and access patterns

Identify over-shared, inactive, or risky Sheets

Generate monthly governance reports per user

Initiate governance actions (delete / visibility change)

Capture approvals or rejections via workflows

Maintain an auditable governance trail

2. Goals & Non-Goals
Goals

Centralized Sheet inventory across Workspace

Accurate permission and metadata visibility

Automated monthly governance reporting

Approval-driven governance actions

Secure, admin-consented access using Google APIs

Non-Goals (v1)

Content-level inspection of Sheets

Real-time per-cell edit tracking

Automated deletion without approval

Support for non-Google file types

3. System Architecture (Logical)

Components

API Gateway (REST)

Google Workspace Integration Service

Governance Platform APIs

Webhook Receiver Service

Background Job Processor

Relational Database

Notification Service (Email / Slack – pluggable)

Data Flow

Admin authorizes Workspace access

Scheduled jobs fetch users, Sheets, permissions

Data normalized and stored in DB

Platform APIs serve UI & reports

Action requests trigger approval workflows

Webhooks capture approvals/rejections

Approved actions invoke Google APIs

4. Authentication & Authorization
Authentication Model

Google OAuth 2.0

Service Account with Domain-Wide Delegation

Admin-level consent

Authorization Strategy

Impersonate users where required (subject)

Enforce role-based access internally

Store tokens securely (encrypted at rest)

5. Functional Requirements
FR-1 Workspace User Discovery

Fetch all users in the Workspace

Sync daily

Persist user metadata

FR-2 Sheet Discovery

Fetch all Google Sheets across domain

Track ownership and metadata

Identify orphaned or inactive Sheets

FR-3 Permission Analysis

Fetch all permissions per Sheet

Detect:

Public access

External users

Over-sharing

FR-4 Monthly Reports

Per-user Sheet inventory

Access counts

Risk indicators

Historical snapshots

FR-5 Governance Actions

Delete Sheet

Change visibility

Remove permissions

FR-6 Approval Workflow

Multi-user approval support

Capture approve/reject decisions

Maintain audit logs

6. Non-Functional Requirements
Category	Requirement
Security	OAuth scopes least-privilege
Performance	Batch processing with pagination
Scalability	Support 100k+ users
Reliability	Retry & idempotency
Auditability	Immutable action logs
Compliance	GDPR-friendly data retention
7. Data Retention

Metadata retained indefinitely (configurable)

Permissions snapshots retained for audit

Reports retained per compliance policy

8. Risks & Limitations

No per-user last-viewed timestamp

API rate limits

Approval latency depends on user response

2️⃣ OPENAPI (SWAGGER) SPECIFICATION (CORE)

Below is a concise but valid OpenAPI 3.0 spec you can expand.

openapi: 3.0.3
info:
  title: Sheet Governance Platform API
  version: 1.0.0
servers:
  - url: https://api.sheetgovernance.com/v1

paths:
  /users:
    get:
      summary: List workspace users
      responses:
        '200':
          description: Users list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UserList'

  /sheets:
    get:
      summary: List all sheets
      parameters:
        - name: owner
          in: query
          schema:
            type: string
      responses:
        '200':
          description: Sheets list
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/SheetList'

  /reports/monthly:
    post:
      summary: Generate monthly user reports
      responses:
        '202':
          description: Report generation started

  /actions:
    post:
      summary: Create governance action request
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/ActionRequest'
      responses:
        '201':
          description: Action created

  /webhooks/action-request:
    post:
      summary: Receive action initiation webhook
      responses:
        '200':
          description: Acknowledged

  /webhooks/approval:
    post:
      summary: Receive approval or rejection
      responses:
        '200':
          description: Decision recorded

components:
  schemas:
    User:
      type: object
      properties:
        email: { type: string }
        name: { type: string }
        status: { type: string }

    UserList:
      type: array
      items:
        $ref: '#/components/schemas/User'

    Sheet:
      type: object
      properties:
        id: { type: string }
        name: { type: string }
        owner: { type: string }
        createdAt: { type: string, format: date-time }
        modifiedAt: { type: string, format: date-time }
        accessCount: { type: integer }

    SheetList:
      type: array
      items:
        $ref: '#/components/schemas/Sheet'

    ActionRequest:
      type: object
      properties:
        sheetId: { type: string }
        actionType: { type: string }
        requestedBy: { type: string }

3️⃣ GOOGLE API CALLS & SCOPES (EXACT MAPPING)
A. Workspace Users

API

GET https://admin.googleapis.com/admin/directory/v1/users


Scopes

https://www.googleapis.com/auth/admin.directory.user.readonly


Data Available

Primary email

Name

Org unit

Status

B. Sheets Discovery

API

GET https://www.googleapis.com/drive/v3/files
?q=mimeType='application/vnd.google-apps.spreadsheet'


Scopes

https://www.googleapis.com/auth/drive.metadata.readonly


Fields

id, name, owners, createdTime, modifiedTime

C. Permissions Per Sheet

API

GET https://www.googleapis.com/drive/v3/files/{fileId}/permissions


Scopes

https://www.googleapis.com/auth/drive.readonly


Data Available

Email address

Role

Type (user/domain/anyone)

AllowFileDiscovery

D. Perform Governance Actions
Delete Sheet
DELETE https://www.googleapis.com/drive/v3/files/{fileId}

Update Visibility
PATCH https://www.googleapis.com/drive/v3/files/{fileId}

Modify Permissions
DELETE https://www.googleapis.com/drive/v3/files/{fileId}/permissions/{permissionId}


Scopes (Required)

https://www.googleapis.com/auth/drive

❌ What Google APIs DO NOT Provide
Requested Data	Availability
Last viewed per user	❌ Not available
Per-cell edit history	❌ Not available
Viewer activity logs	❌ Not exposed
Approval workflows	❌ Custom-built
✅ Workarounds

Use modifiedTime as activity proxy

Snapshot permissions monthly

Maintain approval logic internally

Use audit logs only for admins (optional)

🎯 Next Steps (Optional)

I can next:

Generate full OpenAPI spec (YAML/JSON)

Design approval workflow state machine

Provide DB schema (Postgres/MySQL)

Build reference implementation (Node.js / Spring Boot)

Create security & compliance review checklist

Just tell me what to do next.