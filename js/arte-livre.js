/* Página só de arte (arte.html): nome + curso + foto.
   Não envia nada para a planilha; tudo acontece no aparelho do aluno. */
(function () {
  'use strict';

  const C = window.CONFIG;
  const A = C.arte;
  const CHAVE_LOCAL = 'sorteioblack:arte-livre:v1';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const estado = {
    foto: null,
    ajuste: { zoom: 1, dx: 0, dy: 0, rot: 0 },
    recursos: { fundo: null, moldura: null, logo: null },
    blob: null,
  };

  // ---------- lembrar nome e curso neste aparelho (opcional) ----------
  function lerLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || {};
    } catch (e) {
      return {};
    }
  }
  function salvarLocal(obj) {
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(obj));
    } catch (e) {
      /* sem armazenamento: tudo bem */
    }
  }

  // ---------- formatação ----------
  const PARTICULAS = ['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du'];
  function formatarNome(nome) {
    const limpo = String(nome || '').replace(/\s+/g, ' ').trim();
    const tudoIgual = limpo === limpo.toUpperCase() || limpo === limpo.toLowerCase();
    if (!tudoIgual) return limpo;
    return limpo
      .toLowerCase()
      .split(' ')
      .map((p, i) => (i > 0 && PARTICULAS.includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(' ');
  }
  function nomeArte(nome) {
    const partes = nome.split(' ').filter(Boolean);
    if (partes.length <= 2) return nome;
    return partes[0] + ' ' + partes[partes.length - 1];
  }

  // ---------- navegação ----------
  function mostrar(id) {
    $$('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    window.scrollTo(0, 0);
    if (id === 'tela-criar') agendarDesenho();
  }

  // ---------- desenho ----------
  const canvas = $('#canvas-arte');
  const ctx = canvas.getContext('2d');
  let desenhoPendente = false;

  // ---------- graduação x pós-graduação ----------
  const ROTULO_POS = (A.textos && A.textos.rotuloPos) || 'ESPECIALIZAÇÃO EM';

  function ehPos() {
    const marcado = document.querySelector('input[name="tipo"]:checked');
    return !!marcado && marcado.value === 'pos';
  }

  // Tira "Especialização em", "Pós-graduação em" etc. do começo (a arte já escreve isso)
  function limparEspecializacao(v) {
    return String(v || '')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/^(especializa[cç][aã]o|p[oó]s[\s-]*gradua[cç][aã]o|p[oó]s)\s+(em|de|na|no)\s+/i, '')
      .trim();
  }

  function atualizarTipo() {
    const pos = ehPos();
    $('#campo-curso').hidden = pos;
    $('#campo-especializacao').hidden = !pos;
    $('[data-erro="curso"]').textContent = '';
    $('[data-erro="especializacao"]').textContent = '';
  }

  function dadosArte() {
    const nome = formatarNome($('#nome').value);
    const base = { nome: nome ? nomeArte(nome) : '', polo: '' }; // sem polo nesta página
    if (ehPos()) {
      return Object.assign(base, {
        rotulo: ROTULO_POS,
        curso: limparEspecializacao($('#especializacao').value),
        cursoReserva: 'SUA ESPECIALIZAÇÃO',
      });
    }
    return Object.assign(base, { curso: $('#curso').value });
  }

  function desenharAgora() {
    Arte.limitarAjuste(A, estado.foto, estado.ajuste);
    Arte.desenhar(ctx, C, estado.recursos, dadosArte(), estado.foto, estado.ajuste);
  }

  function agendarDesenho() {
    if (desenhoPendente) return;
    desenhoPendente = true;
    requestAnimationFrame(() => {
      desenhoPendente = false;
      desenharAgora();
    });
  }

  // ---------- foto ----------
  function carregarFoto(arquivo) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(arquivo);
      const img = new Image();
      img.onload = () => {
        const max = 2000;
        const s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
        const c = document.createElement('canvas');
        c.width = Math.max(1, Math.round(img.naturalWidth * s));
        c.height = Math.max(1, Math.round(img.naturalHeight * s));
        const g = c.getContext('2d');
        g.imageSmoothingQuality = 'high';
        g.drawImage(img, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('formato'));
      };
      img.src = url;
    });
  }

  function definirFoto(foto) {
    estado.foto = foto;
    estado.ajuste = { zoom: 1, dx: 0, dy: 0, rot: 0 };
    $('#zoom').value = 1;
    $('#controles-foto').hidden = !foto;
    $('#btn-escolher').hidden = !!foto;
    $('#dica-foto').hidden = !!foto;
    agendarDesenho();
  }

  async function aoEscolherFoto(e) {
    const arquivo = e.target.files && e.target.files[0];
    e.target.value = '';
    if (!arquivo) return;
    $('#erro-foto').textContent = '';
    try {
      definirFoto(await carregarFoto(arquivo));
    } catch (err) {
      $('#erro-foto').textContent = 'Não consegui abrir essa imagem. Tente uma foto em JPG ou PNG.';
    }
  }

  // Arrastar / pinça / roda do mouse
  const ponteiros = new Map();
  let gesto = null;
  const centroDe = (pts) => {
    const n = pts.length || 1;
    return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n };
  };
  const distancia = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  function escalaTela() {
    const r = canvas.getBoundingClientRect();
    return r.width ? canvas.width / r.width : 1;
  }
  function iniciarGesto() {
    const pts = Array.from(ponteiros.values());
    gesto = {
      ajuste: Object.assign({}, estado.ajuste),
      centro: centroDe(pts),
      dist: pts.length >= 2 ? distancia(pts[0], pts[1]) : 0,
    };
  }

  canvas.addEventListener('pointerdown', (e) => {
    if (!estado.foto) {
      $('#input-foto').click();
      return;
    }
    canvas.setPointerCapture(e.pointerId);
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    iniciarGesto();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!ponteiros.has(e.pointerId) || !gesto) return;
    ponteiros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const pts = Array.from(ponteiros.values());
    const c = centroDe(pts);
    const k = escalaTela();
    estado.ajuste.dx = gesto.ajuste.dx + (c.x - gesto.centro.x) * k;
    estado.ajuste.dy = gesto.ajuste.dy + (c.y - gesto.centro.y) * k;
    if (pts.length >= 2 && gesto.dist > 0) {
      estado.ajuste.zoom = Math.min(4, Math.max(1, (gesto.ajuste.zoom * distancia(pts[0], pts[1])) / gesto.dist));
      $('#zoom').value = estado.ajuste.zoom;
    }
    agendarDesenho();
  });
  const soltar = (e) => {
    if (!ponteiros.delete(e.pointerId)) return;
    Arte.limitarAjuste(A, estado.foto, estado.ajuste);
    iniciarGesto();
  };
  canvas.addEventListener('pointerup', soltar);
  canvas.addEventListener('pointercancel', soltar);
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!estado.foto) return;
      e.preventDefault();
      estado.ajuste.zoom = Math.min(4, Math.max(1, estado.ajuste.zoom * (1 - e.deltaY * 0.0015)));
      $('#zoom').value = estado.ajuste.zoom;
      agendarDesenho();
    },
    { passive: false }
  );

  // ---------- gerar / compartilhar ----------
  function validar() {
    const erros = {};
    const nome = formatarNome($('#nome').value);
    if (nome.length < 2) erros.nome = 'Digite seu nome.';
    if (ehPos()) {
      if (limparEspecializacao($('#especializacao').value).length < 3) erros.especializacao = 'Digite o nome da sua especialização.';
    } else if (!$('#curso').value) {
      erros.curso = 'Escolha o seu curso.';
    }
    $$('[data-erro]').forEach((el) => (el.textContent = erros[el.dataset.erro] || ''));
    $('#erro-foto').textContent = estado.foto ? '' : 'Envie sua foto para gerar a arte.';
    const primeiro = Object.keys(erros)[0];
    if (primeiro) {
      $('#' + primeiro).focus();
      return false;
    }
    return !!estado.foto;
  }

  async function gerarArte() {
    if (!validar()) return;
    desenharAgora();
    estado.blob = await new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.93));
    $('#img-final').src = canvas.toDataURL('image/jpeg', 0.93);
    const primeiro = formatarNome($('#nome').value).split(' ')[0];
    $('#final-titulo').textContent = `Sua arte está pronta, ${primeiro}!`;
    const arquivo = arquivoArte();
    const podeCompartilhar = !!(arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] }));
    $('#btn-compartilhar').hidden = !podeCompartilhar;
    $('#btn-baixar').classList.toggle('btn-primario', !podeCompartilhar);
    $('#btn-baixar').classList.toggle('btn-secundario', podeCompartilhar);
    mostrar('tela-final');
  }

  const NOME_ARQUIVO = 'arte-estudante-unifatecie.jpg';

  function arquivoArte() {
    if (!estado.blob) return null;
    try {
      return new File([estado.blob], NOME_ARQUIVO, { type: 'image/jpeg' });
    } catch (e) {
      return null;
    }
  }

  async function compartilhar() {
    const arquivo = arquivoArte();
    if (!arquivo) return baixar();
    try {
      await navigator.share({ files: [arquivo] });
    } catch (e) {
      if (e && e.name !== 'AbortError') baixar();
    }
  }

  function baixar() {
    if (!estado.blob) return;
    const url = URL.createObjectURL(estado.blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = NOME_ARQUIVO;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 2000);
  }

  // ---------- início ----------
  function iniciarFormulario() {
    const sel = $('#curso');
    sel.appendChild(new Option('Selecione seu curso', ''));
    C.cursos.forEach((c) => sel.appendChild(new Option(c, c)));
    $$('.perfil').forEach((el) => (el.textContent = '@' + C.perfilInstagram));

    const salvo = lerLocal();
    if (salvo.nome) $('#nome').value = salvo.nome;
    if (salvo.curso && C.cursos.includes(salvo.curso)) sel.value = salvo.curso;
    if (salvo.especializacao) $('#especializacao').value = salvo.especializacao;
    if (salvo.tipo === 'pos') document.querySelector('input[name="tipo"][value="pos"]').checked = true;
    atualizarTipo();

    const aoMudar = (e) => {
      if (e.target.name === 'tipo') atualizarTipo();
      const alvo = document.querySelector(`[data-erro="${e.target.id}"]`);
      if (alvo) alvo.textContent = '';
      salvarLocal({
        nome: $('#nome').value,
        curso: sel.value,
        tipo: ehPos() ? 'pos' : 'graduacao',
        especializacao: $('#especializacao').value,
      });
      agendarDesenho();
    };
    $('#form-arte').addEventListener('input', aoMudar);
    $('#form-arte').addEventListener('change', aoMudar);
    $('#form-arte').addEventListener('submit', (e) => e.preventDefault());
  }

  function ligarEventos() {
    $('#input-foto').addEventListener('change', aoEscolherFoto);
    $('#btn-escolher').addEventListener('click', () => $('#input-foto').click());
    $('#btn-trocar').addEventListener('click', () => $('#input-foto').click());
    $('#btn-girar').addEventListener('click', () => {
      estado.ajuste.rot = (estado.ajuste.rot + 90) % 360;
      agendarDesenho();
    });
    $('#zoom').addEventListener('input', (e) => {
      estado.ajuste.zoom = parseFloat(e.target.value) || 1;
      agendarDesenho();
    });
    $('#btn-gerar').addEventListener('click', gerarArte);
    $('#btn-compartilhar').addEventListener('click', compartilhar);
    $('#btn-baixar').addEventListener('click', baixar);
    $('#btn-editar').addEventListener('click', () => mostrar('tela-criar'));
  }

  async function iniciar() {
    iniciarFormulario();
    ligarEventos();
    if (/Instagram|FBAN|FBAV|FB_IAB|musical_ly|Bytedance|TikTok|Line\//i.test(navigator.userAgent || '')) {
      $('#aviso-app').hidden = false;
    }
    estado.recursos = await Arte.preparar(C);
    agendarDesenho();
  }

  iniciar();
})();
