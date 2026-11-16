import { googleConfig } from "@/lib/google-auth";
import LoginForm from "@/components/LoginForm";

export const dynamic = "force-dynamic";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const { error, next } = await searchParams;
  const returnTo = typeof next === "string" && /^\/events\/[A-Za-z0-9_-]+$/.test(next) ? next : "/events";
  return <LoginForm googleEnabled={!!googleConfig()} googleError={error} returnTo={returnTo} />;
}
