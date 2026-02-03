import { LoginForm } from "@/components/portal/LoginForm";

export default function DoctorLoginPage() {
  return <LoginForm defaultRole="doctor" showRoleToggle={false} />;
}
