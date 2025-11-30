// src/components/FloorMap.tsx
import { useGame } from '../contexts/GameContext';
import { FloorRoom } from '../types/game';
import { Swords, Crown, Activity, AlertTriangle, ArrowUpCircle } from 'lucide-react';

function roomLabel(room: FloorRoom) {
  switch (room.type) {
    case 'enemy': return 'Enemy';
    case 'rareEnemy': return 'Rare';
    case 'miniBoss': return 'Mini';
    case 'mimic': return 'Mimic';
    case 'ladder': return 'Ladder';
    case 'empty': return 'Empty';
    default: return room.type;
  }
}

function roomIcon(room: FloorRoom) {
  switch (room.type) {
    case 'miniBoss': return <Crown className="w-4 h-4" />;
    case 'rareEnemy': return <Activity className="w-4 h-4" />;
    case 'mimic': return <AlertTriangle className="w-4 h-4" />;
    case 'ladder': return <ArrowUpCircle className="w-4 h-4" />;
    default: return <Swords className="w-4 h-4" />;
  }
}

export function FloorMap() {
  const { floorMap, currentRoomId, exploreRoom, nextFloor } = useGame();
  if (!floorMap) return null;

  const ladderRoom = floorMap.rooms.find(r => r.id === floorMap.ladderRoomId);
  const canAscend = ladderRoom?.explored;

  return (
    <div className="bg-gray-900 border-2 border-yellow-600 rounded p-3 mt-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-yellow-500">Floor {floorMap.floor} Map</h3>
        {canAscend && (
          <button
            onClick={() => nextFloor()}
            className="px-2 py-1 bg-gradient-to-r from-yellow-600 to-amber-600 hover:from-yellow-500 hover:to-amber-500 text-gray-900 font-semibold text-xs rounded"
          >
            Ascend Ladder
          </button>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {floorMap.rooms.map(room => {
          const isCurrent = room.id === currentRoomId;
          const explored = room.explored;
          const cleared = room.cleared;
          return (
            <button
              key={room.id}
              onClick={() => exploreRoom(room.id)}
              className={`flex flex-col items-center justify-center border rounded p-2 text-[10px] h-20 gap-1 transition-colors ${
                isCurrent ? 'border-yellow-500' : 'border-gray-700'
              } ${explored ? 'bg-gray-800' : 'bg-gray-900'} ${cleared ? 'opacity-70' : ''}`}
            >
              <div className={`${cleared ? 'text-gray-400' : 'text-gray-300'}`}>{roomIcon(room)}</div>
              <div className="uppercase tracking-wide text-gray-400">{roomLabel(room)}</div>
              {cleared && <div className="text-[9px] text-green-400">Cleared</div>}
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-gray-400">
        Explore rooms to find the ladder. Combat rooms must be cleared before moving on.
      </div>
    </div>
  );
}
