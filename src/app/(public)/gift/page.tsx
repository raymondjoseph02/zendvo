import { redirect } from "next/navigation";

export default function PublicGiftPage() {
  redirect("/dashboard/gifts");
}
