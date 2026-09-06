// components/Map.js
import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";

const mapContainerStyle = {
  width: "100%",
  height: "400px",
  borderRadius: "16px",
};

const defaultCenter = { lat: 28.6139, lng: 77.2090 }; // Delhi

export default function Map({ locations = [], center, zoom = 12 }) {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
  });

  if (loadError) {
    return <div className="text-red-500 p-4">Error loading maps. Please check API key.</div>;
  }
  if (!isLoaded) {
    return <div className="text-gray-400 p-4">Loading map...</div>;
  }

  const mapCenter = center || (locations.length > 0 ? locations[0] : defaultCenter);

  return (
    <GoogleMap mapContainerStyle={mapContainerStyle} center={mapCenter} zoom={zoom}>
      {locations.map((loc, idx) => (
        <Marker
          key={idx}
          position={{ lat: loc.latitude, lng: loc.longitude }}
          label={loc.label || `Bus ${idx + 1}`}
        />
      ))}
    </GoogleMap>
  );
}