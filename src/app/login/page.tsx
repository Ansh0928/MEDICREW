import { LoginForm } from "@/components/portal/LoginForm";

export default function LoginPage() {
  return <LoginForm defaultRole="patient" showRoleToggle={true} />;
}
