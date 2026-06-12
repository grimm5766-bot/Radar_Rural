import { Camera, MapPin } from "lucide-react";
import { UserRole as PrismaUserRole } from "@/generated/prisma/client";
import Image from "next/image";
import { redirect } from "next/navigation";
import { PhotoForm } from "@/components/entity-forms";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { accessibleFarmWhere } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function PhotosPage() {
  const user = await requireUser();
  if (user.perfil !== PrismaUserRole.AGRONOMO) redirect("/dashboard");
  const inspections = await prisma.inspection.findMany({
    where: { fieldPlot: { farm: accessibleFarmWhere(user) } },
    include: { fieldPlot: true },
    orderBy: { data: "desc" },
  });
  const occurrences = await prisma.occurrence.findMany({
    where: { fieldPlot: { farm: accessibleFarmWhere(user) } },
    include: { fieldPlot: true },
    orderBy: { dataOcorrencia: "desc" },
  });
  const photos = await prisma.geoPhoto.findMany({
    where: {
      OR: [
        { inspection: { fieldPlot: { farm: accessibleFarmWhere(user) } } },
        { occurrence: { fieldPlot: { farm: accessibleFarmWhere(user) } } },
      ],
    },
    include: {
      inspection: { include: { fieldPlot: true } },
      occurrence: { include: { fieldPlot: true } },
    },
    orderBy: { data: "desc" },
  });
  return (
    <>
      <PageHeader eyebrow="Evidência de campo" title="Fotos geolocalizadas" description="Capture a imagem, as coordenadas do navegador e o vínculo com a inspeção ou ocorrência." />
      <div className="content-form-grid">
        <PhotoForm
          inspections={inspections.map((item) => ({ id: item.id, label: `${item.fieldPlot.nome} · ${formatDate(item.data)}` }))}
          occurrences={occurrences.map((item) => ({ id: item.id, label: `${item.fieldPlot.nome} · ${item.nome}` }))}
        />
        <Card>
          <div className="card-header"><h2>Galeria de campo</h2><Badge>{photos.length} foto(s)</Badge></div>
          <div className="card-body">
            {photos.length === 0 ? <EmptyState message="Nenhuma foto registrada." /> : (
              <div className="photo-grid">{photos.map((photo) => (
                <article className="card photo-card" key={photo.id}>
                  {photo.urlImagem.startsWith("data:image") ? <Image src={photo.urlImagem} alt="Registro de campo" width={640} height={400} unoptimized /> : <div className="photo-placeholder"><Camera size={28} /></div>}
                  <div className="photo-card-info">
                    <strong>{photo.inspection?.fieldPlot.nome ?? photo.occurrence?.fieldPlot.nome ?? "Campo"}</strong><br />
                    {photo.occurrence?.nome ?? "Vistoria agronômica"} · {formatDate(photo.data)}<br />
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 7 }}><MapPin size={13} /> {photo.latitude.toFixed(5)}, {photo.longitude.toFixed(5)}</span>
                  </div>
                </article>
              ))}</div>
            )}
          </div>
        </Card>
      </div>
    </>
  );
}
