import { createFileRoute } from "@tanstack/react-router";
import { FeedPage } from "./index";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Circle Panda — Campus Feed" },
      {
        name: "description",
        content:
          "Anonymous posts, ephemeral group chats, dating, and events — powered by Panda Coins.",
      },
      { property: "og:title", content: "Circle Panda — Campus Feed" },
      {
        property: "og:description",
        content:
          "Anonymous posts, ephemeral group chats, dating, and events — powered by Panda Coins.",
      },
    ],
  }),
  component: FeedPage,
});
