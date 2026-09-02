import * as React from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sri Lakshmi Dairy — Milk Distribution Book" },
      {
        name: "description",
        content:
          "Private milk distribution book for Sri Lakshmi Dairy staff: customers, deliveries, payments, stock and daily ledger in rupees.",
      },
      { property: "og:title", content: "Sri Lakshmi Dairy — Milk Distribution Book" },
      {
        property: "og:description",
        content: "Staff-only milk distribution book: deliveries, payments, stock and ledger.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const navigate = useNavigate();

  React.useEffect(() => {
    void supabase.auth.getUser().then(({ data }) => {
      if (data.user) void navigate({ to: "/dashboard", replace: true });
    });
  }, [navigate]);

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-3xl bg-primary text-3xl text-primary-foreground">
          🥛
        </span>
        <h1 className="font-display text-3xl font-bold">Sri Lakshmi Dairy</h1>
        <p className="mt-2 text-muted-foreground">
          Daily milk book — customers, deliveries, payments and stock in one place.
        </p>
        <Button className="mt-6 w-full" size="lg" onClick={() => navigate({ to: "/auth" })}>
          Staff Sign In
        </Button>
        <p className="mt-3 text-xs text-muted-foreground">
          Only signed-in staff can see business data.
        </p>
      </div>
    </div>
  );
}
