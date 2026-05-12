import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useOrg } from '../../context/OrgContext';
import api from '../../api';
import AnnouncementsTile from './tiles/AnnouncementsTile';
import EventsTile from './tiles/EventsTile';
import ForumTile from './tiles/ForumTile';
import ChatTile from './tiles/ChatTile';
import ShopTile from './tiles/ShopTile';

const TILE_MAP = {
  announcements: AnnouncementsTile,
  events: EventsTile,
  forum: ForumTile,
  chat: ChatTile,
  shop: ShopTile,
};

export default function DashboardHome() {
  const { orgId } = useParams();
  const { org } = useOrg();
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    api.get(`/orgs/${orgId}/dashboard/summary`).then(res => setSummary(res.data));
  }, [orgId]);

  const enabledFeatures = org?.enabledFeatures ?? [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Welcome to {org?.name}
      </h1>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {enabledFeatures.map(key => {
          const Tile = TILE_MAP[key];
          if (!Tile) return null;
          return <Tile key={key} data={summary?.[key]} orgId={orgId} />;
        })}
      </div>
    </div>
  );
}
