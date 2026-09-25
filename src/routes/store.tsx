import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { CoinStoreView } from "@/components/store/CoinStoreView";

function StorePage() {
  return (
    <AppShell
      title="Coin Store & VIP"
      subtitle="Acquire Panda Coins or activate your VIP Campus Pass."
    >
      <CoinStoreView />
    </AppShell>
  );
}

export const Route = createFileRoute("/store")({
  head: () => ({
    meta: [
      { title: "Coin Store & VIP Pass — Circle Panda" },
      {
        name: "description",
        content:
          "Purchase Panda Coins (BC) and unlock VIP Pass subscriptions for Circle Panda. Pay once packages or recurring passes with Paystack & Android WebView Bridge.",
      },
      { property: "og:title", content: "Coin Store & VIP Pass — Circle Panda" },
      {
        property: "og:description",
        content:
          "Starter Pack, Panda Popular Pack, Speed-Dating Boost, and Ultimate VIP Vault. Unlock VIP privileges today.",
      },
    ],
  }),
  component: StorePage,
});
