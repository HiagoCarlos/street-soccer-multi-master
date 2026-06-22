const GAME_SCRIPTS = [
  '/libraries/jquery.min.js',
  '/libraries/p5.js',
  '/socket.io/socket.io.js',
  '/libraries/joystick.js',
  '/constants.js',
  '/game/field.js',
  '/game/cplayer.js',
  '/game/cball.js',
  '/game/cgame.js',
  '/game/helper.js',
  '/game/index.js'
];

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve(script);
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.body.appendChild(script);
  });
}

export async function loadLegacyGameScripts(backendOrigin, playerName) {
  window.INITIAL_PLAYER_NAME = playerName || '';
  const loaded = [];

  for (const scriptPath of GAME_SCRIPTS) {
    const script = await loadScript(`${backendOrigin}${scriptPath}`);
    loaded.push(script);
  }

  return () => {
    loaded.forEach((script) => script.remove());
  };
}
