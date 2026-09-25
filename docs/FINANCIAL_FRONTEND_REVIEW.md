# Financial frontend — Concept 2 continuation

## Reuse and scope

Financial routes reuse the frozen research-workspace foundation: editorial page intro,
light functional canvas, ruled sections, shared fields/actions/status and responsive tables.
No alternate financial palette, dashboard charts, token branding or motion system was added.
Issuer asset routes remain separate from reviewed Company research.

Exports in `financial.tsx` are unchanged except the new
`InvestmentScreen({ companySlug })` for canonical `/invest/[companySlug]` integration.
No API contract, custody, consent, authorization or execution gate was changed.

## Interaction extensions

- Company investment makes Company and Instrument distinct before amount entry; instrument
  rights warnings remain visible while mint detail is progressively disclosed.
- Basket retains exact integer arithmetic, editable suggestions and separate transaction
  approvals; shows allocated/remainder amounts, validates selection/budget, recovers from
  malformed optional session drafts and prevents duplicate review clicks.
- Review has explicit quoting, expiry and signature states. Expiry disables approval;
  order-read failures have recovery rather than endless loading. Token display uses known
  instrument decimals; missing unit metadata is explicitly shown as raw units, never guessed.
- Status headlines cover every persisted aggregate state. Unknown outcomes never offer a
  replacement transaction. Stopping unsigned remainder does not imply rollback.
- Portfolio distinguishes cash, acquisition cost and missing current valuation. Failed reads
  do not present fabricated zero balances. Holdings expose exact accounting progressively.
- Sell all preserves the authoritative `sellAll` server flag. Reserved amounts are identified.
- Send respects tracked/external URL scope; any asset/amount/recipient change invalidates
  the local preview. The action proceeds to canonical order review, not direct approval.
- Activity has URL-backed type/status filters, a shared responsive table and caught export
  errors. Record raw accounting is available in an explicit disclosure.

## Verification

Scoped ESLint passed. Initial full TypeScript check passed; final integration check belongs
to root. Six isolated DOM tests verify truthful order status, unknown-outcome retry safety,
read failure recovery, expired-quote approval removal, correct token decimals and exact
sell-all semantics. No paid provider, real wallet approval or live transaction was invoked.

Root owns production build, browser fixtures, responsive screenshots and final combined QA.
Current API does not provide Portfolio marks/P&L or per-record unit decimals; no values were
fabricated to fill those gaps. Activity amount stays explicitly raw until the API supplies
historical unit metadata; USDC money/fees remain human-readable in the record.
