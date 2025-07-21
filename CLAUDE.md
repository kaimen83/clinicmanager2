# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Development server**: `npm run dev` (runs on port 3001 with Turbopack for faster builds)
- **Build**: `npm run build` 
- **Production start**: `npm start`
- **Linting**: `npm run lint`

## Project Architecture

This is a dental clinic management system built with Next.js 15, using the App Router and Server Components. The application manages patients, consultations, payments, inventory, and financial reporting for a dental practice.

### Core Technology Stack
- **Framework**: Next.js 15 with App Router
- **Authentication**: Clerk (Korean localization enabled via `koKR`)
- **Database**: MongoDB with connection pooling
- **UI**: Tailwind CSS + Radix UI components
- **State Management**: React Context for date selection and refresh triggers
- **Excel Operations**: XLSX library for import/export

### Key Architectural Patterns

1. **Authentication Flow**: All routes except `/sign-in` and `/sign-up` are protected via Clerk middleware
2. **Database Architecture**: MongoDB collections include `patients`, `consultations`, `transactions`, `expenses`, `dentalProducts`, `implantProducts`, etc.
3. **API Structure**: RESTful API routes in `/app/api/` with CRUD operations
4. **Component Structure**: Modular components with UI components in `/components/ui/` and business logic components in `/components/`

### Critical Date Handling Requirements

**IMPORTANT**: This system handles Korean timezone (KST, UTC+9) data. Always use the date utility functions to avoid timezone issues:

- Use `toKstDate()` for converting dates to Korean timezone
- Use `toISODateString()` for API date parameters  
- Use `createNewDate()` for MongoDB date fields
- Use `getCurrentKstDate()` for current time in KST

When filtering MongoDB queries by date, convert Korean dates to UTC:
```typescript
// Convert KST date range to UTC for MongoDB queries
const startDateObj = new Date(year, month - 1, day, 0, 0, 0, 0);
const kstOffset = 9 * 60 * 60 * 1000;
const startUtc = new Date(startDateObj.getTime() - kstOffset);
```

### Database Models and Key Collections

- **Patient Management**: `patients` collection with chart numbers, contact info, visit paths
- **Financial Tracking**: `transactions`, `consultations`, `expenses`, `extraIncomes`
- **Inventory Management**: `dentalProducts`, `implantProducts` with stock tracking
- **System Data**: `vendors`, `visitPaths`, `settings`, `visitPathGroups`
- **Additional Collections**: `notices`, `implantContracts`, `cashRecords`, `dentalProductSales`

### Performance Optimizations

The system includes MongoDB aggregation pipelines for analytics, parallel processing with Promise.all, and automatic index creation for frequently queried fields. Patient analysis features use optimized aggregation queries instead of N+1 patterns.

### File Structure Patterns

- `/app/api/[resource]/route.ts` - CRUD endpoints
- `/app/[page]/page.tsx` - Page components  
- `/components/[Feature]Modal.tsx` - Modal dialogs
- `/lib/models/` - Mongoose schemas
- `/lib/utils/` - Utility functions including critical `utils.ts` with date helpers
- `/types/` - TypeScript type definitions

### Context Management

The application uses React Context for global state management:
- **DateContext** (`/lib/context/dateContext.tsx`): Manages selected date and various refresh triggers
  - `selectedDate`: Currently selected date for filtering
  - `refreshTrigger`, `cashRefreshTrigger`, `statsRefreshTrigger`, `expenseRefreshTrigger`: Trigger data refreshes

### Key Business Logic Areas

1. **Patient Transaction Flow**: Multi-step process handling patient info, treatment details, and payment
2. **Cash Management**: Daily cash tracking with opening/closing balances
3. **Consultation Tracking**: Agreed vs non-agreed consultation monitoring
4. **Inventory Management**: Stock in/out operations for dental and implant products
5. **Financial Reporting**: Daily/monthly statistics with various breakdowns
6. **Card Deposit Reconciliation**: Automatic crawling and matching of card payments
7. **Hometax Integration**: Receipt matching and verification for tax compliance

### Important Utility Functions

All date utilities are in `/lib/utils.ts`:
- `cn()`: Tailwind CSS class name merger
- `formatCurrency()`: Korean currency formatting (e.g., "10,000원")
- `generateUUID()`: Cross-browser compatible UUID generation

When working with this codebase, always consider the Korean business context, proper date handling, and the dental practice workflow requirements.