/* Interface: telas, rotas por hash e fluxo da partida. */
(function () {
  'use strict';
  const D = globalThis.Dominio;
  const app = document.getElementById('app');
  const motor = D.motor, bot = new D.BotEstrategia();
  const CHAVE_HIST = 'reino-elementos-historico', CHAVE_SALVA = 'reino-elementos-partida';
  const estado = { sel: null, batalha: null, fx: null, aguardando: false, timer: null };

  /* ---------- armazenamento (opcional, nunca obrigatório) ---------- */
  function ler(chave, padrao) { try { const v = localStorage.getItem(chave); return v ? JSON.parse(v) : padrao; } catch (e) { return padrao; } }
  function gravar(chave, valor) { try { localStorage.setItem(chave, JSON.stringify(valor)); } catch (e) { /* sem armazenamento */ } }
  function apagar(chave) { try { localStorage.removeItem(chave); } catch (e) { /* sem armazenamento */ } }
  function historico() { return ler(CHAVE_HIST, []); }
  (function restaurar() {
    const s = ler(CHAVE_SALVA, null);
    if (s && s.status === 'EM_ANDAMENTO') { try { estado.batalha = D.Batalha.fromJSON(s); } catch (e) { apagar(CHAVE_SALVA); } }
  })();

  /* ---------- emblemas das criaturas (SVG original) ---------- */
  const EMBLEMAS = {
    'lobo-flamejante':
      '<path class="a" d="M26 156 L36 96 L60 120 L64 58 L88 100 L100 34 L112 100 L136 58 L140 120 L164 96 L174 156 Z"/>' +
      '<polygon class="b" points="58,86 66,34 98,62 102,62 134,34 142,86 138,128 112,166 100,174 88,166 62,128"/>' +
      '<polygon class="a" points="68,74 72,48 90,66"/><polygon class="a" points="132,74 128,48 110,66"/>' +
      '<polygon class="k" points="72,98 92,106 72,110"/><polygon class="k" points="128,98 108,106 128,110"/>' +
      '<polygon class="k" points="91,138 109,138 100,150"/><path class="sk" stroke-width="3" d="M100 150 V158 M86 160 Q100 166 114 160"/>',
    'serpente-das-mares':
      '<path class="sa" stroke-width="24" d="M50 164 C 12 138 152 138 108 104 C 70 76 146 66 118 42"/>' +
      '<path class="sb" stroke-width="6" stroke-dasharray="2 13" d="M50 164 C 12 138 152 138 108 104 C 70 76 146 66 118 42"/>' +
      '<ellipse class="a" cx="124" cy="34" rx="20" ry="14" transform="rotate(-28 124 34)"/>' +
      '<circle class="k" cx="119" cy="28" r="4"/><circle class="b" cx="120" cy="27" r="1.6"/>' +
      '<path class="sb" stroke-width="3" d="M140 26 L158 18 M150 22 L158 30"/>' +
      '<path class="sb" stroke-width="4" d="M16 178 q 14 -10 28 0 t 28 0 t 28 0 t 28 0 t 28 0 t 28 0"/>',
    'tartaruga-rochosa':
      '<path class="a" d="M36 140 C 36 66 164 66 164 140 Z"/>' +
      '<polygon class="b" points="100,86 120,98 120,120 100,132 80,120 80,98"/>' +
      '<path class="sk" stroke-width="4" d="M100 86 V72 M120 98 L136 90 M120 120 L140 128 M80 120 L60 128 M80 98 L64 90"/>' +
      '<ellipse class="b" cx="36" cy="134" rx="18" ry="13"/><circle class="k" cx="30" cy="130" r="3.5"/>' +
      '<rect class="b" x="56" y="140" width="26" height="24" rx="8"/><rect class="b" x="122" y="140" width="26" height="24" rx="8"/>' +
      '<path class="sb" stroke-width="5" d="M20 172 H182"/>',
    'falcao-trovejante':
      '<path class="a" d="M98 96 L14 56 L38 100 L12 120 L58 118 L98 128 Z"/>' +
      '<path class="a" d="M98 96 L14 56 L38 100 L12 120 L58 118 L98 128 Z" transform="translate(198 0) scale(-1 1)"/>' +
      '<ellipse class="b" cx="100" cy="118" rx="22" ry="40"/>' +
      '<circle class="b" cx="100" cy="70" r="23"/>' +
      '<polygon class="a" points="95,76 105,76 100,102"/>' +
      '<polygon class="k" points="82,62 96,66 84,70"/><polygon class="k" points="118,62 104,66 116,70"/>' +
      '<polygon class="a" points="112,128 90,152 103,152 92,178 126,142 111,142 120,128"/>',
    'tigre-esmeralda':
      '<ellipse class="a" cx="30" cy="150" rx="12" ry="26" transform="rotate(35 30 150)"/>' +
      '<ellipse class="a" cx="170" cy="150" rx="12" ry="26" transform="rotate(-35 170 150)"/>' +
      '<ellipse class="a" cx="36" cy="44" rx="10" ry="22" transform="rotate(-40 36 44)"/>' +
      '<ellipse class="a" cx="166" cy="42" rx="10" ry="22" transform="rotate(40 166 42)"/>' +
      '<circle class="b" cx="56" cy="58" r="20"/><circle class="b" cx="144" cy="58" r="20"/>' +
      '<circle class="k" cx="56" cy="60" r="9"/><circle class="k" cx="144" cy="60" r="9"/>' +
      '<ellipse class="b" cx="100" cy="108" rx="58" ry="52"/>' +
      '<polygon class="k" points="100,60 93,84 107,84"/><polygon class="k" points="70,70 84,90 70,94"/><polygon class="k" points="130,70 116,90 130,94"/>' +
      '<polygon class="k" points="44,110 68,114 46,124"/><polygon class="k" points="156,110 132,114 154,124"/>' +
      '<circle class="a" cx="76" cy="102" r="10"/><circle class="a" cx="124" cy="102" r="10"/>' +
      '<circle class="k" cx="76" cy="102" r="4"/><circle class="k" cx="124" cy="102" r="4"/>' +
      '<ellipse cx="100" cy="132" rx="24" ry="16" fill="#f3ffe8"/>' +
      '<polygon class="k" points="91,122 109,122 100,133"/><path class="sk" stroke-width="3" d="M100 133 V140 M88 144 Q100 150 112 144"/>'
  };
  function emblema(id, nome) {
    return '<div class="emb"><svg viewBox="0 0 200 200" role="img" aria-label="Ilustração: ' + nome + '" focusable="false">' +
      '<circle class="bg" cx="100" cy="100" r="94"/>' + EMBLEMAS[id] + '</svg></div>';
  }

  /* ---------- utilidades ---------- */
  const cl = (c) => 'el-' + c.elemento.toLowerCase();
  const fmt = (m) => String(m).replace('.', ',');
  const rot = (e) => D.ROTULOS[e];
  const chip = (e) => '<span class="chip el-' + e.toLowerCase() + '">' + rot(e) + '</span>';
  const chips = (lista) => lista.length ? '<span class="chips">' + lista.map(chip).join('') + '</span>' : '<span>nenhuma</span>';
  function go(h) { if (location.hash === '#' + h) rota(); else location.hash = h; }
  function placar() {
    const h = historico();
    return { v: h.filter((x) => x.vencedor === 'jogador').length, d: h.filter((x) => x.vencedor !== 'jogador').length, n: h.length };
  }
  const emCurso = () => estado.batalha && (estado.batalha.status === 'EM_ANDAMENTO' || estado.batalha.status === 'PRONTA');

  /* ---------- telas ---------- */
  function vInicio() {
    const p = placar();
    return '<section class="hero"><div>' +
      '<h1>Reino<span>dos Elementos</span></h1>' +
      '<p class="lead">Cinco criaturas mágicas, cinco elementos e uma regra simples: quem escolhe melhor, vence. Aprenda as vantagens e enfrente o adversário em batalhas por turnos.</p>' +
      '<div class="row"><a class="btn primary" href="#selecao">Jogar</a><a class="btn" href="#criaturas">Criaturas</a><a class="btn" href="#como-jogar">Como jogar</a></div>' +
      (p.n ? '<div class="placar"><span>Seu placar</span><span>Vitórias <b>' + p.v + '</b></span><span>Derrotas <b>' + p.d + '</b></span></div>' : '') +
      (emCurso() ? '<p class="matchup" style="margin-top:14px">Há uma partida em andamento. <a href="#batalha">Continuar partida</a></p>' : '') +
      '</div><div class="medalhoes">' +
      D.CRIATURAS.map((c) => '<a class="' + cl(c) + '" href="#criatura-' + c.id + '" aria-label="Ver ' + c.nome + '">' + emblema(c.id, c.nome) + c.nome + '</a>').join('') +
      '</div></section>';
  }

  function cardCriatura(c) {
    return '<article class="card ' + cl(c) + '">' + emblema(c.id, c.nome) +
      '<h3>' + c.nome + '</h3><div class="chips">' + chip(c.elemento) + '</div>' +
      '<p>' + c.descricao + '</p>' +
      '<p class="rel"><b>Vantagem sobre:</b> ' + chips(D.MATRIZ.vantagensDe(c.elemento)) + '</p>' +
      '<p class="rel"><b>Fraqueza contra:</b> ' + chips(D.MATRIZ.fraquezasDe(c.elemento)) + '</p>' +
      '<a class="btn" href="#criatura-' + c.id + '">Ver ficha</a></article>';
  }
  function vCriaturas() {
    return '<h1 class="titulo-pagina">Criaturas do Reino</h1>' +
      '<p class="sub">Conheça os cinco guardiões e suas relações de vantagem e fraqueza antes de escolher o seu.</p>' +
      '<div class="grade">' + D.CRIATURAS.map(cardCriatura).join('') + '</div>';
  }

  function stat(nome, v, max) { return '<div class="stat"><span>' + nome + '</span><b>' + v + '</b><i style="--w:' + Math.round(v / max * 100) + '%"></i></div>'; }
  function vDetalhe(id) {
    const c = D.CATALOGO[id];
    if (!c) return vCriaturas();
    return '<a class="voltar" href="#criaturas">← Todas as criaturas</a>' +
      '<div class="detalhe ' + cl(c) + '">' + emblema(c.id, c.nome) + '<div>' +
      '<h1 class="titulo-pagina">' + c.nome + '</h1><div class="chips" style="margin-top:10px">' + chip(c.elemento) + '</div>' +
      '<p class="sub">' + c.descricao + '</p>' +
      '<div class="stats">' + stat('Vida', c.vidaMaxima, 130) + stat('Ataque', c.ataque, 20) + stat('Defesa', c.defesa, 16) + stat('Velocidade', c.velocidade, 16) + '</div>' +
      '<p class="rel"><b>Vantagem sobre:</b> ' + chips(D.MATRIZ.vantagensDe(c.elemento)) + '</p>' +
      '<p class="rel" style="margin-top:6px"><b>Fraqueza contra:</b> ' + chips(D.MATRIZ.fraquezasDe(c.elemento)) + '</p>' +
      '<h2 class="sec" style="font-size:1.2rem;margin-top:22px">Habilidades</h2><div style="margin-top:10px">' +
      c.habilidades.map((h) => '<div class="hab"><strong>' + h.nome + ' <small style="color:var(--muted);font-weight:400">' + (h.tipo === 'BASICO' ? 'Ataque básico' : 'Habilidade elemental, poder +' + h.poder) + '</small></strong><span>' + h.descricao + '</span></div>').join('') + '</div>' +
      '<div class="row" style="margin-top:20px"><button class="btn primary" data-action="jogar-com" data-id="' + c.id + '">Jogar com ' + c.nome + '</button></div>' +
      '</div></div>';
  }

  function vComoJogar() {
    const linhas = D.ELEMENTOS.map((e) => '<tr><td>' + chip(e) + '</td><td>' + chips(D.MATRIZ.vantagensDe(e)) + '</td><td>' + chips(D.MATRIZ.fraquezasDe(e)) + '</td></tr>').join('');
    return '<h1 class="titulo-pagina">Como jogar</h1>' +
      '<p class="sub">Uma partida é um duelo por turnos entre a sua criatura e a do computador. Zere os pontos de vida (PV) do adversário antes que ele zere os seus.</p>' +
      '<ol class="passos">' +
      '<li><div><strong>Escolha uma criatura</strong><span>Cada uma tem vida, ataque, defesa e velocidade diferentes. O adversário recebe uma criatura sorteada.</span></div></li>' +
      '<li><div><strong>Veja quem começa</strong><span>Age primeiro quem tem mais velocidade. Em caso de empate, a ordem é sorteada.</span></div></li>' +
      '<li><div><strong>Escolha uma ação a cada turno</strong><span>Ataque Básico está sempre disponível. A Habilidade Elemental causa mais dano, mas fica em recarga por 2 turnos depois de usada.</span></div></li>' +
      '<li><div><strong>Aproveite os elementos</strong><span>Vantagem aumenta o dano em 25% (×1,25). Desvantagem reduz em 20% (×0,80). Sem relação, o dano é normal.</span><div class="formula">dano = máx(1, arredonda((ataque + poder − defesa do alvo × 0,5) × elemento))</div></div></li>' +
      '<li><div><strong>Vença o duelo</strong><span>Ao chegar a 0 PV, uma criatura é derrotada e a partida termina. Seu resultado entra no histórico.</span></div></li></ol>' +
      '<h2 class="sec">Vantagens e fraquezas</h2>' +
      '<div class="tabela-wrap"><table><thead><tr><th scope="col">Elemento</th><th scope="col">Vantagem sobre</th><th scope="col">Fraqueza contra</th></tr></thead><tbody>' + linhas + '</tbody></table></div>' +
      '<p class="aviso">Os números de vida, ataque, defesa, velocidade e os multiplicadores são valores provisórios para teste de equilíbrio e ainda dependem da aprovação da equipe.</p>' +
      '<div class="row" style="margin-top:22px"><a class="btn primary" href="#selecao">Escolher criatura</a></div>';
  }

  function vSelecao() {
    const sel = estado.sel && D.CATALOGO[estado.sel];
    return '<h1 class="titulo-pagina">Escolha sua criatura</h1>' +
      '<p class="sub">Selecione um guardião para entrar na batalha. O adversário será sorteado.</p>' +
      '<div class="sel-grade" role="group" aria-label="Criaturas disponíveis">' +
      D.CRIATURAS.map((c) => '<button class="sel ' + cl(c) + '" data-action="sel" data-id="' + c.id + '" aria-pressed="' + (estado.sel === c.id) + '">' +
        emblema(c.id, c.nome) + '<strong>' + c.nome + '</strong>' + chip(c.elemento) +
        '<span class="mini">PV ' + c.vidaMaxima + ' · ATQ ' + c.ataque + ' · DEF ' + c.defesa + ' · VEL ' + c.velocidade + '</span>' +
        '<span class="marca">' + (estado.sel === c.id ? 'Selecionada' : '') + '</span></button>').join('') + '</div>' +
      '<div class="barra-acao"><button class="btn primary" data-action="jogar"' + (sel ? '' : ' disabled') + '>' + (sel ? 'Iniciar batalha com ' + sel.nome : 'Selecione uma criatura') + '</button>' +
      (emCurso() ? '<a class="btn" href="#batalha">Continuar partida em andamento</a>' : '') + '</div>';
  }

  function painel(c, titulo, ativo, fx) {
    const cr = c.criatura, pct = Math.round(c.pv / cr.vidaMaxima * 100);
    const golpe = fx && fx.alvo === c.lado;
    return '<section class="lutador ' + cl(cr) + (ativo ? ' ativo' : '') + (golpe ? ' golpe' : '') + '" aria-label="' + titulo + ': ' + cr.nome + '">' +
      '<span class="papel">' + titulo + (ativo ? ' · agindo' : '') + '</span>' + emblema(cr.id, cr.nome) +
      '<span class="nome">' + cr.nome + '</span>' + chip(cr.elemento) +
      '<div class="hp" role="progressbar" aria-label="Vida de ' + cr.nome + '" aria-valuemin="0" aria-valuemax="' + cr.vidaMaxima + '" aria-valuenow="' + c.pv + '"><span style="width:' + pct + '%"></span></div>' +
      '<span class="hpnum">' + c.pv + ' / ' + cr.vidaMaxima + ' PV</span>' +
      '<span class="estado">' + (c.vivo ? (c.recarga > 0 ? 'Habilidade em recarga: ' + c.recarga : 'Habilidade pronta') : 'Derrotado') + '</span>' +
      (golpe ? '<div class="pop"><b>−' + fx.dano + '</b>' + (fx.rotulo ? '<em>' + fx.rotulo + '</em>' : '') + '</div>' : '') + '</section>';
  }

  function textoMatchup(b) {
    const m = D.MATRIZ.multiplicador(b.jogador.criatura.elemento, b.bot.criatura.elemento);
    const j = rot(b.jogador.criatura.elemento), o = rot(b.bot.criatura.elemento);
    if (m > 1) return j + ' tem vantagem sobre ' + o + ': seu dano ×' + fmt(m) + '.';
    if (m < 1) return j + ' tem desvantagem contra ' + o + ': seu dano ×' + fmt(m) + '.';
    return j + ' e ' + o + ' não têm relação de vantagem: dano normal.';
  }

  function vBatalha() {
    const b = estado.batalha;
    if (!b) return null;
    const fx = estado.fx;
    const cena = '<div class="cena">' + painel(b.jogador, 'Você', b.status === 'EM_ANDAMENTO' && b.ladoAtivo === 'jogador', fx) +
      '<div class="vs">VS<small>' + (b.status === 'PRONTA' ? 'preparação' : 'turno ' + b.turno) + '</small></div>' +
      painel(b.bot, 'Adversário', b.status === 'EM_ANDAMENTO' && b.ladoAtivo === 'bot', fx) + '</div>';

    if (b.status === 'PRONTA') {
      return '<h1 class="titulo-pagina">Preparação</h1>' + cena +
        '<div class="prep"><p>' + textoMatchup(b) + '</p><p>Velocidade: ' + b.jogador.criatura.nome + ' ' + b.jogador.criatura.velocidade + ' × ' + b.bot.criatura.nome + ' ' + b.bot.criatura.velocidade + '. Age primeiro quem for mais rápido; em empate, a ordem é sorteada.</p>' +
        '<button class="btn primary" data-action="comecar">Começar batalha</button></div>';
    }

    const meuTurno = b.status === 'EM_ANDAMENTO' && b.ladoAtivo === 'jogador' && !estado.aguardando;
    const j = b.jogador;
    const prev = (tipo) => motor.calcularDano(j, b.bot, tipo);
    const acaoBtn = (tipo, tecla) => {
      const h = j.criatura.habilidade(tipo), ok = meuTurno && j.disponivel(tipo), p = prev(tipo);
      const info = tipo === 'ELEMENTAL' && !j.disponivel('ELEMENTAL') ? 'Em recarga: ' + j.recarga + (j.recarga === 1 ? ' turno' : ' turnos') : 'Dano estimado: ' + p.dano;
      return '<button class="acao" data-action="agir" data-tipo="' + tipo + '"' + (ok ? '' : ' disabled') + '><strong>' + h.nome + '<kbd>' + tecla + '</kbd></strong><span>' + (tipo === 'BASICO' ? 'Ataque Básico' : 'Habilidade Elemental') + ' · ' + info + '</span></button>';
    };

    let topo;
    if (b.status === 'FINALIZADA') {
      topo = '<h2>' + (b.vencedor === 'jogador' ? 'Você venceu!' : 'Você foi derrotado.') + '</h2><p class="matchup">A batalha terminou.</p>' +
        '<div class="row" style="margin-top:12px"><button class="btn primary" data-action="resultado">Ver resultado</button></div>';
    } else {
      topo = '<h2>' + (meuTurno ? 'Sua vez' : 'Vez do adversário') + '</h2><p class="matchup">' + textoMatchup(b) + '</p>' +
        (b.status === 'EM_ANDAMENTO' ? '<div class="acoes">' + acaoBtn('BASICO', '1') + acaoBtn('ELEMENTAL', '2') + '</div>' : '');
    }
    const aberturaLog = b.acoes.length === 0 ? '' : '';
    const itens = b.acoes.slice().reverse().map((a) => '<li class="' + (a.lado === 'jogador' ? 'j' : '') + (a.derrotou ? ' f' : '') + '"><b>T' + a.turno + '</b> ' + a.texto + '</li>').join('');
    const inicio = '<li>' + (b.sorteioEmpate ? 'Empate em velocidade: ordem sorteada. ' : '') + b.combatente(b.primeiro).criatura.nome + ' age primeiro.</li>';
    return '<h1 class="titulo-pagina">Batalha</h1>' + cena + '<div class="painel-turno">' + topo + '</div>' +
      '<ul class="log" role="log" aria-live="polite" aria-label="Registro da batalha">' + aberturaLog + itens + inicio + '</ul>' +
      '<p style="margin-top:14px"><button class="link-fraco" data-action="abandonar">Abandonar partida</button></p>';
  }

  function vResultado() {
    const b = estado.ultima;
    if (!b) return null;
    const venceu = b.vencedor === 'jogador';
    const mina = b.jogador.criatura;
    const h = historico().slice(0, 5);
    const p = placar();
    return '<section class="res ' + (venceu ? 'vit' : 'der') + ' ' + cl(venceu ? mina : b.bot.criatura) + '">' +
      '<h1>' + (venceu ? 'Vitória!' : 'Derrota') + '</h1>' +
      '<p class="sub" style="margin:8px auto 0">' + (venceu ? mina.nome + ' venceu ' + b.bot.criatura.nome + '.' : b.bot.criatura.nome + ' derrotou ' + mina.nome + '.') + '</p>' +
      emblema(venceu ? mina.id : b.bot.criatura.id, venceu ? mina.nome : b.bot.criatura.nome) +
      '<div class="num"><div><b>' + b.turno + '</b><span>turnos</span></div><div><b>' + b.danoCausadoPor('jogador') + '</b><span>dano causado</span></div><div><b>' + b.danoCausadoPor('bot') + '</b><span>dano sofrido</span></div></div>' +
      '<div class="row" style="justify-content:center"><button class="btn primary" data-action="novamente">Jogar novamente</button><a class="btn" href="#selecao">Trocar criatura</a><a class="btn" href="#criaturas">Ver criaturas</a></div></section>' +
      '<section class="hist"><h2 class="sec" style="font-size:1.25rem;margin-top:0">Histórico recente</h2>' +
      '<p class="sub">Vitórias: <b>' + p.v + '</b> · Derrotas: <b>' + p.d + '</b></p><ul>' +
      h.map((x) => '<li><span class="' + (x.vencedor === 'jogador' ? 'v' : 'd') + '"><b>' + (x.vencedor === 'jogador' ? 'Vitória' : 'Derrota') + '</b></span><span>' + x.jogador + ' × ' + x.bot + '</span><span>' + x.turnos + ' turnos</span></li>').join('') + '</ul>' +
      '<button class="link-fraco" data-action="limpar">Limpar histórico</button></section>';
  }

  /* ---------- rota ---------- */
  function rota() {
    clearTimeout(estado.timer); estado.timer = null; estado.aguardando = false;
    let h = location.hash.slice(1) || 'inicio';
    let html = null, nav = h;
    if (h.indexOf('criatura-') === 0) { html = vDetalhe(h.slice(9)); nav = 'criaturas'; }
    else if (h === 'inicio') html = vInicio();
    else if (h === 'criaturas') html = vCriaturas();
    else if (h === 'como-jogar') html = vComoJogar();
    else if (h === 'selecao') html = vSelecao();
    else if (h === 'batalha') { html = vBatalha(); if (html === null) { go('selecao'); return; } nav = 'selecao'; }
    else if (h === 'resultado') { html = vResultado(); if (html === null) { go('selecao'); return; } nav = 'selecao'; }
    else { html = vInicio(); nav = 'inicio'; }
    app.innerHTML = html;
    document.querySelectorAll('[data-nav]').forEach((a) => { if (a.dataset.nav === nav) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    if (h === 'batalha') agendarBot();
    foco();
  }
  function foco() {
    if (location.hash === '#batalha') {
      const b = document.querySelector('.acao:not([disabled])') || document.querySelector('[data-action="comecar"]') || document.querySelector('[data-action="resultado"]');
      if (b && !app.contains(document.activeElement)) b.focus({ preventScroll: true });
    }
  }
  function renderBatalha() { app.innerHTML = vBatalha(); estado.fx = null; agendarBot(); foco(); }

  /* ---------- fluxo de jogo ---------- */
  function persistir() {
    const b = estado.batalha;
    if (b && b.status === 'EM_ANDAMENTO') gravar(CHAVE_SALVA, b.toJSON()); else apagar(CHAVE_SALVA);
  }
  function rotuloEficacia(m) { return m > 1 ? 'Super efetivo!' : m < 1 ? 'Pouco efetivo' : ''; }
  function aplicar(lado, tipo) {
    const b = estado.batalha;
    try {
      const ev = motor.executar(b, lado, tipo, b.versao);
      estado.fx = { alvo: lado === 'jogador' ? 'bot' : 'jogador', dano: ev.dano, rotulo: rotuloEficacia(ev.mult) };
      if (b.status === 'FINALIZADA') finalizar();
      persistir();
      return true;
    } catch (e) {
      if (!(e instanceof D.ErroAcao)) throw e;
      return false; // ação rejeitada: nada mudou
    }
  }
  function finalizar() {
    const b = estado.batalha;
    estado.ultima = b;
    const h = historico();
    h.unshift({ vencedor: b.vencedor, jogador: b.jogador.criatura.nome, bot: b.bot.criatura.nome, turnos: b.turno, dano: b.danoCausadoPor('jogador') });
    gravar(CHAVE_HIST, h.slice(0, 20));
  }
  function agendarBot() {
    const b = estado.batalha;
    clearTimeout(estado.timer); estado.timer = null;
    if (!b || b.status !== 'EM_ANDAMENTO' || b.ladoAtivo !== 'bot' || location.hash !== '#batalha') { estado.aguardando = false; return; }
    estado.aguardando = true;
    estado.timer = setTimeout(() => {
      estado.timer = null; estado.aguardando = false;
      aplicar('bot', bot.escolher(b, 'bot'));
      renderBatalha();
    }, 1000);
  }
  function novaPartida() {
    const sorteada = D.CRIATURAS[Math.floor(Math.random() * D.CRIATURAS.length)];
    const b = new D.Batalha();
    b.selecionar(D.CATALOGO[estado.sel], sorteada);
    estado.batalha = b; estado.ultima = null; apagar(CHAVE_SALVA);
    go('batalha');
  }

  app.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-action]');
    if (!el || el.disabled) return;
    const a = el.dataset.action;
    if (a === 'sel') { estado.sel = el.dataset.id; app.innerHTML = vSelecao(); const n = app.querySelector('[data-id="' + estado.sel + '"]'); if (n) n.focus({ preventScroll: true }); }
    else if (a === 'jogar-com') { estado.sel = el.dataset.id; go('selecao'); }
    else if (a === 'jogar') { if (estado.sel) novaPartida(); }
    else if (a === 'comecar') { estado.batalha.iniciar(); persistir(); renderBatalha(); }
    else if (a === 'agir') { if (estado.aguardando) return; aplicar('jogador', el.dataset.tipo); renderBatalha(); }
    else if (a === 'resultado') go('resultado');
    else if (a === 'novamente') { if (!estado.sel) estado.sel = estado.ultima.jogador.criatura.id; novaPartida(); }
    else if (a === 'abandonar') { estado.batalha = null; apagar(CHAVE_SALVA); go('selecao'); }
    else if (a === 'limpar') { apagar(CHAVE_HIST); rota(); }
  });
  document.addEventListener('keydown', (ev) => {
    if (location.hash !== '#batalha' || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const tipo = ev.key === '1' ? 'BASICO' : ev.key === '2' ? 'ELEMENTAL' : null;
    if (!tipo) return;
    const btn = document.querySelector('.acao[data-tipo="' + tipo + '"]');
    if (btn && !btn.disabled) btn.click();
  });
  window.addEventListener('hashchange', rota);
  rota();
})();