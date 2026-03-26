import dynamic from "next/dynamic";

const SignInPage = dynamic(
  () => import("@/components/ui/sign-in-flow-1").then((m) => m.SignInPage),
  { ssr: false }
);

export default function DoctorLogin() {
  return <SignInPage role="doctor" />;
}
