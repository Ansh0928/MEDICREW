import { LoginForm } from "@/components/portal/LoginForm";

export default function PatientLoginPage() {
  return <LoginForm defaultRole="patient" showRoleToggle={false} />;
}
