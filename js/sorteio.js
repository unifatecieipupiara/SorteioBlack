/* Painel do sorteio: carrega inscritos da planilha e sorteia com animação. */
(function () {
  'use strict';

  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const CHAVE_SESSAO = 'sorteioblack:chave';

  let participantes = [];
  const vencedores = [];
  let girando = false;

  // Número aleatório criptograficamente seguro e sem viés em [0, n)
  function aleatorio(n) {
    const limite = Math.floor(0x100000000 / n) * n;
    const buf = new Uint32Array(1);
    let x;
    do {
      crypto.getRandomValues(buf);
      x = buf[0];
    } while (x >= limite);
    return x % n;
  }

  function num(n) {
    return String(n || 0).padStart(4, '0');
  }

  function texto(tag, classe, conteudo) {
    const el = document.createElement(tag);
    if (classe) el.className = classe;
    if (conteudo != null) el.textContent = conteudo;
    return el;
  }

  // ---------- carregamento ----------
  async function carregar(chave) {
    const msg = $('#msg-acesso');
    msg.textContent = 'Carregando…';
    try {
      const url = C.urlBackend + '?acao=listar&chave=' + encodeURIComponent(chave) + '&t=' + Date.now();
      const r = await (await fetch(url)).json();
      if (!r.ok) {
        msg.textContent = r.erro || 'Não foi possível carregar.';
        return;
      }
      try { sessionStorage.setItem(CHAVE_SESSAO, chave); } catch (e) { /* ok */ }
      definirParticipantes(r.participantes || []);
      msg.textContent = `${participantes.length} inscrições carregadas às ${new Date().toLocaleTimeString('pt-BR')}.`;
    } catch (e) {
      msg.textContent = 'Erro de conexão com a planilha. Confira a URL em js/config.js.';
    }
  }

  function exemplo() {
    const nomes = ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'Diego Alves', 'Elaine Rocha', 'Felipe Santos', 'Gabriela Nunes', 'Heitor Costa', 'Isabela Ramos', 'João Pedro Silva', 'Larissa Melo', 'Marcos Vinícius', 'Natália Freitas', 'Otávio Prado', 'Paula Teixeira'];
    const lista = nomes.map((nome, i) => ({
      numero: i + 1,
      nome,
      ra: String(100000 + i * 137),
      polo: C.polos[i % C.polos.length],
      curso: C.cursos[(i * 3) % C.cursos.length],
      instagram: nome.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, '.'),
      data: '',
    }));
    definirParticipantes(lista);
    $('#msg-acesso').textContent = 'Modo de teste com 15 participantes fictícios.';
  }

  function definirParticipantes(lista) {
    participantes = lista.slice().sort((a, b) => a.numero - b.numero);
    const sel = $('#filtro-polo');
    const atual = sel.value;
    sel.innerHTML = '';
    sel.appendChild(new Option('Todos os polos', ''));
    const polos = Array.from(new Set(participantes.map((p) => p.polo).concat(C.polos)));
    polos.forEach((p) => sel.appendChild(new Option(p, p)));
    sel.value = polos.includes(atual) ? atual : '';
    $('#filtros').hidden = false;
    $('#palco').hidden = false;
    atualizarContagem();
  }

  function elegiveis() {
    const polo = $('#filtro-polo').value;
    const semRepetir = $('#sem-repetir').checked;
    const ganhadores = new Set(vencedores.map((v) => v.ra));
    return participantes.filter((p) => (!polo || p.polo === polo) && !(semRepetir && ganhadores.has(p.ra)));
  }

  function atualizarContagem() {
    const box = $('#contagem');
    box.innerHTML = '';
    const porPolo = {};
    participantes.forEach((p) => (porPolo[p.polo] = (porPolo[p.polo] || 0) + 1));
    const chip = (rotulo, valor) => {
      const s = texto('span');
      s.append(rotulo + ': ');
      s.appendChild(texto('b', '', String(valor)));
      box.appendChild(s);
    };
    chip('Total', participantes.length);
    Object.keys(porPolo).forEach((p) => chip(p, porPolo[p]));
    chip('Concorrendo agora', elegiveis().length);
  }

  // ---------- sorteio ----------
  function mostrarNoPalco(p, revelado) {
    $('#palco-numero').textContent = num(p.numero);
    $('#palco-nome').textContent = p.nome;
    $('#palco-info').textContent = revelado ? `${p.polo} • ${p.curso} • @${p.instagram}` : p.polo;
  }

  function sortear() {
    if (girando) return;
    const lista = elegiveis();
    if (!lista.length) {
      $('#palco-rotulo').textContent = 'Ninguém para sortear com esse filtro';
      return;
    }
    girando = true;
    const ganhador = lista[aleatorio(lista.length)];
    const palco = $('#palco');
    palco.classList.remove('revelado');
    palco.classList.add('girando');
    $('#palco-rotulo').textContent = 'Sorteando…';
    $('#btn-sortear').disabled = true;

    const duracao = 5000;
    const inicio = performance.now();
    const passo = () => {
      const t = (performance.now() - inicio) / duracao;
      if (t >= 1) return revelar(ganhador);
      mostrarNoPalco(lista[aleatorio(lista.length)], false);
      const intervalo = 40 + 360 * t * t; // desacelera
      setTimeout(passo, intervalo);
    };
    passo();
  }

  function revelar(ganhador) {
    const palco = $('#palco');
    palco.classList.remove('girando');
    palco.classList.add('revelado');
    const polo = $('#filtro-polo').value;
    const ordem = vencedores.filter((v) => !polo || v.polo === polo).length + 1;
    $('#palco-rotulo').textContent = polo ? `${ordem}º sorteado • ${polo}` : `${ordem}º sorteado`;
    mostrarNoPalco(ganhador, true);
    vencedores.push(Object.assign({ quando: new Date() }, ganhador));
    desenharVencedores();
    atualizarContagem();
    confete();
    girando = false;
    $('#btn-sortear').disabled = false;
    $('#btn-sortear').textContent = 'Sortear outro';
  }

  function desenharVencedores() {
    const ol = $('#lista-vencedores');
    ol.innerHTML = '';
    vencedores.forEach((v) => {
      const li = document.createElement('li');
      li.appendChild(texto('div', 'nome', `#${num(v.numero)} — ${v.nome}`));
      const det = texto('div', 'det');
      det.append(`${v.polo} • ${v.curso} • `);
      const a = texto('a', '', '@' + v.instagram);
      a.href = 'https://instagram.com/' + encodeURIComponent(v.instagram);
      a.target = '_blank';
      a.rel = 'noopener';
      det.appendChild(a);
      det.appendChild(texto('span', 'ra', ` • RA ${v.ra}`));
      det.append(` • sorteado às ${v.quando.toLocaleTimeString('pt-BR')}`);
      li.appendChild(det);
      ol.appendChild(li);
    });
    $('#vencedores').hidden = vencedores.length === 0;
  }

  // ---------- confete ----------
  function confete() {
    const cv = $('#confete');
    const ctx = cv.getContext('2d');
    const r = cv.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    cv.width = r.width * dpr;
    cv.height = r.height * dpr;
    ctx.scale(dpr, dpr);
    const cores = ['#FF7A00', '#FFA040', '#FFFFFF', '#FF5500'];
    const pecas = Array.from({ length: 160 }, () => ({
      x: r.width / 2,
      y: r.height * 0.35,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 12 - 4,
      g: 0.28 + Math.random() * 0.1,
      w: 6 + Math.random() * 6,
      h: 10 + Math.random() * 8,
      a: Math.random() * Math.PI,
      va: (Math.random() - 0.5) * 0.3,
      cor: cores[Math.floor(Math.random() * cores.length)],
    }));
    const inicio = performance.now();
    const quadro = () => {
      const t = performance.now() - inicio;
      ctx.clearRect(0, 0, r.width, r.height);
      pecas.forEach((p) => {
        p.vy += p.g;
        p.vx *= 0.99;
        p.x += p.vx;
        p.y += p.vy;
        p.a += p.va;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.a);
        ctx.globalAlpha = Math.max(0, 1 - t / 4000);
        ctx.fillStyle = p.cor;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (t < 4000) requestAnimationFrame(quadro);
      else ctx.clearRect(0, 0, r.width, r.height);
    };
    requestAnimationFrame(quadro);
  }

  // ---------- eventos ----------
  function iniciar() {
    $('#titulo').textContent = C.campanha.titulo;
    if (!C.urlBackend) {
      $('#msg-acesso').textContent = 'A URL da planilha ainda não foi configurada em js/config.js.';
      $('#btn-exemplo').hidden = false;
    }
    try {
      const salva = sessionStorage.getItem(CHAVE_SESSAO);
      if (salva) $('#chave').value = salva;
    } catch (e) { /* ok */ }

    $('#form-acesso').addEventListener('submit', (e) => {
      e.preventDefault();
      const chave = $('#chave').value.trim();
      if (!C.urlBackend) return exemplo();
      if (!chave) {
        $('#msg-acesso').textContent = 'Digite a chave de administrador.';
        return;
      }
      carregar(chave);
    });
    $('#btn-exemplo').addEventListener('click', exemplo);
    $('#filtro-polo').addEventListener('change', atualizarContagem);
    $('#sem-repetir').addEventListener('change', atualizarContagem);
    $('#btn-sortear').addEventListener('click', sortear);
    $('#mostrar-ra').addEventListener('change', (e) => $('#lista-vencedores').classList.toggle('com-ra', e.target.checked));
    $('#btn-tela-cheia').addEventListener('click', () => {
      const palco = $('#palco');
      if (document.fullscreenElement) document.exitFullscreen();
      else if (palco.requestFullscreen) palco.requestFullscreen();
    });
  }

  iniciar();
})();
