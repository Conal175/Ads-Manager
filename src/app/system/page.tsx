import { redirect } from "next/navigation";

export default function SystemPage() {
  redirect("/assets?tab=system");
}
