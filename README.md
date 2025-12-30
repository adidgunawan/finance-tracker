# Finance Tracker

A personal finance web application built with correct accounting principles and a macOS-style minimalist UI.

## Features

### ✅ Implemented

- **Chart of Accounts**
  - Tree-based hierarchy (max 3 levels)
  - Account types: Asset, Liability, Income, Expense
  - CRUD operations with validation
  - Expand/collapse tree view

- **Transaction System**
  - Double-entry accounting (abstracted from UI)
  - Income transactions
  - Expense transactions
  - Transfer between accounts (with optional fees)
  - Transaction list with filters

- **Dashboard**
  - Cash flow summary cards
  - Monthly trend chart (Income vs Expense)
  - Asset distribution pie chart
  - Last 6 months data visualization

- **Navigation**
  - Clean sidebar navigation
  - macOS-inspired design system

### 🚧 Planned

- **Reports**
  - Time-based reports (Weekly/Monthly/Yearly)
  - Grouped by Chart of Accounts
  - Expandable hierarchy
  - Advanced filters

- **Budgeting**
  - Fixed monthly budgets
  - Custom monthly amounts
  - Date range budgets
  - Budget vs actual comparison

- **Attachments**
  - File upload for transactions
  - Google Drive integration (or local storage)

## Tech Stack

- **Framework**: Next.js 15 with TypeScript
- **Styling**: Tailwind CSS (macOS color system)
- **UI Components**: shadcn/ui (Radix UI)
- **Icons**: Radix Icons only
- **Charts**: Recharts
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Supabase account and project

### Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.local` and update with your Supabase credentials
   - Required variables:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
     - `BETTER_AUTH_SECRET` - Secret key for better-auth
     - `DATABASE_URL` - PostgreSQL connection string
     - `GOOGLE_CLIENT_ID` - Google OAuth client ID
     - `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
     - `ALLOWED_USER_EMAILS` - Comma-separated list of allowed email addresses (e.g., `user1@example.com,user2@example.com`). Only users with emails in this list can log in. If not set, all logins will be denied (fail-secure).
       - **Important**: All users (including existing users) must have their email addresses in this list to be able to log in. Make sure to add existing user emails to the whitelist before enabling this feature.

4. Run database migrations:
   - Execute the SQL in `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000)

## Database Schema

The application uses a proper double-entry accounting system:

- **chart_of_accounts**: Account hierarchy with type validation
- **transactions**: Main transaction records
- **transaction_lines**: Double-entry journal entries (debits/credits)
- **transaction_tags**: Optional tags for categorization
- **budgets**: Budget definitions
- **budget_monthly_amounts**: Monthly budget amounts

All tables have Row Level Security (RLS) enabled for user data isolation.

## Design Principles

- **Accounting Correctness**: Proper double-entry bookkeeping
- **Minimalist UI**: macOS-inspired, clean, no visual noise
- **Desktop-First**: Optimized for desktop usage
- **Neutral Colors**: Grey palette with subtle accent colors
- **Functional Over Decorative**: Every element serves a purpose

## Color System

```css
--background: #f5f5f7
--surface: #ffffff
--border: #e5e5ea
--text-primary: #1d1d1f
--text-secondary: #6e6e73
--accent-primary: #007aff (blue)
--accent-success: #34c759 (green)
--accent-warning: #ff9f0a (orange)
--accent-danger: #ff453a (red)
```

## Project Structure

```
src/
├── app/                    # Next.js app router pages
│   ├── accounts/          # Chart of Accounts page
│   ├── transactions/      # Transactions page
│   ├── reports/           # Reports page (placeholder)
│   ├── budgets/           # Budgets page (placeholder)
│   └── page.tsx           # Dashboard
├── components/
│   ├── accounts/          # Account-related components
│   ├── transactions/      # Transaction forms
│   ├── dashboard/         # Dashboard charts
│   ├── layout/            # Navigation components
│   └── ui/                # shadcn/ui components
├── hooks/                 # React hooks for data fetching
├── lib/
│   ├── accounting/        # Double-entry logic
│   ├── supabase/          # Supabase client & types
│   └── utils.ts           # Utility functions
└── supabase/
    └── migrations/        # Database migrations
```

## Known Issues

- Production build currently has a webpack configuration issue with Tailwind CSS
- Development mode works perfectly
- Google Drive attachment integration is planned but not implemented

## License

MIT
