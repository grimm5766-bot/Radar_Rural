"use client";

import Script from "next/script";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

type GoogleCredentialResponse = {
  credential: string;
};

type GoogleIdentityWindow = Window & {
  google?: {
    accounts: {
      id: {
        initialize: (options: {
          client_id: string;
          callback: (response: GoogleCredentialResponse) => void;
        }) => void;
        renderButton: (
          element: HTMLElement,
          options: Record<string, string | number>,
        ) => void;
      };
    };
  };
};

export function GoogleLoginButton() {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  if (!clientId) {
    return (
      <p className="google-setup-note">
        Login Google preparado. Configure o Client ID para ativá-lo.
      </p>
    );
  }

  function initialize() {
    const google = (window as unknown as GoogleIdentityWindow).google;
    if (!google || !containerRef.current) return;
    google.accounts.id.initialize({
      client_id: clientId!,
      callback: handleCredential,
    });
    containerRef.current.replaceChildren();
    google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "rectangular",
      width: 390,
      locale: "pt-BR",
    });
  }

  async function handleCredential(response: GoogleCredentialResponse) {
    setError("");
    const result = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await result.json();
    if (!result.ok) {
      setError(data.error ?? "Não foi possível entrar com o Google.");
      return;
    }
    router.push(data.user.perfil === "DESENVOLVEDOR" ? "/desenvolvedor" : "/dashboard");
    router.refresh();
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={initialize}
      />
      <div className="google-login-container" ref={containerRef} />
      {error && <p className="form-message error">{error}</p>}
    </>
  );
}
