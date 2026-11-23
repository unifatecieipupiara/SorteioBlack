/* Desenho da arte (formato stories) em <canvas>. */
(function () {
  'use strict';

  const FONTE = "Montserrat, 'Segoe UI', Arial, sans-serif";
  const cacheImagens = new Map();
  let cacheLayout = { chave: '', valor: null };

  // ---------- utilidades ----------
  function carregarImagem(src) {
    if (!src) return Promise.resolve(null);
    if (cacheImagens.has(src)) return cacheImagens.get(src);
    const p = new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => {
        console.warn('[arte] não foi possível carregar a imagem:', src);
        resolve(null);
      };
      img.src = src;
    });
    cacheImagens.set(src, p);
    return p;
  }

  async function carregarFontes() {
    if (!document.fonts || !document.fonts.load) return;
    const pesos = ['500', '600', '700', '800', '900'];
    try {
      await Promise.race([
        Promise.all(pesos.map((p) => document.fonts.load(`${p} 40px Montserrat`, 'ÁÉÍÓÚÇÃÕ'))),
        new Promise((r) => setTimeout(r, 5000)),
      ]);
    } catch (e) {
      /* segue com a fonte reserva */
    }
  }

  function rgba(hex, alfa) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alfa})`;
  }

  function clarear(hex, qtd) {
    let h = String(hex).replace('#', '');
    if (h.length === 3) h = h.split('').map((c) => c + c).join('');
    const n = parseInt(h, 16) || 0;
    const mix = (v) => Math.round(v + (255 - v) * qtd);
    return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
  }

  function fonte(peso, tam) {
    return `${peso} ${tam}px ${FONTE}`;
  }

  function retanguloArredondado(ctx, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function caminhoFoto(ctx, F, extra) {
    extra = extra || 0;
    if (F.formato === 'retangulo') {
      retanguloArredondado(
        ctx,
        F.x - F.largura / 2 - extra,
        F.y - F.altura / 2 - extra,
        F.largura + extra * 2,
        F.altura + extra * 2,
        F.cantos + extra
      );
    } else {
      ctx.beginPath();
      ctx.arc(F.x, F.y, F.raio + extra, 0, Math.PI * 2);
    }
  }

  function caixaFoto(F) {
    return F.formato === 'retangulo'
      ? { w: F.largura, h: F.altura }
      : { w: F.raio * 2, h: F.raio * 2 };
  }

  // Texto com espaçamento entre letras (centralizado em x)
  function textoEspacado(ctx, texto, x, y, espaco) {
    const chars = Array.from(texto);
    const larguras = chars.map((c) => ctx.measureText(c).width);
    const total = larguras.reduce((a, b) => a + b, 0) + espaco * (chars.length - 1);
    let cx = x - total / 2;
    const alinhamento = ctx.textAlign;
    ctx.textAlign = 'left';
    chars.forEach((c, i) => {
      ctx.fillText(c, cx, y);
      cx += larguras[i] + espaco;
    });
    ctx.textAlign = alinhamento;
    return total;
  }

  function quebrarLinhas(ctx, texto, larguraMax) {
    const palavras = texto.split(/\s+/).filter(Boolean);
    const linhas = [];
    let atual = '';
    palavras.forEach((p) => {
      const teste = atual ? atual + ' ' + p : p;
      if (atual && ctx.measureText(teste).width > larguraMax) {
        linhas.push(atual);
        atual = p;
      } else {
        atual = teste;
      }
    });
    if (atual) linhas.push(atual);
    return linhas;
  }

  function ajustarBloco(ctx, texto, larguraMax, alturaMax, tamMax, tamMin, maxLinhas, peso) {
    for (let tam = tamMax; tam >= tamMin; tam -= 2) {
      ctx.font = fonte(peso, tam);
      const linhas = quebrarLinhas(ctx, texto, larguraMax);
      const alturaLinha = tam * 1.06;
      const altura = linhas.length * alturaLinha;
      const cabe = linhas.every((l) => ctx.measureText(l).width <= larguraMax);
      if (linhas.length <= maxLinhas && altura <= alturaMax && cabe) {
        return { tam, linhas, alturaLinha, altura };
      }
    }
    ctx.font = fonte(peso, tamMin);
    let linhas = quebrarLinhas(ctx, texto, larguraMax).slice(0, maxLinhas);
    linhas = linhas.map((l) => reticencias(ctx, l, larguraMax));
    const alturaLinha = tamMin * 1.06;
    return { tam: tamMin, linhas, alturaLinha, altura: linhas.length * alturaLinha };
  }

  function reticencias(ctx, texto, larguraMax) {
    if (ctx.measureText(texto).width <= larguraMax) return texto;
    let t = texto;
    while (t.length > 1 && ctx.measureText(t + '…').width > larguraMax) t = t.slice(0, -1);
    return t.trimEnd() + '…';
  }

  function ajustarLinha(ctx, texto, larguraMax, tamMax, tamMin, peso) {
    for (let tam = tamMax; tam >= tamMin; tam -= 2) {
      ctx.font = fonte(peso, tam);
      if (ctx.measureText(texto).width <= larguraMax) return { tam, texto };
    }
    ctx.font = fonte(peso, tamMin);
    return { tam: tamMin, texto: reticencias(ctx, texto, larguraMax) };
  }

  function alturaMaiuscula(ctx) {
    const m = ctx.measureText('H');
    return m.actualBoundingBoxAscent || parseFloat(ctx.font) * 0.72;
  }

  // ---------- ajuste da foto ----------
  function dimensoesFoto(A, foto, ajuste) {
    const caixa = caixaFoto(A.foto);
    const girada = ajuste.rot % 180 !== 0;
    const iw = girada ? foto.height : foto.width;
    const ih = girada ? foto.width : foto.height;
    const base = Math.max(caixa.w / iw, caixa.h / ih);
    const escala = base * ajuste.zoom;
    return { caixa, escala, dw: iw * escala, dh: ih * escala };
  }

  // Garante que a foto sempre cubra todo o espaço da moldura
  function limitarAjuste(A, foto, ajuste) {
    if (!foto) return ajuste;
    const d = dimensoesFoto(A, foto, ajuste);
    const mx = Math.max(0, (d.dw - d.caixa.w) / 2);
    const my = Math.max(0, (d.dh - d.caixa.h) / 2);
    ajuste.dx = Math.max(-mx, Math.min(mx, ajuste.dx));
    ajuste.dy = Math.max(-my, Math.min(my, ajuste.dy));
    return ajuste;
  }

  // ---------- camadas ----------
  function desenharFundoPadrao(ctx, A) {
    const W = A.largura;
    const H = A.altura;
    const cor = A.corDestaque;

    ctx.fillStyle = '#060606';
    ctx.fillRect(0, 0, W, H);

    const brilho = (x, y, r, alfa) => {
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, rgba(cor, alfa));
      g.addColorStop(1, rgba(cor, 0));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    };
    brilho(W * 0.12, H * 0.1, 760, 0.2);
    brilho(W * 1.0, H * 0.55, 820, 0.14);
    brilho(W * 0.05, H * 0.98, 700, 0.12);

    // Textura com uma palavra em contorno (marca d'água)
    if (A.textura) desenharTextura(ctx, A);

    // Vinheta para destacar o centro
    const v = ctx.createRadialGradient(W / 2, H * 0.45, H * 0.25, W / 2, H * 0.45, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    ctx.fillStyle = v;
    ctx.fillRect(0, 0, W, H);
  }

  function desenharTextura(ctx, A) {
    const W = A.largura;
    const H = A.altura;
    const palavra = String(A.textura).toUpperCase();
    ctx.save();
    ctx.translate(W / 2, H / 2);
    ctx.rotate(-0.21);
    ctx.font = fonte(900, 300);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.055)';
    for (let i = -4; i <= 4; i++) {
      const desloc = i % 2 === 0 ? 0 : 420;
      ctx.strokeText([palavra, palavra, palavra].join(' '), desloc, i * 300);
    }
    ctx.restore();
  }

  function desenharBordaFoto(ctx, A) {
    const F = A.foto;
    const cor = A.corDestaque;
    ctx.save();
    // brilho
    ctx.shadowColor = rgba(cor, 0.55);
    ctx.shadowBlur = 70;
    caminhoFoto(ctx, F, 14);
    ctx.lineWidth = 14;
    const g = ctx.createLinearGradient(F.x - 400, F.y - 400, F.x + 400, F.y + 400);
    g.addColorStop(0, clarear(cor, 0.45));
    g.addColorStop(0.5, cor);
    g.addColorStop(1, clarear(cor, 0.15));
    ctx.strokeStyle = g;
    ctx.stroke();
    ctx.restore();

    // anel pontilhado externo
    ctx.save();
    caminhoFoto(ctx, F, 46);
    ctx.setLineDash([3, 17]);
    ctx.lineCap = 'round';
    ctx.lineWidth = 5;
    ctx.strokeStyle = rgba(cor, 0.6);
    ctx.stroke();
    ctx.restore();
  }

  function desenharFoto(ctx, A, foto, ajuste) {
    const F = A.foto;
    ctx.save();
    caminhoFoto(ctx, F, 0);
    ctx.clip();
    if (!foto) {
      ctx.fillStyle = '#161616';
      ctx.fillRect(0, 0, A.largura, A.altura);
      const c = caixaFoto(F);
      const r = Math.min(c.w, c.h) / 2;
      ctx.fillStyle = '#2a2a2a';
      ctx.beginPath();
      ctx.arc(F.x, F.y - r * 0.28, r * 0.3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(F.x, F.y + r * 0.62, r * 0.6, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#8a8a8a';
      ctx.font = fonte(700, 38);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('TOQUE PARA ENVIAR', F.x, F.y + r * 0.2);
      ctx.fillText('SUA FOTO', F.x, F.y + r * 0.2 + 48);
    } else {
      const d = dimensoesFoto(A, foto, ajuste);
      ctx.translate(F.x + ajuste.dx, F.y + ajuste.dy);
      ctx.rotate((ajuste.rot * Math.PI) / 180);
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(foto, (-foto.width * d.escala) / 2, (-foto.height * d.escala) / 2, foto.width * d.escala, foto.height * d.escala);
    }
    ctx.restore();
  }

  function desenharLogo(ctx, A, logo) {
    const L = A.logoPosicao;
    if (logo) {
      const s = Math.min(L.larguraMax / logo.width, L.alturaMax / logo.height);
      const w = logo.width * s;
      const h = logo.height * s;
      ctx.drawImage(logo, L.x - w / 2, L.y, w, h);
    } else if (A.logoTextoReserva) {
      ctx.save();
      ctx.fillStyle = A.corTexto;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const aj = ajustarLinha(ctx, A.logoTextoReserva, L.larguraMax, 92, 40, 800);
      ctx.font = fonte(800, aj.tam);
      ctx.fillText(aj.texto, L.x, L.y + L.alturaMax / 2);
      ctx.restore();
    }
  }

  function calcularLayoutTextos(ctx, A, dados) {
    const T = A.textos;
    const fontesProntas = document.fonts ? document.fonts.status : '';
    const chave = JSON.stringify([dados.curso, dados.nome, dados.polo, T, fontesProntas]);
    if (cacheLayout.chave === chave) return cacheLayout.valor;

    const itens = [];
    const tamRotulo = 46;
    ctx.font = fonte(700, tamRotulo);
    itens.push({ tipo: 'rotulo', texto: T.rotulo, tam: tamRotulo, peso: 700, h: alturaMaiuscula(ctx), antes: 0 });

    let fixo = itens[0].h;
    const extras = [];
    if (T.mostrarNome && dados.nome) {
      const aj = ajustarLinha(ctx, dados.nome, T.larguraMax, 52, 32, 600);
      ctx.font = fonte(600, aj.tam);
      extras.push({ tipo: 'nome', texto: aj.texto, tam: aj.tam, peso: 600, h: alturaMaiuscula(ctx), antes: 58 });
    }
    if (T.mostrarPolo && dados.polo) {
      const texto = dados.polo.toUpperCase();
      const aj = ajustarLinha(ctx, texto, T.larguraMax, 34, 24, 600);
      ctx.font = fonte(600, aj.tam);
      extras.push({ tipo: 'polo', texto: aj.texto, tam: aj.tam, peso: 600, h: alturaMaiuscula(ctx), antes: extras.length ? 26 : 50 });
    }
    extras.forEach((e) => (fixo += e.antes + e.h));

    const antesCurso = 40;
    const disponivel = T.base - T.topo - fixo - antesCurso;
    const curso = (dados.curso || 'SEU CURSO').toUpperCase();
    const bloco = ajustarBloco(ctx, curso, T.larguraMax, Math.max(disponivel, 120), 124, 54, 3, 900);
    ctx.font = fonte(900, bloco.tam);
    const capCurso = alturaMaiuscula(ctx);
    const hCurso = capCurso + (bloco.linhas.length - 1) * bloco.alturaLinha;
    itens.push({ tipo: 'curso', linhas: bloco.linhas, tam: bloco.tam, alturaLinha: bloco.alturaLinha, cap: capCurso, h: hCurso, antes: antesCurso });
    extras.forEach((e) => itens.push(e));

    const total = itens.reduce((s, it) => s + it.antes + it.h, 0);
    let y = T.topo + Math.max(0, (T.base - T.topo - total) / 2);
    itens.forEach((it) => {
      y += it.antes;
      it.topo = y;
      y += it.h;
    });

    cacheLayout = { chave, valor: itens };
    return itens;
  }

  function desenharTextos(ctx, A, dados) {
    const T = A.textos;
    const itens = calcularLayoutTextos(ctx, A, dados);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    itens.forEach((it) => {
      if (it.tipo === 'rotulo') {
        ctx.font = fonte(it.peso, it.tam);
        ctx.fillStyle = A.corDestaque;
        textoEspacado(ctx, it.texto, T.x, it.topo + it.h, 12);
      } else if (it.tipo === 'curso') {
        ctx.font = fonte(900, it.tam);
        ctx.fillStyle = A.corTexto;
        ctx.shadowColor = 'rgba(0,0,0,0.45)';
        ctx.shadowBlur = 18;
        it.linhas.forEach((l, i) => ctx.fillText(l, T.x, it.topo + it.cap + i * it.alturaLinha));
        ctx.shadowBlur = 0;
      } else if (it.tipo === 'nome') {
        ctx.font = fonte(it.peso, it.tam);
        ctx.fillStyle = A.corTexto;
        ctx.fillText(it.texto, T.x, it.topo + it.h);
      } else if (it.tipo === 'polo') {
        ctx.font = fonte(it.peso, it.tam);
        ctx.fillStyle = A.corTextoSecundario;
        textoEspacado(ctx, it.texto, T.x, it.topo + it.h, 5);
      }
    });
    ctx.restore();
  }

  function desenharRodape(ctx, A, perfil) {
    if (!A.rodape) return;
    const texto = A.rodape.replace('{perfil}', perfil || '');
    ctx.save();
    ctx.font = fonte(700, 34);
    const espaco = 4;
    const chars = Array.from(texto);
    const largura = chars.reduce((s, c) => s + ctx.measureText(c).width, 0) + espaco * (chars.length - 1);
    const w = Math.min(A.largura - 80, largura + 90);
    const h = 80;
    const x = A.largura / 2 - w / 2;
    const y = A.rodapeY - h / 2;
    retanguloArredondado(ctx, x, y, w, h, h / 2);
    ctx.fillStyle = A.corDestaque;
    ctx.fill();
    ctx.fillStyle = '#0a0a0a';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    textoEspacado(ctx, texto, A.largura / 2, A.rodapeY + 2, espaco);
    ctx.restore();
  }

  /**
   * Desenha a arte completa.
   * @param {CanvasRenderingContext2D} ctx
   * @param {object} config   CONFIG completo
   * @param {object} recursos { fundo, moldura, logo }
   * @param {object} dados    { nome, curso, polo }
   * @param {HTMLCanvasElement|HTMLImageElement|null} foto
   * @param {object} ajuste   { zoom, dx, dy, rot }
   */
  function desenhar(ctx, config, recursos, dados, foto, ajuste) {
    const A = config.arte;
    ctx.clearRect(0, 0, A.largura, A.altura);
    if (recursos.fundo) {
      ctx.drawImage(recursos.fundo, 0, 0, A.largura, A.altura);
    } else {
      desenharFundoPadrao(ctx, A);
    }
    if (A.foto.borda && !recursos.moldura) desenharBordaFoto(ctx, A);
    desenharFoto(ctx, A, foto, ajuste);
    if (recursos.moldura) ctx.drawImage(recursos.moldura, 0, 0, A.largura, A.altura);
    desenharTextos(ctx, A, dados);
    desenharLogo(ctx, A, recursos.logo);
    desenharRodape(ctx, A, config.perfilInstagram);
  }

  async function preparar(config) {
    const A = config.arte;
    const [fundo, moldura, logo] = await Promise.all([
      carregarImagem(A.fundo),
      carregarImagem(A.moldura),
      carregarImagem(A.logo),
      carregarFontes(),
    ]);
    cacheLayout = { chave: '', valor: null };
    return { fundo, moldura, logo };
  }

  window.Arte = { preparar, desenhar, limitarAjuste };
})();
