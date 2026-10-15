import type { Metadata } from "next";
import { EchoidLanding } from "./EchoidLanding";

export const metadata: Metadata = {
  title: "ECHOID — Your voice ID to the E network",
  description: "Your voice ID to the E network.",
};

export default function PreviewEchoidPage() {
  return (
    <>
      <link rel="preconnect" href="https://d8j0ntlcm91z4.cloudfront.net" />
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <EchoidLanding />
    </>
  );
}
