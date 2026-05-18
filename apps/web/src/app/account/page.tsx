import { Suspense } from "react";

import { AccountDashboard } from "../../features/account/AccountDashboard";

export default function AccountPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-[#f6f8f7]">
          <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center justify-center px-5">
            <p className="rounded-md border border-black/10 bg-white px-4 py-3 text-sm text-black/70 shadow-soft">
              Account wird geladen...
            </p>
          </div>
        </main>
      }
    >
      <AccountDashboard />
    </Suspense>
  );
}
