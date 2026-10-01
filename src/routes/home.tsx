import { createFileRoute } from "@tanstack/react-router";
import { ConfessionsPage } from "@/routes/confessions";

export const Route = createFileRoute("/home")({
  head: () => ({ meta: [{ title: "Circle Panda" }] }),
  component: ConfessionsPage,
});
