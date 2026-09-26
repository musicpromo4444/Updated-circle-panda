import { createFileRoute } from "@tanstack/react-router";
import { ConfessionsPage } from "@/routes/confessions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Circle Panda — Confessions" },
      {
        name: "description",
        content: "Circle Panda anonymous confessions and community feed.",
      },
      { property: "og:title", content: "Circle Panda — Confessions" },
      {
        property: "og:description",
        content: "Share anonymously, react, and explore Circle Panda.",
      },
    ],
  }),
  component: ConfessionsPage,
});
