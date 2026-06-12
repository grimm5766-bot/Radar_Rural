"use client";

import { Leaf, LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { GoogleLoginButton } from "@/components/google-login-button";

export function LoginForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(result.error ?? "Não foi possível entrar.");
      return;
    }
    router.push(result.user.perfil === "DESENVOLVEDOR" ? "/desenvolvedor" : "/dashboard");
    router.refresh();
  }

  return (
    <div className="login-page">
      <section className="login-hero">
        <div className="brand">
          <div className="brand-mark"><Leaf size={24} /></div>
          <div><strong>Switch Rural</strong><span>Gestão da soja</span></div>
        </div>
        <div className="login-copy">
          <p className="eyebrow" style={{ color: "#bde28d" }}>Do campo à decisão</p>
          <h1>Uma safra inteira, sob controle.</h1>
          <p>
            Registre vistorias e ocorrências no campo. Acompanhe produtividade,
            alertas e o ciclo de 120 dias em uma visão clara para toda a fazenda.
          </p>
        </div>
        <div className="login-features">
          <span>Funciona offline</span>
          <span>Alertas críticos</span>
          <span>Previsão de safra</span>
          <span>Dados por talhão</span>
        </div>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <p className="eyebrow">Acesso seguro</p>
          <h2>Entre no sistema</h2>
          <p>Use seu perfil de produtor ou agrônomo.</p>
          <form className="login-form" onSubmit={submit}>
            <div className="field">
              <label htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" defaultValue="produtor@switchrural.com" required />
            </div>
            <div className="field">
              <label htmlFor="password">Senha</label>
              <input id="password" name="password" type="password" defaultValue="123456" required />
            </div>
            <button className="button button-primary" type="submit" disabled={loading}>
              <LogIn size={18} /> {loading ? "Entrando..." : "Entrar"}
            </button>
            {error && <p className="form-message error">{error}</p>}
          </form>
          <div className="login-divider"><span>ou</span></div>
          <GoogleLoginButton />
          <div className="demo-credentials">
            <strong>Acessos de demonstração</strong><br />
            Produtor: produtor@switchrural.com<br />
            Agrônomo: agronomo@switchrural.com<br />
            Desenvolvedor: dev@switchrural.com<br />
            Senha para todos: 123456
          </div>
        </div>
      </section>
    </div>
  );
}
