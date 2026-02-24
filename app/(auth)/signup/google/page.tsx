import { redirect } from "next/navigation";

export default function GoogleSignupPage() {
  redirect("/auth");
}
