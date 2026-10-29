# ⚠️ Data Correction Mode — Handshake Document

> **Created:** 2026-07-02  
> **Reason:** Post-migration data cleanup after the CSV repayment ledger ingestion (see `scripts/ingest-repayment-ledger.ts`).  
> **Status:** 🟠 ACTIVE — editing is currently ENABLED.

---

## What Was Enabled

Three categories of admin-only controls were added temporarily to allow auditing and correcting database records after the ledger import.

### 1. Server Actions (in `lib/actions/loan.actions.ts`)

Four new server actions were appended at the **very bottom** of the file (after the `getPortfolioTrendData` export), clearly marked with a warning banner comment:

| Action | What it does |
|---|---|
| `deleteLoan(loanId)` | Hard-deletes a loan row (cascades to installments, transactions, penalties via FK) |
| `deleteTransaction(transactionId, loanId)` | Hard-deletes a single `loan_transactions` row |
| `editTransaction(transactionId, loanId, updates)` | Edits amount, date, comment, payment_method, reference_id on a transaction |
| `deletePenalty(penaltyId, loanId)` | Hard-deletes a penalty and rolls back its amount from the installment |

All four are gated behind `requireAdminRole()` and write a `[DATA CORRECTION]`-prefixed entry to the audit trail before executing.

### 2. UI Controls (in `components/LoanDetailClient.tsx`)

| Location | What was added |
|---|---|
| **Transactions tab** | Orange "DATA CORRECTION MODE" banner (admin only) |
| **Transactions tab — each row** | ✏️ Edit button (opens inline edit form) + 🗑️ Delete button |
| **Penalties tab — each row** | 🗑️ Delete button (in addition to existing Reverse) |
| **Actions Panel (right sidebar)** | Dark red "Delete Entire Loan" card with button |

All UI controls are gated on `currentUser?.role === 'ADMIN'`. Non-admin users see **none** of these controls.

---

## How to Disable (Restore to Read-Only)

Follow these steps **in order** when data correction is complete.

### Step 1 — Remove Server Actions

Open [`lib/actions/loan.actions.ts`](./lib/actions/loan.actions.ts) and **delete** the entire block from the warning banner to the end of the file:

```
// ═══════════════════════════════════════════════════════════════════════════════
// ⚠️  TEMPORARY DATA CORRECTION ACTIONS — ADMIN ONLY
// ...
```

Delete from that line all the way to the end of the file (the four exported `const` functions: `deleteLoan`, `deleteTransaction`, `editTransaction`, `deletePenalty`).

### Step 2 — Restore Imports in LoanDetailClient

Open [`components/LoanDetailClient.tsx`](./components/LoanDetailClient.tsx).

**Line ~6** — change this:
```ts
import { disburseLoan, deleteLoan, deleteTransaction, editTransaction, deletePenalty } from '@/lib/actions/loan.actions';
```
back to:
```ts
import { disburseLoan } from '@/lib/actions/loan.actions';
```

**Line ~22** — remove `Pencil, Trash2,` from the lucide-react import.

### Step 3 — Remove State Variables

In `LoanDetailClient`, find the `// ── DATA CORRECTION STATE` comment block and remove:
```ts
const [deletingId, setDeletingId] = useState<string | null>(null);
const [editingTx, setEditingTx] = useState<LoanTransaction | null>(null);
const [editForm, setEditForm] = useState<...>({ ... });
const [editSaving, setEditSaving] = useState(false);
const isAdmin = currentUser?.role === 'ADMIN';
```

### Step 4 — Remove Handler Functions

Find and delete the `// ── DATA CORRECTION HANDLERS` comment block and its five functions:
- `handleDeleteTransaction`
- `handleDeletePenalty`
- `handleDeleteLoan`
- `startEditTx`
- `handleSaveEditTx`

### Step 5 — Restore the Transactions Table

In the Transactions tab section:
1. Remove the orange `DATA CORRECTION MODE` banner div.
2. Remove the `{isAdmin && <col ... />}` colgroup entry.
3. Remove the `{isAdmin && <th ... >⚠ Admin</th>}` header cell.
4. Remove the `{isAdmin && ( <td ...> <Pencil /> <Trash2 /> </td> )}` action cell from each row.
5. Remove the entire `{isAdmin && editingTx?.$id === tx.$id && ( <tr key="...-edit"> ... </tr> )}` inline edit form block.
6. Restore `colSpan={7}` on the allocation detail row (was temporarily `colSpan={isAdmin ? 8 : 7}`).

### Step 6 — Restore the Penalties Table

In the Penalties tab, in the action `<td>`, remove the `{isAdmin && ( <button onClick={handleDeletePenalty}> )}` block, and restore `style={{ textAlign: 'right' }}` (remove `whiteSpace: 'nowrap'`).

### Step 7 — Remove the Delete Loan Card from ActionPanel

In the `ActionPanel` component (below the main `LoanDetailClient` export):
1. Remove the `// ── DATA CORRECTION (admin-only, temporary)` comment and the `handleDeleteLoan` async function defined right after the `useState` hooks.
2. Remove the entire `{/* ── DATA CORRECTION: Delete Loan ── */}` JSX block (the dark red card with the `btn-delete-loan` button).

---

## Verification Checklist (after disabling)

- [ ] Non-admin users see the loan detail page with no red/orange banners or delete buttons
- [ ] Admin users also see no delete/edit controls
- [ ] `deleteLoan`, `deleteTransaction`, `editTransaction`, `deletePenalty` no longer exist as exported functions
- [ ] `lib/actions/loan.actions.ts` ends with the `getPortfolioTrendData` export
- [ ] No TypeScript errors: run `npx tsc --noEmit`

---

## Change Log

| Date | Action | Done by |
|---|---|---|
| 2026-07-02 | Enabled data correction mode (this document created) | Admin |
| _TBD_ | Disabled data correction mode | _TBD_ |
