import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";

export default async function Home() {
  const user = await getSessionUser();
  redirect(user ? (user.perfil === "DESENVOLVEDOR" ? "/desenvolvedor" : "/dashboard") : "/login");
}
