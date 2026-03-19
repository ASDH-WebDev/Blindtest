import AuthForm from "../../components/AuthForm";

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-50">
      <AuthForm mode="register" />
    </div>
  );
}

