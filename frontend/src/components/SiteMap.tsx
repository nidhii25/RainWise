export function SiteMap({
  latitude,
  longitude,
  label,
}: {
  latitude: number;
  longitude: number;
  label: string;
}) {
  const pad = 0.012;
  const bbox = [
    (longitude - pad).toFixed(4),
    (latitude - pad).toFixed(4),
    (longitude + pad).toFixed(4),
    (latitude + pad).toFixed(4),
  ].join("%2C");

  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${latitude}%2C${longitude}`;

  return (
    <div className="stack-sm">
      <iframe
        className="map-frame"
        src={src}
        title={`Map of ${label}`}
        loading="lazy"
        referrerPolicy="no-referrer"
      />
      <div className="between tiny muted">
        <span>
          {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </span>
        <a
          href={`https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=17/${latitude}/${longitude}`}
          target="_blank"
          rel="noreferrer"
        >
          Open in OpenStreetMap
        </a>
      </div>
    </div>
  );
}
