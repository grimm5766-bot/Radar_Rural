"use client";

import { Crosshair, MapPinned, RotateCcw, Save, Undo2 } from "lucide-react";
import Script from "next/script";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiRequest } from "@/lib/offline";

export type MapPoint = { lat: number; lng: number };

export function FarmMapEditor({
  farmId,
  initialCenter,
  initialBoundary,
}: {
  farmId: string;
  initialCenter: MapPoint;
  initialBoundary: MapPoint[];
}) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const mapElement = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const polygonInstance = useRef<google.maps.Polygon | null>(null);
  const [points, setPoints] = useState<MapPoint[]>(initialBoundary);
  const pointsRef = useRef(points);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  function updatePoints(next: MapPoint[]) {
    pointsRef.current = next;
    setPoints(next);
    polygonInstance.current?.setPath(next);
  }

  function initializeMap() {
    if (!mapElement.current || !window.google?.maps || mapInstance.current) return;
    const map = new google.maps.Map(mapElement.current, {
      center: initialCenter,
      zoom: 15,
      mapTypeId: "satellite",
      streetViewControl: false,
      fullscreenControl: true,
      mapTypeControl: true,
    });
    const polygon = new google.maps.Polygon({
      paths: pointsRef.current,
      strokeColor: "#c8f28f",
      strokeOpacity: 1,
      strokeWeight: 3,
      fillColor: "#58a65f",
      fillOpacity: 0.28,
      clickable: false,
      map,
    });
    map.addListener("click", (event: google.maps.MapMouseEvent) => {
      if (!event.latLng) return;
      updatePoints([
        ...pointsRef.current,
        { lat: event.latLng.lat(), lng: event.latLng.lng() },
      ]);
    });
    mapInstance.current = map;
    polygonInstance.current = polygon;

    if (pointsRef.current.length >= 3) {
      const bounds = new google.maps.LatLngBounds();
      pointsRef.current.forEach((point) => bounds.extend(point));
      map.fitBounds(bounds, 44);
    }
  }

  function useCurrentLocation() {
    navigator.geolocation?.getCurrentPosition(
      ({ coords }) => {
        mapInstance.current?.setCenter({
          lat: coords.latitude,
          lng: coords.longitude,
        });
        mapInstance.current?.setZoom(17);
      },
      () => setMessage({ type: "error", text: "Não foi possível obter sua localização." }),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function save() {
    if (points.length < 3) {
      setMessage({ type: "error", text: "Marque pelo menos três pontos no mapa." });
      return;
    }
    setSaving(true);
    const result = await apiRequest(
      "/api/farms",
      { id: farmId, boundary: points },
      { method: "PATCH" },
    );
    setSaving(false);
    if (!result.ok) {
      setMessage({ type: "error", text: result.error ?? "Não foi possível salvar." });
      return;
    }
    setMessage({ type: "success", text: "Limites da fazenda salvos com sucesso." });
    router.refresh();
  }

  if (!apiKey) {
    return (
      <div className="map-setup-state">
        <MapPinned size={34} />
        <h2>Google Maps preparado</h2>
        <p>
          Configure <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> para ativar o
          mapa satélite e a demarcação por cliques.
        </p>
      </div>
    );
  }

  return (
    <>
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=quarterly`}
        strategy="afterInteractive"
        onReady={initializeMap}
      />
      <div className="map-editor-toolbar">
        <button className="button button-secondary" type="button" onClick={useCurrentLocation}>
          <Crosshair size={16} /> Minha localização
        </button>
        <button className="button button-secondary" type="button" disabled={!points.length} onClick={() => updatePoints(points.slice(0, -1))}>
          <Undo2 size={16} /> Desfazer ponto
        </button>
        <button className="button button-secondary" type="button" disabled={!points.length} onClick={() => updatePoints([])}>
          <RotateCcw size={16} /> Limpar
        </button>
        <button className="button button-primary" type="button" disabled={saving || points.length < 3} onClick={save}>
          <Save size={16} /> {saving ? "Salvando..." : "Salvar demarcação"}
        </button>
      </div>
      <div className="map-editor" ref={mapElement} />
      <div className="map-editor-footer">
        <span>{points.length} ponto(s) marcados. Clique no mapa para contornar a propriedade.</span>
        {message.text && <p className={`form-message ${message.type}`}>{message.text}</p>}
      </div>
    </>
  );
}
