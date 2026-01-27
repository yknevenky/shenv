# Shenv Frontend

The React frontend for the Shenv Google Sheets & Gmail Governance Platform.

## Features

- **Dashboard**: Unified view of Google Sheets and Gmail statistics.
- **Gmail Management**:
  - Discovery Wizard for scanning inboxes.
  - Sender Workbench with advanced sorting/filtering.
  - Bulk deletion of messages from identified senders.
  - Activity logging and data freshness indicators.
- **Google Sheets**:
  - Organization-wide sheet discovery.
  - Permission auditing and metadata viewing.
- **Authentication**: Signin/Signup with improved field-level validation and error reporting.

## Tech Stack

- **React 19**
- **TypeScript**
- **Vite**
- **TailwindCSS**
- **React Query** (Server state management)
- **Axios** (HTTP client with auth interceptors)

## Getting Started

### Prerequisites

- Node.js v18+
- npm

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

The app will start on [http://localhost:5173](http://localhost:5173).

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=http://localhost:3000
```

## Structure

- `src/components/`: Reusable UI components (Gmail, UI primitives).
- `src/pages/`: Page-level components.
- `src/services/`: API client services (Gmail, Auth).
- `src/hooks/`: Custom React hooks.
- `src/types/`: TypeScript definitions.

## Build

```bash
npm run build
```
