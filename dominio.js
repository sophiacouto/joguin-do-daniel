/* Regras do jogo (domínio): sem acesso à interface. */
(function () {
  'use strict';
  const ELEMENTOS = ['FOGO', 'AGUA', 'TERRA', 'RAIO', 'NATUREZA'];
  const ROTULOS = { FOGO: 'Fogo', AGUA: 'Água', TERRA: 'Terra', RAIO: 'Raio', NATUREZA: 'Natureza' };
  const RECARGA_ELEMENTAL = 2;

  class ErroAcao extends Error {}

  // Única fonte das relações elementais. A desvantagem é sempre o inverso da vantagem.
  class MatrizElemental {
    constructor(vantagens, opcoes) {
      const o = Object.assign({ vantagem: 1.25, desvantagem: 0.8 }, opcoes);
      this.vantagens = vantagens;
      this.mVantagem = o.vantagem;
      this.mDesvantagem = o.desvantagem;
    }
    vantagensDe(el) { return this.vantagens[el] || []; }
    fraquezasDe(el) { return ELEMENTOS.filter((o) => this.vantagensDe(o).includes(el)); }
    multiplicador(atacante, alvo) {
      if (this.vantagensDe(atacante).includes(alvo)) return this.mVantagem;
      if (this.vantagensDe(alvo).includes(atacante)) return this.mDesvantagem;
      return 1;
    }
  }

  class Criatura {
    constructor(d) {
      Object.assign(this, d);
      this.habilidades = Object.freeze(d.habilidades.map((h) => Object.freeze(Object.assign({}, h))));
      Object.freeze(this);
    }
    get basico() { return this.habilidades.find((h) => h.tipo === 'BASICO'); }
    get elemental() { return this.habilidades.find((h) => h.tipo === 'ELEMENTAL'); }
    habilidade(tipo) { return tipo === 'ELEMENTAL' ? this.elemental : this.basico; }
  }

  class Combatente {
    constructor(criatura, lado) {
      this.criatura = criatura;
      this.lado = lado;
      this.pv = criatura.vidaMaxima;
      this.recarga = 0; // turnos restantes até a habilidade elemental voltar
    }
    get vivo() { return this.pv > 0; }
    disponivel(tipo) { return tipo === 'BASICO' || this.recarga === 0; }
    receberDano(n) { const real = Math.min(this.pv, n); this.pv -= real; return real; }
    aposAgir(tipo) {
      if (tipo === 'ELEMENTAL') this.recarga = RECARGA_ELEMENTAL;
      else this.recarga = Math.max(0, this.recarga - 1);
    }
  }

  class Batalha {
    constructor(rng) {
      this.rng = rng || Math.random;
      this.status = 'CRIADA';
      this.jogador = null; this.bot = null;
      this.turno = 0; this.ladoAtivo = null; this.primeiro = null;
      this.sorteioEmpate = false; this.vencedor = null;
      this.versao = 0; this.acoes = [];
    }
    selecionar(criaturaJogador, criaturaBot) {
      if (this.status !== 'CRIADA') throw new ErroAcao('Criaturas já selecionadas.');
      this.jogador = new Combatente(criaturaJogador, 'jogador');
      this.bot = new Combatente(criaturaBot, 'bot');
      this.status = 'PRONTA';
    }
    iniciar() {
      if (this.status !== 'PRONTA') throw new ErroAcao('A batalha não está pronta.');
      const vj = this.jogador.criatura.velocidade, vb = this.bot.criatura.velocidade;
      if (vj !== vb) this.primeiro = vj > vb ? 'jogador' : 'bot';
      else { this.sorteioEmpate = true; this.primeiro = this.rng() < 0.5 ? 'jogador' : 'bot'; }
      this.ladoAtivo = this.primeiro;
      this.turno = 1;
      this.status = 'EM_ANDAMENTO';
      this.versao++;
    }
    combatente(lado) { return lado === 'jogador' ? this.jogador : this.bot; }
    oponente(lado) { return lado === 'jogador' ? this.bot : this.jogador; }
    danoCausadoPor(lado) { return this.acoes.filter((a) => a.lado === lado).reduce((s, a) => s + a.dano, 0); }
    toJSON() {
      const c = (x) => ({ id: x.criatura.id, pv: x.pv, recarga: x.recarga });
      return { status: this.status, turno: this.turno, ladoAtivo: this.ladoAtivo, primeiro: this.primeiro,
        sorteioEmpate: this.sorteioEmpate, vencedor: this.vencedor, versao: this.versao, acoes: this.acoes,
        jogador: this.jogador && c(this.jogador), bot: this.bot && c(this.bot) };
    }
    static fromJSON(o, rng) {
      const b = new Batalha(rng);
      const mk = (x, lado) => { const c = new Combatente(CATALOGO[x.id], lado); c.pv = x.pv; c.recarga = x.recarga; return c; };
      b.jogador = mk(o.jogador, 'jogador'); b.bot = mk(o.bot, 'bot');
      ['status', 'turno', 'ladoAtivo', 'primeiro', 'sorteioEmpate', 'vencedor', 'versao'].forEach((k) => { b[k] = o[k]; });
      b.acoes = o.acoes;
      return b;
    }
  }

  class MotorCombate {
    constructor(matriz) { this.matriz = matriz; }

    calcularDano(atacante, alvo, tipo) {
      const hab = atacante.criatura.habilidade(tipo);
      const mult = this.matriz.multiplicador(atacante.criatura.elemento, alvo.criatura.elemento);
      const base = atacante.criatura.ataque + hab.poder - alvo.criatura.defesa * 0.5;
      return { dano: Math.max(1, Math.round(base * mult)), mult, hab };
    }

    // Valida tudo antes de alterar qualquer coisa: uma ação rejeitada não muda o estado.
    validar(batalha, lado, tipo, versaoEsperada) {
      if (batalha.status !== 'EM_ANDAMENTO') throw new ErroAcao('A batalha não está em andamento.');
      if (versaoEsperada !== undefined && versaoEsperada !== batalha.versao) throw new ErroAcao('Turno já executado.');
      if (lado !== batalha.ladoAtivo) throw new ErroAcao('Não é a vez deste lado.');
      if (tipo !== 'BASICO' && tipo !== 'ELEMENTAL') throw new ErroAcao('Ação inválida.');
      if (!batalha.combatente(lado).disponivel(tipo)) throw new ErroAcao('Habilidade em recarga.');
    }

    executar(batalha, lado, tipo, versaoEsperada) {
      this.validar(batalha, lado, tipo, versaoEsperada);
      const ator = batalha.combatente(lado), alvo = batalha.oponente(lado);
      const { dano: calculado, mult, hab } = this.calcularDano(ator, alvo, tipo);
      const dano = alvo.receberDano(calculado);
      ator.aposAgir(tipo);
      const derrotou = !alvo.vivo;
      let texto = ator.criatura.nome + ' usou ' + hab.nome + ' e causou ' + dano + ' de dano';
      if (mult > 1) texto += ' (super efetivo)'; else if (mult < 1) texto += ' (pouco efetivo)';
      texto += '.';
      if (derrotou) texto += ' ' + alvo.criatura.nome + ' foi derrotado!';
      const evento = { turno: batalha.turno, lado, tipo, nomeAcao: hab.nome, dano, mult, derrotou, texto };
      batalha.acoes.push(evento);
      if (derrotou) { batalha.status = 'FINALIZADA'; batalha.vencedor = lado; }
      else { batalha.ladoAtivo = lado === 'jogador' ? 'bot' : 'jogador'; batalha.turno++; }
      batalha.versao++;
      return evento;
    }
  }

  class BotEstrategia {
    constructor(rng) { this.rng = rng || Math.random; }
    // Comportamento simples: usa a habilidade elemental quando está disponível, com alguma variação.
    escolher(batalha, lado) {
      const c = batalha.combatente(lado);
      if (c.disponivel('ELEMENTAL') && this.rng() < 0.75) return 'ELEMENTAL';
      return 'BASICO';
    }
  }

  const MATRIZ = new MatrizElemental({
    FOGO: ['NATUREZA'],
    AGUA: ['FOGO'],
    TERRA: ['FOGO', 'RAIO'],
    RAIO: ['AGUA'],
    NATUREZA: ['TERRA']
  });

  const lista = [
    { id: 'lobo-flamejante', nome: 'Lobo Flamejante', elemento: 'FOGO',
      descricao: 'Caçador de pelagem em brasa que deixa um rastro de cinzas quentes por onde passa. Ágil e feroz, derrete a vegetação do reino, mas teme o peso das rochas.',
      vidaMaxima: 110, ataque: 20, defesa: 8, velocidade: 10,
      habilidades: [
        { tipo: 'BASICO', nome: 'Mordida Ardente', poder: 0, descricao: 'Ataque direto, sem espera.' },
        { tipo: 'ELEMENTAL', nome: 'Uivo de Brasas', poder: 8, descricao: 'Chamas poderosas. Recarga de 2 turnos.' }] },
    { id: 'serpente-das-mares', nome: 'Serpente das Marés', elemento: 'AGUA',
      descricao: 'Guardiã dos rios e das marés, desliza entre as ondas sem fazer barulho. Apaga chamas com um só golpe, mas a eletricidade corre pela água até ela.',
      vidaMaxima: 107, ataque: 18, defesa: 9, velocidade: 9,
      habilidades: [
        { tipo: 'BASICO', nome: 'Cauda de Espuma', poder: 0, descricao: 'Ataque direto, sem espera.' },
        { tipo: 'ELEMENTAL', nome: 'Onda Sinuosa', poder: 8, descricao: 'Maré forte contra o alvo. Recarga de 2 turnos.' }] },
    { id: 'tartaruga-rochosa', nome: 'Tartaruga Rochosa', elemento: 'TERRA',
      descricao: 'Um casco de pedra milenar sustenta uma pequena colina nas costas. Lenta e resistente, aguenta o calor do fogo e a fúria dos raios, mas as raízes vivas conseguem rachá-la.',
      vidaMaxima: 112, ataque: 14, defesa: 11, velocidade: 4,
      habilidades: [
        { tipo: 'BASICO', nome: 'Pancada de Casco', poder: 0, descricao: 'Ataque direto, sem espera.' },
        { tipo: 'ELEMENTAL', nome: 'Tremor Rochoso', poder: 9, descricao: 'O chão treme sob o alvo. Recarga de 2 turnos.' }] },
    { id: 'falcao-trovejante', nome: 'Falcão Trovejante', elemento: 'RAIO',
      descricao: 'Mergulha das nuvens de tempestade como um relâmpago vivo. É a criatura mais veloz do reino, mas o solo firme absorve a sua descarga.',
      vidaMaxima: 105, ataque: 17, defesa: 8, velocidade: 16,
      habilidades: [
        { tipo: 'BASICO', nome: 'Bicada Elétrica', poder: 0, descricao: 'Ataque direto, sem espera.' },
        { tipo: 'ELEMENTAL', nome: 'Mergulho Relâmpago', poder: 9, descricao: 'Descarga em voo rasante. Recarga de 2 turnos.' }] },
    { id: 'tigre-esmeralda', nome: 'Tigre Esmeralda', elemento: 'NATUREZA',
      descricao: 'Seus olhos verdes brilham entre as folhas da floresta antiga. Silencioso e paciente, fecha a mata em volta da presa, mas sofre quando as chamas avançam.',
      vidaMaxima: 109, ataque: 18, defesa: 7, velocidade: 11,
      habilidades: [
        { tipo: 'BASICO', nome: 'Garra de Folhas', poder: 0, descricao: 'Ataque direto, sem espera.' },
        { tipo: 'ELEMENTAL', nome: 'Espinhos da Mata', poder: 8, descricao: 'Espinhos brotam do chão. Recarga de 2 turnos.' }] }
  ];
  const CATALOGO = {};
  const CRIATURAS = lista.map((d) => { const c = new Criatura(d); CATALOGO[c.id] = c; return c; });

  globalThis.Dominio = { ELEMENTOS, ROTULOS, RECARGA_ELEMENTAL, ErroAcao, MatrizElemental, Criatura, Combatente,
    Batalha, MotorCombate, BotEstrategia, MATRIZ, CRIATURAS, CATALOGO, motor: new MotorCombate(MATRIZ) };
})();