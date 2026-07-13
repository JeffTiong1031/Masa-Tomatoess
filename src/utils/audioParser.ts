export type AudioPlatform = 'spotify' | 'youtube' | null;

export interface ParsedAudio {
  platform: AudioPlatform;
  id: string;
  type?: 'track' | 'album' | 'playlist' | 'episode' | 'show'; // For Spotify
}

export function parseAudioUrl(url: string): ParsedAudio {
  if (!url || typeof url !== 'string') {
    return { platform: null, id: '' };
  }

  // Parse YouTube
  // Matches: youtube.com/watch?v=ID, youtu.be/ID, youtube.com/embed/ID
  const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const ytMatch = url.match(ytRegex);
  if (ytMatch && ytMatch[1]) {
    return { platform: 'youtube', id: ytMatch[1] };
  }

  // Parse Spotify
  // Matches: open.spotify.com/track/ID, open.spotify.com/playlist/ID, etc.
  const spotifyRegex = /open\.spotify\.com\/(track|album|playlist|episode|show)\/([a-zA-Z0-9]+)/i;
  const spotifyMatch = url.match(spotifyRegex);
  if (spotifyMatch && spotifyMatch[1] && spotifyMatch[2]) {
    return { 
      platform: 'spotify', 
      type: spotifyMatch[1] as ParsedAudio['type'], 
      id: spotifyMatch[2] 
    };
  }

  return { platform: null, id: '' };
}
