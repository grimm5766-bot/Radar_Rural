"use client";

import {
  Camera,
  Crosshair,
  MapPin,
  RefreshCw,
} from "lucide-react";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui";
import { FormActions, useApiForm } from "@/components/use-api-form";
import { apiRequest } from "@/lib/offline";

type Option = { id: string; label: string };

function FormCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <div className="card-header"><h2>{title}</h2></div>
      <div className="card-body">
        <p style={{ color: "var(--muted)", fontSize: ".86rem", lineHeight: 1.55 }}>{description}</p>
        {children}
      </div>
    </Card>
  );
}

export function UserForm({ tenants }: { tenants: Option[] }) {
  const form = useApiForm({ endpoint: "/api/users" });
  return (
    <FormCard title="Novo usuário" description="Crie um acesso simples para produtor ou agrônomo.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Field name="nome" label="Nome completo" full required />
        <Field name="email" label="E-mail" type="email" full required />
        <Field name="senha" label="Senha" type="password" minLength={6} required />
        <Select name="perfil" label="Perfil" options={[
          { id: "PRODUTOR", label: "Produtor" },
          { id: "AGRONOMO", label: "Agrônomo" },
          { id: "DESENVOLVEDOR", label: "Desenvolvedor global" },
        ]} />
        <Select name="tenantId" label="Tenant" options={tenants} placeholder="Sem tenant (apenas desenvolvedor)" full />
        <FormActions {...form} label="Criar usuário" />
      </form>
    </FormCard>
  );
}

export function TenantForm() {
  const form = useApiForm({ endpoint: "/api/tenants" });
  return (
    <FormCard title="Novo tenant" description="Cada organização recebe um espaço isolado para usuários, fazendas e dados operacionais.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Field name="nome" label="Nome da organização" full required />
        <Field name="slug" label="Identificador" placeholder="ex.: cooperativa-verde" full />
        <FormActions {...form} label="Criar tenant" />
      </form>
    </FormCard>
  );
}

export function FarmForm({ agronomists }: { agronomists: Option[] }) {
  const form = useApiForm({
    endpoint: "/api/farms",
    transform: (data) => ({
      ...data,
      agronomistIds: data.agronomistId ? [String(data.agronomistId)] : [],
    }),
  });
  return (
    <FormCard title="Nova fazenda" description="Cadastre a propriedade e vincule um agrônomo responsável.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Field name="nome" label="Nome da fazenda" full required />
        <Field name="areaTotalHectares" label="Área total (ha)" type="number" step="0.01" min="0.01" required />
        <Field name="regiao" label="UF / Região" defaultValue="GO" required />
        <Select name="agronomistId" label="Agrônomo vinculado" options={agronomists} placeholder="Sem vínculo inicial" />
        <FormActions {...form} label="Cadastrar fazenda" />
      </form>
    </FormCard>
  );
}

export function PlotForm({ farms }: { farms: Option[] }) {
  const form = useApiForm({ endpoint: "/api/plots" });
  return (
    <FormCard title="Novo talhão" description="A soma dos talhões não pode ultrapassar a área da fazenda.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Select name="farmId" label="Fazenda" options={farms} full />
        <Field name="nome" label="Nome do talhão" required />
        <Field name="areaHectares" label="Área (ha)" type="number" step="0.01" min="0.01" required />
        <FormActions {...form} label="Criar talhão" />
      </form>
    </FormCard>
  );
}

export function CycleForm({ farms }: { farms: Option[] }) {
  const form = useApiForm({ endpoint: "/api/cycles" });
  return (
    <FormCard title="Novo ciclo" description="O ciclo terá 120 dias. Inícios entre junho e setembro são bloqueados para Goiás.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Select name="farmId" label="Fazenda" options={farms} full />
        <Field name="cultura" label="Cultura" defaultValue="Soja" required />
        <Field name="dataInicio" label="Data de início" type="date" required />
        <Select name="status" label="Status" options={[
          { id: "PLANEJADO", label: "Planejado" },
          { id: "ATIVO", label: "Ativo" },
          { id: "CONCLUIDO", label: "Concluído" },
        ]} />
        <FormActions {...form} label="Criar ciclo" />
      </form>
    </FormCard>
  );
}

export function InspectionForm({
  plots,
  cycles,
}: {
  plots: Option[];
  cycles: Option[];
}) {
  const form = useApiForm({ endpoint: "/api/inspections", offline: true });
  return (
    <FormCard title="Nova vistoria" description="Pode ser preenchida sem internet. O registro fica na fila local até a conexão voltar.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Select name="fieldPlotId" label="Talhão" options={plots} full />
        <Select name="cropCycleId" label="Ciclo" options={cycles} placeholder="Sem ciclo relacionado" full />
        <Field name="data" label="Data da vistoria" type="date" defaultValue={today()} required />
        <Field name="diaCiclo" label="Dia do ciclo" type="number" min="1" max="120" required />
        <Field name="faseFenologica" label="Fase fenológica" placeholder="Ex.: R2 - Floração plena" full required />
        <Field name="umidadeSolo" label="Umidade do solo (%)" type="number" min="0" max="100" step="0.1" required />
        <Field name="alturaPlanta" label="Altura média (cm)" type="number" min="0" step="0.1" required />
        <TextArea name="pragas" label="Pragas encontradas" required />
        <TextArea name="doencas" label="Doenças encontradas" required />
        <TextArea name="daninhas" label="Plantas daninhas" required />
        <TextArea name="observacoes" label="Observações gerais" required />
        <FormActions {...form} label="Registrar vistoria" />
      </form>
    </FormCard>
  );
}

export function SamplingForm({ inspections }: { inspections: Option[] }) {
  const form = useApiForm({ endpoint: "/api/samplings" });
  return (
    <FormCard title="Nova amostragem" description="A estimativa usa espaçamento padrão de 0,50 m e converte 60 kg em uma saca.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Select name="inspectionId" label="Vistoria sem amostragem" options={inspections} full />
        <Field name="plantasPorMetro" label="Plantas por metro" type="number" min="0.1" step="0.1" required />
        <Field name="vagensPorPlanta" label="Vagens por planta" type="number" min="0.1" step="0.1" required />
        <Field name="graosPorVagem" label="Grãos por vagem" type="number" min="0.1" step="0.1" required />
        <Field name="pesoMilGraos" label="PMG (gramas)" type="number" min="0.1" step="0.1" required />
        <FormActions {...form} label="Calcular e salvar" />
      </form>
    </FormCard>
  );
}

export function OccurrenceForm({
  plots,
  inspections,
}: {
  plots: Option[];
  inspections: Option[];
}) {
  const form = useApiForm({ endpoint: "/api/occurrences", offline: true });
  return (
    <FormCard title="Nova ocorrência" description="Ocorrências de gravidade alta geram automaticamente uma notificação para o produtor.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Select name="fieldPlotId" label="Talhão" options={plots} full />
        <Select name="inspectionId" label="Vistoria relacionada" options={inspections} placeholder="Registro avulso" full />
        <Select name="tipo" label="Tipo" options={[
          { id: "PRAGA", label: "Praga" },
          { id: "DOENCA", label: "Doença" },
          { id: "PLANTA_DANINHA", label: "Planta daninha" },
        ]} />
        <Select name="gravidade" label="Gravidade" options={[
          { id: "BAIXA", label: "Baixa" },
          { id: "MEDIA", label: "Média" },
          { id: "ALTA", label: "Alta" },
        ]} />
        <Field name="nome" label="Nome da ocorrência" placeholder="Ex.: Ferrugem Asiática" full required />
        <Field name="dataOcorrencia" label="Data" type="date" defaultValue={today()} required />
        <Field name="impactoEstimado" label="Impacto estimado (%)" type="number" min="0" max="100" step="0.1" defaultValue="0" required />
        <TextArea name="descricao" label="Descrição" full required />
        <FormActions {...form} label="Registrar ocorrência" />
      </form>
    </FormCard>
  );
}

export function ManagementForm({ occurrences }: { occurrences: Option[] }) {
  const form = useApiForm({ endpoint: "/api/management" });
  return (
    <FormCard title="Abrir chamado" description="Ao fechar o chamado, o tempo de resposta é calculado automaticamente.">
      <form className="form-grid" onSubmit={form.handleSubmit}>
        <Select name="occurrenceId" label="Ocorrência" options={occurrences} full />
        <Select name="tipoManejo" label="Tipo de manejo" options={[
          { id: "Aplicação de fungicida", label: "Aplicação de fungicida" },
          { id: "Aplicação de herbicida", label: "Aplicação de herbicida" },
          { id: "Controle biológico", label: "Controle biológico" },
          { id: "Outra ação de manejo", label: "Outra ação de manejo" },
        ]} full />
        <Field name="dataAbertura" label="Data de abertura" type="date" defaultValue={today()} required />
        <Field name="dataFechamento" label="Data de fechamento" type="date" />
        <Field name="responsavel" label="Responsável" full required />
        <TextArea name="observacoes" label="Observações" full required />
        <FormActions {...form} label="Abrir chamado" />
      </form>
    </FormCard>
  );
}

export function CloseManagementButton({ id }: { id: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function close() {
    setLoading(true);
    const result = await apiRequest("/api/management", {
      id,
      dataFechamento: today(),
    }, { method: "PATCH" });
    setLoading(false);
    if (result.ok) router.refresh();
  }
  return (
    <button className="button button-secondary" type="button" disabled={loading} onClick={close}>
      {loading ? <RefreshCw size={14} /> : null}
      {loading ? "Fechando" : "Fechar hoje"}
    </button>
  );
}

export function PhotoForm({
  inspections,
  occurrences,
}: {
  inspections: Option[];
  occurrences: Option[];
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [location, setLocation] = useState({ latitude: "", longitude: "" });

  function captureLocation() {
    if (!navigator.geolocation) {
      setMessage({ type: "error", text: "Geolocalização não disponível neste navegador." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setLocation({
        latitude: coords.latitude.toFixed(7),
        longitude: coords.longitude.toFixed(7),
      }),
      () => setMessage({ type: "error", text: "Não foi possível obter a localização. Informe as coordenadas manualmente." }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setMessage({ type: "", text: "" });
    const form = event.currentTarget;
    const data = new FormData(form);
    const file = data.get("arquivo");
    if (!(file instanceof File) || file.size === 0) {
      setLoading(false);
      setMessage({ type: "error", text: "Selecione uma imagem." });
      return;
    }
    if (file.size > 1_800_000) {
      setLoading(false);
      setMessage({ type: "error", text: "Use uma imagem menor que 1,8 MB nesta versão." });
      return;
    }
    const urlImagem = await fileToDataUrl(file);
    const result = await apiRequest("/api/photos", {
      inspectionId: data.get("inspectionId"),
      occurrenceId: data.get("occurrenceId"),
      latitude: data.get("latitude"),
      longitude: data.get("longitude"),
      data: data.get("data"),
      urlImagem,
    }, { offline: true });
    setLoading(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Não foi possível salvar." });
      return;
    }
    setMessage({
      type: "success",
      text: result.queued ? "Foto salva na fila offline." : "Foto salva com sucesso.",
    });
    form.reset();
    if (!result.queued) router.refresh();
  }

  return (
    <FormCard title="Nova foto geolocalizada" description="Nesta versão, a imagem é armazenada localmente no banco como uma simulação de upload.">
      <form className="form-grid" onSubmit={submit}>
        <div className="field full">
          <label htmlFor="arquivo">Arquivo da imagem</label>
          <input id="arquivo" name="arquivo" type="file" accept="image/*" required />
        </div>
        <Select name="inspectionId" label="Vistoria relacionada" options={inspections} placeholder="Nenhuma" full />
        <Select name="occurrenceId" label="Ocorrência relacionada" options={occurrences} placeholder="Nenhuma" full />
        <Field name="latitude" label="Latitude" type="number" step="any" value={location.latitude} onChange={(value) => setLocation({ ...location, latitude: value })} required />
        <Field name="longitude" label="Longitude" type="number" step="any" value={location.longitude} onChange={(value) => setLocation({ ...location, longitude: value })} required />
        <div className="form-actions">
          <button className="button button-secondary" type="button" onClick={captureLocation}>
            <Crosshair size={16} /> Capturar localização
          </button>
        </div>
        <Field name="data" label="Data da foto" type="date" defaultValue={today()} full required />
        <div className="form-actions">
          <button className="button button-primary" type="submit" disabled={loading}>
            <Camera size={16} /> {loading ? "Salvando..." : "Salvar foto"}
          </button>
          {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
        </div>
      </form>
    </FormCard>
  );
}

export function MarkNotificationButton({ id }: { id?: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  async function mark() {
    setLoading(true);
    await apiRequest("/api/notifications", id ? { id } : {}, { method: "PATCH" });
    setLoading(false);
    router.refresh();
  }
  return (
    <button className="button button-secondary" type="button" onClick={mark} disabled={loading}>
      {loading ? "Atualizando..." : id ? "Marcar como lida" : "Marcar todas como lidas"}
    </button>
  );
}

function Field({
  name,
  label,
  full = false,
  onChange,
  ...props
}: {
  name: string;
  label: string;
  full?: boolean;
  onChange?: (value: string) => void;
  [key: string]: unknown;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} {...props} onChange={onChange ? (event) => onChange(event.target.value) : undefined} />
    </div>
  );
}

function Select({
  name,
  label,
  options,
  placeholder,
  full = false,
}: {
  name: string;
  label: string;
  options: Option[];
  placeholder?: string;
  full?: boolean;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <select id={name} name={name} required={!placeholder}>
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
      </select>
    </div>
  );
}

function TextArea({
  name,
  label,
  full = false,
  ...props
}: {
  name: string;
  label: string;
  full?: boolean;
  [key: string]: unknown;
}) {
  return (
    <div className={`field ${full ? "full" : ""}`}>
      <label htmlFor={name}>{label}</label>
      <textarea id={name} name={name} {...props} />
    </div>
  );
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function PhotoLocation({ latitude, longitude }: { latitude: number; longitude: number }) {
  return <span><MapPin size={13} /> {latitude.toFixed(5)}, {longitude.toFixed(5)}</span>;
}
