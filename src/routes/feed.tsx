import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "./index";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Circle Panda — Secret Confessions 🤫 & Panda Coins" },
      {
        name: "description",
        content:
          "A safe space to post your secrets and most troubled thoughts, without getting JUDGED 🤷‍♂️. Share your confessions anonymously.",
      },
      { property: "og:title", content: "Circle Panda — Secret Confessions 🤫" },
      {
        property: "og:description",
        content:
          "Share your thoughts, secrets, stories, worries or random confessions anonymously. No judgment. Just let it out. ❤️",
      },
    ],
  }),
  component: FeedPage,
});
