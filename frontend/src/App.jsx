import React, { useEffect, useMemo, useState } from 'react';
import { getBackendOrigin } from './lib/backend';
import { loadLegacyGameScripts } from './lib/loadLegacyGame';

function useArenaState() {
  const backendOrigin = getBackendOrigin();
  const [state, setState] = useState(null);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const response = await fetch(`${backendOrigin}/api/arena`, { cache: 'no-store' });
        const data = await response.json();
        if (active) setState(data);
      } catch {
        if (active) setState(null);
      }
    };

    load();
    const timer = setInterval(load, 2500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [backendOrigin]);

  return state;
}

function formatTime(seconds) {
  const value = Math.max(0, Number(seconds || 0));
  const minutes = String(Math.floor(value / 60)).padStart(1, '0');
  const remainder = String(value % 60).padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function HomePage() {
  const arena = useArenaState();
  const backendOrigin = getBackendOrigin();
  const queue = arena?.queue || [];
  const active = arena?.active || [];
  const status = arena?.status || 'WAITING';
  const score = `${arena?.scoreA ?? 0} x ${arena?.scoreB ?? 0}`;

  const highlights = useMemo(() => [
    { label: 'Status da arena', value: status },
    { label: 'Fila', value: `${queue.length} treinadores` },
    { label: 'Ativos', value: `${active.length} em campo` },
    { label: 'Tempo', value: formatTime(arena?.timeLeft ?? 180) }
  ], [arena, active.length, queue.length, status]);

  return (
    <div className="site-shell">
      <div className="hero-stripes" />
      <main className="home-layout">
        <section className="hero-card">
          <div className="hero-topline">
            <span className="hero-badge">Brasil Profissional</span>
            <a className="hero-link" href="/admin">Painel Admin</a>
          </div>

          <div className="hero-brand">
            <img className="hero-logo" src={`${backendOrigin}/assets/Logo_Game.png`} alt="Copa dos Treinadores" />
            <div>
              <p className="hero-kicker">Campeonato oficial multiplayer</p>
              <h1>
                <span>COPA DOS</span>
                <strong>TREINADORES</strong>
                <em>2026</em>
              </h1>
            </div>
          </div>

          <p className="hero-copy">
            Futebol em tempo real com leitura de transmissão, contraste alto e atmosfera de decisão.
          </p>

          <div className="hero-actions">
            <a className="button button-primary" href="/play">Entrar na Arena</a>
            <a className="button button-secondary" href="/admin">Abrir Painel</a>
          </div>
        </section>

        <aside className="sidebar-stack">
          <section className="panel panel-highlight">
            <div className="panel-head">
              <h2>Resumo da rodada</h2>
              <span>{score}</span>
            </div>
            <div className="stats-grid">
              {highlights.map((item) => (
                <article className="stat-card" key={item.label}>
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                </article>
              ))}
            </div>
          </section>

          <section className="panel">
            <div className="panel-head">
              <h2>Fila ao vivo</h2>
              <span>{queue.length}</span>
            </div>
            <div className="queue-list">
              {queue.length ? queue.slice(0, 8).map((entry) => (
                <div className="queue-row" key={`${entry.name}-${entry.index}`}>
                  <strong>#{entry.index}</strong>
                  <span>{entry.name}</span>
                  <em>{entry.online ? 'online' : 'offline'}</em>
                </div>
              )) : (
                <div className="queue-empty">Nenhum treinador na fila agora.</div>
              )}
            </div>
          </section>
        </aside>
      </main>
    </div>
  );
}

function GamePage() {
  const backendOrigin = getBackendOrigin();
  const playerName = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return (params.get('name') || '').trim();
  }, []);

  useEffect(() => {
    let cleanup = () => {};
    let mounted = true;

    loadLegacyGameScripts(backendOrigin, playerName)
      .then((fn) => {
        cleanup = fn;
        if (!mounted) cleanup();
      })
      .catch((error) => {
        console.error('Falha ao carregar a arena legada:', error);
      });

    return () => {
      mounted = false;
      cleanup();
    };
  }, [backendOrigin, playerName]);

  return (
    <div className="arena-app">
      <main className="arena-shell">
        <section className="arena-stage">
          <nav id="navbar" className="arena-hud">
            <div className="hud-logo-area">
              <img src={`${backendOrigin}/assets/Logo_Game.png`} alt="Copa dos Treinadores" className="hud-logo" />
            </div>
            <div className="hud-score">
              <div className="score-strip" aria-label="Placar">
                <span id="time-left">3:00</span>
                <strong id="scoreboard-a" className="score-blue">0</strong>
                <strong id="scoreboard-b" className="score-red">0</strong>
                <span id="arena-status" className="score-status">Bloqueado</span>
              </div>
            </div>
            <div className="hud-actions">
              <button id="home" className="hud-button" title="Lobby Principal">
                <img src={`${backendOrigin}/assets/home.png`} alt="Home" />
              </button>
              <button id="help-btn" className="hud-button" type="button" title="Ajuda">
                <img src={`${backendOrigin}/assets/ajuda.gif`} alt="Ajuda" />
              </button>
              <button id="mute-btn" className="hud-button" title="Som">
                <img id="mute-icon" src={`${backendOrigin}/assets/som_ativado.png`} alt="Som" />
              </button>
              <button id="leave-btn" className="hud-button" title="Sair do Jogo">
                <img src={`${backendOrigin}/assets/sair.png`} alt="Sair" />
              </button>
            </div>
          </nav>

          <div id="info">
            <div id="ping" className="info-box">Ping: --</div>
            <div id="fps" className="info-box">FPS: --</div>
          </div>

          <div id="spectator-badge" className="spectator-badge" hidden>
            <span id="spectator-badge-text">Você está assistindo a partida.</span>
          </div>

          <div id="canvasDiv">
            <div id="go321"></div>
            <div id="left-area" className="touch-area"></div>
            <div id="right-area" className="touch-area"></div>
          </div>

          <div id="lock-overlay" className="arena-overlay">
            <div className="lock-backdrop"></div>
            <div className="lock-panel habbo-box">
              <img src={`${backendOrigin}/assets/times.png`} alt="Arena Times" className="lock-image" />
              <div className="lock-content">
                <strong id="overlay-title">Arena Fechada</strong>
                <span id="overlay-copy">Você está na fila. A arena será liberada pelo painel admin.</span>
              </div>
            </div>
          </div>

          <button id="tackle" className="button button-primary" type="button">
            <span>Desarme</span>
            <small>tecla T ou espaço</small>
          </button>
        </section>

        <aside className="arena-sidebar">
          <section className="side-panel habbo-box">
            <div className="habbo-box-header">
              <h2 id="player-name-label" className="habbo-box-title">Jogador</h2>
            </div>
            <div className="team-grid">
              <div>
                <h3 className="team-title-blue">Seleção A</h3>
                <div id="active-a" className="mini-list"></div>
              </div>
              <div>
                <h3 className="team-title-red">Seleção B</h3>
                <div id="active-b" className="mini-list"></div>
              </div>
            </div>
          </section>

          <section className="side-panel habbo-box">
            <div className="habbo-box-header">
              <h2>Próximos</h2>
            </div>
            <div className="team-grid">
              <div>
                <h3 className="team-title-blue">Fila A</h3>
                <div id="next-a" className="mini-list"></div>
              </div>
              <div>
                <h3 className="team-title-red">Fila B</h3>
                <div id="next-b" className="mini-list"></div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid var(--color-border)' }}>
              <h3 style={{ padding: '10px 12px', margin: 0, fontSize: '11px', color: 'var(--color-text-muted)', background: 'var(--color-bg-card-alt)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 800 }}>Fila Restante</h3>
              <div id="queue-list" className="queue-list queue-list--stage"></div>
            </div>
          </section>

          <section className="side-panel habbo-box">
            <div className="habbo-box-header chat-header">
              <img src={`${backendOrigin}/assets/chat.png`} alt="Chat" className="chat-icon" />
              <h2>Chat</h2>
            </div>
            <div className="chat-content">
              <div id="chat-log" className="chat-log"></div>
              <form id="chat-form" className="chat-form">
                <input id="chat-input" className="form-control" type="text" maxLength="220" placeholder="Falar no quarto..." />
                <button className="button button-primary" type="submit">Enviar</button>
              </form>
            </div>
          </section>
        </aside>
      </main>

      <div id="help-modal" className="help-modal" role="dialog" aria-modal="true" aria-labelledby="help-title" aria-hidden="true">
        <div className="help-modal__backdrop" data-help-close></div>
        <div className="help-modal__panel habbo-box">
          <div className="help-modal__head">
            <h2 id="help-title" className="habbo-box-title">Como jogar</h2>
            <button className="button button-secondary" type="button" data-help-close>Fechar</button>
          </div>
          <div className="help-grid">
            <div className="help-row"><span className="help-key">WASD</span><p>Movimente o jogador com precisão.</p></div>
            <div className="help-row"><span className="help-key">Mouse</span><p>Direcione o chute para onde quiser mirar.</p></div>
            <div className="help-row"><span className="help-key">Clique</span><p>Chute a bola quando estiver em posse.</p></div>
            <div className="help-row"><span className="help-key">T / Espaço</span><p>Faça um desarme rápido.</p></div>
          </div>
          <p className="help-note">Dica: entre com nome e aguarde o admin liberar a arena.</p>
        </div>
      </div>

      <audio src={`${backendOrigin}/assets/kick.mp3`} id="kick-sound" preload="auto"></audio>
      <audio src={`${backendOrigin}/assets/goal-sound.mp3`} id="goal-sound" preload="auto"></audio>
      <audio src={`${backendOrigin}/assets/pocket.mp3`} loop id="bg-sound"></audio>
    </div>
  );
}

export default function App() {
  const pathname = window.location.pathname;
  if (pathname === '/play') return <GamePage />;
  return <HomePage />;
}
