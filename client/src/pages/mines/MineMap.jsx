import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { scoreToColor } from '../../utils/helpers';
import clsx from 'clsx';

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const createCustomIcon = (status, compliance_score) => {
  const color = status === 'suspended' ? '#ef4444' : status === 'under_inspection' ? '#f59e0b' : parseFloat(compliance_score) < 60 ? '#f59e0b' : '#22c55e';
  return L.divIcon({
    className: '',
    html: `<div style="background:${color};width:18px;height:18px;border-radius:50%;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
};

export default function MineMap({ mines = [] }) {
  const validMines = mines.filter(m => m.latitude && m.longitude);
  const center = validMines.length ? [validMines[0].latitude, validMines[0].longitude] : [22.5, 82.5];

  return (
    <MapContainer center={center} zoom={5} style={{ height: '100%', width: '100%' }}>
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      {validMines.map(mine => (
        <Marker
          key={mine.id}
          position={[mine.latitude, mine.longitude]}
          icon={createCustomIcon(mine.status, mine.compliance_score)}
        >
          <Popup maxWidth={280}>
            <div className="p-1">
              <div className="font-bold text-sm mb-1">{mine.name}</div>
              <div className="text-xs text-gray-500 mb-2">{mine.mine_id} · {mine.type}</div>
              <div className="grid grid-cols-2 gap-1 text-xs mb-2">
                <div><span className="text-gray-400">State:</span> {mine.state}</div>
                <div><span className="text-gray-400">Workers:</span> {mine.workers_count}</div>
                <div><span className="text-gray-400">Compliance:</span>
                  <span className={clsx('font-bold ml-1', parseFloat(mine.compliance_score) >= 80 ? 'text-green-600' : parseFloat(mine.compliance_score) >= 60 ? 'text-yellow-600' : 'text-red-600')}>
                    {parseFloat(mine.compliance_score).toFixed(1)}%
                  </span>
                </div>
                <div><span className="text-gray-400">Risk:</span>
                  <span className={clsx('font-bold ml-1', parseFloat(mine.risk_score) >= 70 ? 'text-red-600' : 'text-yellow-600')}>
                    {parseFloat(mine.risk_score).toFixed(1)}%
                  </span>
                </div>
              </div>
              <div className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${mine.status === 'active' ? 'bg-green-100 text-green-700' : mine.status === 'suspended' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {mine.status.replace('_', ' ').toUpperCase()}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
      {/* Legend */}
    </MapContainer>
  );
}
