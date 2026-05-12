import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav";
import { useFiscalDeadlineCheck } from "@/hooks/useFiscalDeadlineCheck";

export function AppLayout() {
  useFiscalDeadlineCheck();
  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-lg pb-24">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}
