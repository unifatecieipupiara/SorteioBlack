/**
 * BACKEND DO SORTEIO BLACK — Google Planilhas + Apps Script
 *
 * Como usar (passo a passo completo no README):
 *  1. Crie uma planilha no Google Drive.
 *  2. Menu Extensões > Apps Script. Apague o conteúdo e cole este arquivo.
 *  3. Troque a CHAVE_ADMIN abaixo e confira os POLOS (iguais ao site).
 *  4. Implantar > Nova implantação > Tipo "App da Web"
 *     - Executar como: Eu
 *     - Quem pode acessar: Qualquer pessoa
 *  5. Copie a URL (termina com /exec) e cole em js/config.js -> urlBackend.
 *
 * Sempre que alterar este código: Implantar > Gerenciar implantações >
 * editar (lápis) > Versão: "Nova versão" > Implantar. A URL continua a mesma.
 */

var CONFIG = {
  NOME_ABA: 'Inscrições',
  // Senha do painel de sorteio (sorteio.html). TROQUE antes de implantar!
  CHAVE_ADMIN: 'TROQUE-ESTA-CHAVE',
  // Precisa ser exatamente igual à lista "polos" do js/config.js
  POLOS: ['Polo Ipupiara-BA', 'Polo Barra do Mendes-BA'],
  // Data/hora limite para inscrições ('' = sem limite)
  ENCERRAMENTO: '2026-11-30T23:59:00-03:00',
};

var CABECALHO = ['Nº inscrição', 'Data/hora', 'Nome', 'RA', 'Polo', 'Curso', 'Instagram'];
var COL = { NUMERO: 0, DATA: 1, NOME: 2, RA: 3, POLO: 4, CURSO: 5, INSTAGRAM: 6 };

// ------------------------------------------------------------------
// Entradas HTTP
// ------------------------------------------------------------------
function doPost(e) {
  try {
    var dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (dados.acao === 'inscrever') return responder(inscrever(dados));
    return responder({ ok: false, erro: 'Ação inválida.' });
  } catch (err) {
    console.error(err);
    return responder({ ok: false, erro: 'Erro no servidor. Tente novamente em instantes.' });
  }
}

function doGet(e) {
  var p = (e && e.parameter) || {};
  if (p.acao === 'listar') {
    if (!p.chave || p.chave !== CONFIG.CHAVE_ADMIN) {
      return responder({ ok: false, erro: 'Chave de administrador incorreta.' });
    }
    return responder({ ok: true, participantes: listar() });
  }
  return responder({ ok: true, status: 'online' });
}

function responder(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// ------------------------------------------------------------------
// Inscrição
// ------------------------------------------------------------------
function inscrever(d) {
  if (CONFIG.ENCERRAMENTO && new Date() > new Date(CONFIG.ENCERRAMENTO)) {
    return { ok: false, erro: 'As inscrições foram encerradas.' };
  }

  var nome = limpar(d.nome, 120);
  var ra = String(d.ra || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  var polo = limpar(d.polo, 80);
  var curso = limpar(d.curso, 120);
  var instagram = String(d.instagram || '').replace(/^@+/, '').trim().toLowerCase();

  if (nome.split(' ').length < 2) return { ok: false, erro: 'Informe o nome completo.' };
  if (!/^[A-Z0-9]{4,20}$/.test(ra)) return { ok: false, erro: 'RA inválido.' };
  if (CONFIG.POLOS.indexOf(polo) === -1) return { ok: false, erro: 'Polo inválido.' };
  if (curso.length < 3) return { ok: false, erro: 'Informe o curso.' };
  if (!/^[a-z0-9._]{1,30}$/.test(instagram)) return { ok: false, erro: 'Instagram inválido.' };

  var trava = LockService.getScriptLock();
  trava.waitLock(25000);
  try {
    var aba = obterAba();
    var ultima = aba.getLastRow();
    var maior = 0;
    if (ultima > 1) {
      var linhas = aba.getRange(2, 1, ultima - 1, CABECALHO.length).getValues();
      for (var i = 0; i < linhas.length; i++) {
        if (String(linhas[i][COL.RA]).toUpperCase() === ra) {
          return { ok: true, numero: Number(linhas[i][COL.NUMERO]) || null, jaInscrito: true };
        }
        var n = Number(linhas[i][COL.NUMERO]) || 0;
        if (n > maior) maior = n;
      }
    }
    var numero = maior + 1;
    aba.appendRow([numero, new Date(), seguro(nome), ra, seguro(polo), seguro(curso), instagram]);
    SpreadsheetApp.flush();
    return { ok: true, numero: numero, jaInscrito: false };
  } finally {
    trava.releaseLock();
  }
}

// ------------------------------------------------------------------
// Listagem (painel de sorteio)
// ------------------------------------------------------------------
function listar() {
  var aba = obterAba();
  var ultima = aba.getLastRow();
  if (ultima < 2) return [];
  var tz = Session.getScriptTimeZone();
  return aba
    .getRange(2, 1, ultima - 1, CABECALHO.length)
    .getValues()
    .filter(function (l) { return l[COL.RA]; })
    .map(function (l) {
      return {
        numero: Number(l[COL.NUMERO]) || 0,
        data: l[COL.DATA] instanceof Date ? Utilities.formatDate(l[COL.DATA], tz, 'dd/MM/yyyy HH:mm') : String(l[COL.DATA]),
        nome: String(l[COL.NOME]),
        ra: String(l[COL.RA]),
        polo: String(l[COL.POLO]),
        curso: String(l[COL.CURSO]),
        instagram: String(l[COL.INSTAGRAM]),
      };
    });
}

// ------------------------------------------------------------------
// Utilidades
// ------------------------------------------------------------------
function obterAba() {
  var planilha = SpreadsheetApp.getActiveSpreadsheet();
  var aba = planilha.getSheetByName(CONFIG.NOME_ABA);
  if (!aba) {
    aba = planilha.insertSheet(CONFIG.NOME_ABA);
    aba.getRange(1, 1, 1, CABECALHO.length).setValues([CABECALHO]).setFontWeight('bold');
    aba.setFrozenRows(1);
    // RA e Instagram como texto (mantém zeros à esquerda)
    aba.getRange('D:D').setNumberFormat('@');
    aba.getRange('G:G').setNumberFormat('@');
    aba.getRange('B:B').setNumberFormat('dd/mm/yyyy hh:mm');
  }
  return aba;
}

function limpar(v, max) {
  return String(v || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

// Evita que um texto seja interpretado como fórmula na planilha
function seguro(v) {
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

// Execute uma vez pelo editor (botão "Executar") para criar a aba e autorizar o script.
function configurar() {
  obterAba();
  Logger.log('Aba "' + CONFIG.NOME_ABA + '" pronta.');
}
