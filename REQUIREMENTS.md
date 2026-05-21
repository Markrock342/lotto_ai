# Requirements and Fix Summary

## Bug report
- Dashboard was showing repeated `GET /api/dashboard net::ERR_ABORTED 500` errors.
- The UI also showed stale preload warnings for `dashboard` resources, but the blocking issue was the 500 response from the dashboard API.

## Root cause
- `src/app/api/dashboard/route.ts` could throw during data loading and had no defensive `try/catch`.
- When the API failed, the dashboard page only retried silently and did not surface a readable error state.
- **Follow-up (May 2026):** 500 จาก Prisma client ค้างใน dev server หลัง migrate เพิ่ม `Bet.status` — ต้อง `npx prisma generate` แล้ว **restart** `npm run dev`.

## Fix implemented
- Added error handling to `GET /api/dashboard` so failures return a clean JSON 500 response instead of crashing the request.
- Updated `src/app/(app)/dashboard/page.tsx` to:
  - handle failed fetches safely,
  - show a readable error message,
  - keep the existing loading behavior for successful cases.

## Notes
- I did not change the preload warning directly because it is a browser optimization warning, not the request failure itself.
- If the warning remains after the API is stable, it can be reviewed separately.