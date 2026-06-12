import { notFound } from "next/navigation";
import { FarmMapEditor, type MapPoint } from "@/components/farm-map-editor";
import { Card, PageHeader } from "@/components/ui";
import { canAccessFarm } from "@/lib/access";
import { requireUser } from "@/lib/auth";
import { formatNumber } from "@/lib/format";
import { prisma } from "@/lib/prisma";

export default async function FarmMapPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  if (!(await canAccessFarm(user, id))) notFound();
  const farm = await prisma.farm.findUnique({ where: { id } });
  if (!farm) notFound();

  let boundary: MapPoint[] = [];
  try {
    boundary = farm.boundaryJson ? JSON.parse(farm.boundaryJson) : [];
  } catch {
    boundary = [];
  }
  const center = {
    lat: farm.centerLatitude ?? -16.6809,
    lng: farm.centerLongitude ?? -49.2533,
  };

  return (
    <>
      <PageHeader
        eyebrow="Georreferenciamento"
        title={`Demarcar ${farm.nome}`}
        description={`Use a visão de satélite e clique ao redor dos limites dos ${formatNumber(farm.areaTotalHectares)} hectares da propriedade.`}
      />
      <Card>
        <div className="card-header"><h2>Limites da propriedade</h2></div>
        <div className="card-body">
          <FarmMapEditor
            farmId={farm.id}
            initialCenter={center}
            initialBoundary={boundary}
          />
        </div>
      </Card>
    </>
  );
}
