/* Fluxo do site: dados -> foto -> arte -> inscrição. */
(function () {
  'use strict';

  const C = window.CONFIG;
  const A = C.arte;
  const CHAVE_LOCAL = 'sorteioblack:v1';
  const OUTRO = '__outro__';

  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));

  const estado = {
    dados: null,
    foto: null,
    ajuste: { zoom: 1, dx: 0, dy: 0, rot: 0 },
    recursos: { fundo: null, moldura: null, logo: null },
    blob: null,
    raRegistrado: null,
  };

  // ---------- armazenamento local (opcional) ----------
  function lerLocal() {
    try {
      return JSON.parse(localStorage.getItem(CHAVE_LOCAL)) || {};
    } catch (e) {
      return {};
    }
  }
  function salvarLocal(obj) {
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(Object.assign(lerLocal(), obj)));
    } catch (e) {
      /* sem armazenamento: tudo bem */
    }
  }

  // ---------- formatação ----------
  const PARTICULAS = ['de', 'da', 'do', 'das', 'dos', 'e', 'di', 'du'];
  function formatarNome(nome) {
    const limpo = nome.replace(/\s+/g, ' ').trim();
    const tudoIgual = limpo === limpo.toUpperCase() || limpo === limpo.toLowerCase();
    if (!tudoIgual) return limpo;
    return limpo
      .toLowerCase()
      .split(' ')
      .map((p, i) => (i > 0 && PARTICULAS.includes(p) ? p : p.charAt(0).toUpperCase() + p.slice(1)))
      .join(' ');
  }
  function normalizarRA(ra) {
    return String(ra || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }
  function normalizarInstagram(v) {
    let s = String(v || '').trim();
    s = s.replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').split(/[/?#]/)[0];
    return s.replace(/^@+/, '').replace(/\s/g, '').toLowerCase();
  }
  function nomeArte(nome) {
    // Na arte: primeiro e último nome, para caber bem
    const partes = nome.split(' ').filter(Boolean);
    if (partes.length <= 2) return nome;
    return partes[0] + ' ' + partes[partes.length - 1];
  }

  // ---------- navegação ----------
  function mostrar(id) {
    $$('.tela').forEach((t) => t.classList.toggle('ativa', t.id === id));
    window.scrollTo(0, 0);
    if (id === 'tela-foto') agendarDesenho();
  }

  // ---------- inicialização ----------
  function iniciarTextos() {
    const c = C.campanha;
    document.title = c.titulo;
    if (c.selo) $('#selo').textContent = c.selo;
    $('#titulo-campanha').textContent = c.titulo;
    $('#subtitulo-campanha').textContent = c.subtitulo;
    $('#premio').textContent = c.premio;
    $('#premio-detalhe').textContent = c.premioDetalhe || '';
    if (c.imagemPremio) {
      const img = $('#img-premio');
      const legenda = $('#legenda-premio');
      legenda.textContent = c.legendaImagemPremio || '';
      img.onload = () => {
        img.hidden = false;
        legenda.hidden = !legenda.textContent;
      };
      img.onerror = () => (img.hidden = true);
      img.src = c.imagemPremio;
    }
    const partes = [];
    if (c.encerramento) {
      const d = new Date(c.encerramento);
      if (!isNaN(d)) {
        partes.push(
          'Inscrições até ' +
            d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', timeZone: 'America/Sao_Paulo' }) +
            ' às ' +
            d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })
        );
      }
    }
    if (c.dataSorteio) partes.push('Sorteio em ' + c.dataSorteio);
    $('#info-datas').textContent = partes.join(' • ');
    $$('.perfil').forEach((el) => (el.textContent = '@' + C.perfilInstagram));

    const lista = $('#lista-regulamento');
    C.regulamento.forEach((r) => {
      const li = document.createElement('li');
      li.textContent = r;
      lista.appendChild(li);
    });

    const polos = $('#opcoes-polo');
    C.polos.forEach((p, i) => {
      const id = 'polo-' + i;
      const label = document.createElement('label');
      label.className = 'opcao';
      label.innerHTML = `<input type="radio" name="polo" id="${id}"><span></span>`;
      label.querySelector('input').value = p;
      label.querySelector('span').textContent = p;
      polos.appendChild(label);
    });

    const sel = $('#curso');
    sel.appendChild(new Option('Selecione seu curso', ''));
    C.cursos.forEach((c) => sel.appendChild(new Option(c, c)));
    if (C.permitirOutroCurso) sel.appendChild(new Option('Outro curso', OUTRO));
    sel.addEventListener('change', () => {
      $('#campo-outro-curso').hidden = sel.value !== OUTRO;
    });
  }

  function encerrado() {
    if (!C.campanha.encerramento) return false;
    const fim = Date.parse(C.campanha.encerramento);
    return !isNaN(fim) && Date.now() > fim;
  }

  function navegadorDeApp() {
    return /Instagram|FBAN|FBAV|FB_IAB|musical_ly|Bytedance|TikTok|Line\//i.test(navigator.userAgent || '');
  }

  function restaurarFormulario() {
    const salvo = lerLocal().dados;
    if (!salvo) return;
    $('#nome').value = salvo.nome || '';
    $('#ra').value = salvo.ra || '';
    $('#instagram').value = salvo.instagram || '';
    const radio = $$('input[name="polo"]').find((r) => r.value === salvo.polo);
    if (radio) radio.checked = true;
    const sel = $('#curso');
    if (C.cursos.includes(salvo.curso)) {
      sel.value = salvo.curso;
    } else if (salvo.curso && C.permitirOutroCurso) {
      sel.value = OUTRO;
      $('#outro-curso').value = salvo.curso;
      $('#campo-outro-curso').hidden = false;
    }
  }

  // ---------- formulário ----------
  function validar() {
    const erros = {};
    const nome = formatarNome($('#nome').value);
    const ra = normalizarRA($('#ra').value);
    const poloEl = $$('input[name="polo"]').find((r) => r.checked);
    const sel = $('#curso').value;
    const curso = sel === OUTRO ? $('#outro-curso').value.replace(/\s+/g, ' ').trim() : sel;
    const instagram = normalizarInstagram($('#instagram').value);

    if (nome.split(' ').length < 2 || nome.length < 5) erros.nome = 'Digite seu nome completo.';
    if (!/^[A-Z0-9]{4,20}$/.test(ra)) erros.ra = 'Digite um RA válido.';
    if (!poloEl) erros.polo = 'Escolha o seu polo.';
    if (!sel) erros.curso = 'Escolha o seu curso.';
    else if (sel === OUTRO && curso.length < 3) erros.outroCurso = 'Digite o nome do curso.';
    if (!/^[a-z0-9._]{1,30}$/.test(instagram)) erros.instagram = 'Digite um @ válido (só letras, números, ponto e _).';
    if (!$('#aceite').checked) erros.aceite = 'É preciso aceitar o regulamento.';

    $$('[data-erro]').forEach((el) => (el.textContent = erros[el.dataset.erro] || ''));
    const primeiro = Object.keys(erros)[0];
    if (primeiro) {
      const alvo = { polo: '#opcoes-polo input', outroCurso: '#outro-curso' }[primeiro] || '#' + primeiro;
      const el = $(alvo);
      if (el) el.focus();
      return null;
    }
    return { nome, ra, polo: poloEl.value, curso, instagram };
  }

  function limparErro(el) {
    const nome = el.name === 'polo' ? 'polo' : el.id === 'outro-curso' ? 'outroCurso' : el.id;
    const alvo = document.querySelector(`[data-erro="${nome}"]`);
    if (alvo) alvo.textContent = '';
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
        const ctx = c.getContext('2d');
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, c.width, c.height);
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

  const canvas = $('#canvas-arte');
  const ctx = canvas.getContext('2d');
  let desenhoPendente = false;

  function dadosArte() {
    const d = estado.dados || {};
    return { nome: d.nome ? nomeArte(d.nome) : '', curso: d.curso || '', polo: d.polo || '' };
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

  function definirFoto(foto) {
    estado.foto = foto;
    estado.ajuste = { zoom: 1, dx: 0, dy: 0, rot: 0 };
    $('#zoom').value = 1;
    $('#controles-foto').hidden = !foto;
    $('#btn-escolher').hidden = !!foto;
    $('#btn-gerar').disabled = !foto;
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

  function iniciarGesto() {
    const pts = Array.from(ponteiros.values());
    gesto = {
      ajuste: Object.assign({}, estado.ajuste),
      centro: centroDe(pts),
      dist: pts.length >= 2 ? distancia(pts[0], pts[1]) : 0,
    };
  }
  function centroDe(pts) {
    const n = pts.length || 1;
    return { x: pts.reduce((s, p) => s + p.x, 0) / n, y: pts.reduce((s, p) => s + p.y, 0) / n };
  }
  function distancia(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function escalaTela() {
    const r = canvas.getBoundingClientRect();
    return r.width ? canvas.width / r.width : 1;
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

  // ---------- inscrição ----------
  async function registrar(dados) {
    if (!C.urlBackend) return { ok: true, demo: true };
    const controle = new AbortController();
    const tempo = setTimeout(() => controle.abort(), 30000);
    try {
      // Sem cabeçalhos personalizados: o Apps Script aceita como "text/plain" (evita bloqueio de CORS)
      const resp = await fetch(C.urlBackend, {
        method: 'POST',
        body: JSON.stringify(Object.assign({ acao: 'inscrever' }, dados)),
        signal: controle.signal,
      });
      return await resp.json();
    } finally {
      clearTimeout(tempo);
    }
  }

  function gerarBlob() {
    return new Promise((resolve) => canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.93));
  }

  async function gerarArte() {
    desenharAgora();
    estado.blob = await gerarBlob();
    $('#img-final').src = canvas.toDataURL('image/jpeg', 0.93);
    mostrar('tela-final');
    await enviarInscricao();
  }

  async function enviarInscricao() {
    $('#final-carregando').hidden = false;
    $('#final-erro').hidden = true;
    $('#final-ok').hidden = true;

    let r;
    try {
      r = await registrar(estado.dados);
    } catch (err) {
      r = { ok: false, erro: 'Sem conexão com o servidor. Verifique sua internet e tente novamente.' };
    }
    $('#final-carregando').hidden = true;

    if (!r || !r.ok) {
      $('#final-erro-msg').textContent = (r && r.erro) || 'Não foi possível registrar sua participação.';
      $('#final-erro').hidden = false;
      return;
    }

    const reedicao = r.jaInscrito && estado.raRegistrado === estado.dados.ra;
    estado.raRegistrado = estado.dados.ra;

    const primeiro = estado.dados.nome.split(' ')[0];
    if (reedicao) {
      $('#final-titulo').textContent = 'Arte atualizada!';
      $('#final-msg').textContent = 'Sua participação continua registrada.';
    } else if (r.jaInscrito) {
      $('#final-titulo').textContent = `Oi de novo, ${primeiro}!`;
      $('#final-msg').textContent = 'Você já estava participando com este RA. Aqui está a sua arte.';
    } else {
      $('#final-titulo').textContent = `Pronto, ${primeiro}!`;
      $('#final-msg').textContent = 'Sua participação foi registrada. Agora é só postar!';
    }
    $('#numero').textContent = estado.dados.ra;
    $('#aviso-demo').hidden = !r.demo;

    const arquivo = arquivoArte();
    const podeCompartilhar = !!(arquivo && navigator.canShare && navigator.canShare({ files: [arquivo] }));
    $('#btn-compartilhar').hidden = !podeCompartilhar;
    $('#btn-baixar').classList.toggle('btn-primario', !podeCompartilhar);
    $('#btn-baixar').classList.toggle('btn-secundario', podeCompartilhar);
    $('#final-ok').hidden = false;
  }

  function nomeArquivo() {
    return 'arte-sorteio-black-' + (estado.dados ? estado.dados.ra : 'unifatecie') + '.jpg';
  }

  function arquivoArte() {
    if (!estado.blob) return null;
    try {
      return new File([estado.blob], nomeArquivo(), { type: 'image/jpeg' });
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
    a.download = nomeArquivo();
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      a.remove();
    }, 2000);
  }

  async function copiarPerfil() {
    const texto = '@' + C.perfilInstagram;
    const btn = $('#btn-copiar');
    try {
      await navigator.clipboard.writeText(texto);
      btn.textContent = 'Copiado!';
    } catch (e) {
      btn.textContent = texto;
    }
    setTimeout(() => (btn.textContent = 'Copiar @'), 2000);
  }

  // ---------- eventos ----------
  function ligarEventos() {
    $('#btn-participar').addEventListener('click', () => mostrar('tela-dados'));
    $$('[data-ir]').forEach((b) => b.addEventListener('click', () => mostrar(b.dataset.ir)));

    const dlg = $('#dlg-regulamento');
    $$('[data-abrir-regulamento]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.preventDefault();
        if (dlg.showModal) dlg.showModal();
        else dlg.setAttribute('open', '');
      })
    );

    $('#form-dados').addEventListener('submit', (e) => {
      e.preventDefault();
      const dados = validar();
      if (!dados) return;
      estado.dados = dados;
      salvarLocal({ dados });
      mostrar('tela-foto');
    });

    // Some a mensagem de erro do campo assim que o aluno corrige
    $('#form-dados').addEventListener('input', (e) => limparErro(e.target));
    $('#form-dados').addEventListener('change', (e) => limparErro(e.target));

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
    $('#btn-gerar').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      try {
        await gerarArte();
      } finally {
        btn.disabled = !estado.foto;
      }
    });
    $('#btn-tentar').addEventListener('click', enviarInscricao);
    $('#btn-compartilhar').addEventListener('click', compartilhar);
    $('#btn-baixar').addEventListener('click', baixar);
    $('#btn-copiar').addEventListener('click', copiarPerfil);
  }

  async function iniciar() {
    iniciarTextos();
    restaurarFormulario();
    ligarEventos();
    if (navegadorDeApp()) $('#aviso-app').hidden = false;
    if (encerrado()) {
      $('#bloco-cta').hidden = true;
      $('#bloco-encerrado').hidden = false;
    }
    estado.recursos = await Arte.preparar(C);
    agendarDesenho();
  }

  iniciar();
})();
