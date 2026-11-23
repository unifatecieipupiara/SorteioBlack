# Sorteio Black UniFatecie

Site para o sorteio entre os alunos dos polos. O aluno:

1. **Se identifica** (nome, RA, polo, curso e @ do Instagram) e aceita o regulamento.
2. **Envia a foto** e ajusta o enquadramento no próprio site (arrastar, zoom, girar).
3. **Recebe a arte pronta** no formato stories (1080×1920) com a foto, “ESTUDANTE DE <CURSO>”, nome, polo e o logo. O aluno **concorre com o próprio RA**.
4. **Compartilha nos stories** direto pelo botão do celular e marca o seu perfil.

As inscrições ficam numa **planilha do Google** (um RA = uma inscrição). No dia, o **painel do sorteio** (`sorteio.html`) sorteia com animação, e dá para usar numa live.

---

## O que já está configurado e o que falta

| Item | Situação | Onde fica |
|---|---|---|
| Logo UniFatecie (branco, fundo transparente) | ✅ pronto | `assets/logo.png` |
| Perfil a marcar: **@unifatecie.ipupiara** | ✅ pronto | `js/config.js` → `perfilInstagram` |
| Polos: **Ipupiara-BA** e **Barra do Mendes-BA** | ✅ pronto | `js/config.js` → `polos` **e** `apps-script/Codigo.gs` → `POLOS` |
| Prêmio: **6 camisas UniFatecie (3 por polo)** | ✅ pronto | `js/config.js` → `campanha` |
| Foto das camisas para a tela inicial | ⏳ falta enviar o arquivo | `assets/premio.jpg` (o site já está configurado para mostrar) |
| Lista de cursos (82, em ordem alfabética) | ✅ pronto | `js/config.js` → `cursos` |
| Prazo e data do sorteio | ⏳ revisar | `js/config.js` → `campanha.encerramento` / `dataSorteio` (e `ENCERRAMENTO` no `Codigo.gs`) |
| Texto do regulamento | ⏳ revisar | `js/config.js` → `regulamento` |
| Planilha + URL do Apps Script | ⏳ falta | Passo 1 abaixo → `js/config.js` → `urlBackend` |
| *(Opcional)* Fundo/moldura feitos no Canva | — | `assets/fundo.png` / `assets/moldura.png` |

---

## Passo 1: Planilha (banco de dados)

1. Acesse [sheets.new](https://sheets.new) e crie uma planilha, por exemplo “Sorteio Black – Inscrições”.
2. Menu **Extensões → Apps Script**.
3. Apague o que estiver no editor e cole todo o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
4. No topo do código, ajuste:
   - `CHAVE_ADMIN`: uma senha sua, usada no painel do sorteio.
   - `POLOS`: **exatamente** os mesmos nomes do `js/config.js`.
   - `ENCERRAMENTO`: data/hora limite.
5. Salve (ícone de disquete). Selecione a função **`configurar`** e clique em **Executar**. O Google pede autorização:
   **Revisar permissões → sua conta → Avançado → Acessar (não seguro) → Permitir**.
   (O aviso aparece porque o script é seu e não foi “verificado” pelo Google. É normal.)
6. **Implantar → Nova implantação** → engrenagem → **App da Web**:
   - Executar como: **Eu**
   - Quem pode acessar: **Qualquer pessoa**
7. Clique em **Implantar** e copie a **URL do app da Web** (termina com `/exec`).
8. Cole essa URL em `js/config.js`, no campo `urlBackend`.

> Se a opção “Qualquer pessoa” não aparecer, sua conta institucional bloqueia esse acesso. Use uma conta Gmail pessoal.
>
> **Alterou o `Codigo.gs` depois?** Vá em *Implantar → Gerenciar implantações → lápis → Versão: Nova versão → Implantar*. Assim a URL continua a mesma.

A planilha terá as colunas: **Nº inscrição · Data/hora · Nome · RA · Polo · Curso · Instagram**.

## Passo 2: Ajustar `js/config.js`

Todas as configurações ficam nesse arquivo, com comentários em português. Preencha pelo menos:
`urlBackend`, `perfilInstagram`, `polos`, `cursos`, `campanha.premio`, `campanha.encerramento`, `campanha.dataSorteio`.

## Passo 3: Logo e arte

- Coloque o logo em `assets/logo.png`. Enquanto ele não existir, o site escreve “UniFatecie” em texto no lugar.
- Cores: `arte.corDestaque` (padrão laranja `#FF7A00`).
- Marca d'água do fundo: `arte.textura` (padrão `'BLACK'`; use `''` para tirar).
- Faixa do rodapé: `arte.rodape` (padrão `'@{perfil}'`; use `''` para tirar).

### Usando uma arte do Canva (opcional)

1. No Canva, crie um design **1080 × 1920 px** (Story do Instagram).
2. Monte o fundo e **deixe livre a área da foto**. No padrão ela é um círculo com centro em **x 540, y 770** e raio **300 px**. Deixe livre também a área dos textos, de **y 1130 a 1625**.
3. Exporte como **PNG** e salve como `assets/fundo.png`. Em `config.js`, coloque `fundo: 'assets/fundo.png'`.
4. Se quiser um elemento **por cima** da foto (moldura com o miolo transparente), exporte só ela como PNG com fundo transparente → `assets/moldura.png` e `moldura: 'assets/moldura.png'`.
5. Se o seu design já tiver o logo ou o rodapé, use `logo: ''`, `logoTextoReserva: ''` e/ou `rodape: ''`. Para tirar o anel laranja: `foto.borda: false`.
6. Posições e tamanhos da foto, do logo e dos textos estão em `arte.foto`, `arte.logoPosicao` e `arte.textos`.

## Passo 4: Publicar o site (GitHub Pages, grátis)

O site é só HTML, CSS e JS, então não precisa de servidor.

1. Garanta que os arquivos estejam no branch **`main`** (faça o merge do pull request).
2. No GitHub: **Settings → Pages**.
3. Em *Build and deployment*: **Source: Deploy from a branch** → Branch: **`main`** → pasta **`/ (root)`** → **Save**.
4. Em 1 ou 2 minutos o site fica no ar em:
   **https://unifatecieipupiara.github.io/SorteioBlack/**
   e o painel em **https://unifatecieipupiara.github.io/SorteioBlack/sorteio.html**

A cada alteração enviada ao `main`, o site se atualiza sozinho. O código não guarda senhas: a chave do painel fica só no Apps Script.

## Passo 5: Testar antes de divulgar

1. Abra o site no celular e faça uma inscrição de teste.
2. Confira se a linha apareceu na planilha.
3. Teste **Compartilhar nos stories** (Android e iPhone).
4. Abra `.../sorteio.html`, digite a `CHAVE_ADMIN` e carregue os participantes.
5. **Apague as linhas de teste da planilha** antes de divulgar. Mantenha a linha 1, que é o cabeçalho.

Sem a `urlBackend` configurada, o site funciona em **modo de teste**: gera a arte, mas avisa que não salvou. O painel de sorteio oferece participantes fictícios para ensaio.

---

## No dia do sorteio

1. Abra `sorteio.html` → digite a chave → **Carregar**.
2. Escolha **Polo Ipupiara-BA** no filtro e clique em **Sortear** 3 vezes. Depois troque para **Polo Barra do Mendes-BA** e sorteie mais 3. A opção “Não sortear quem já ganhou” vem marcada.
3. Use **Tela cheia** para mostrar na live. O sorteio usa gerador aleatório criptográfico.
4. Antes de anunciar, **confira se o @ sorteado marcou o seu perfil**. Toda menção em story chega nas suas **mensagens (Direct)** do Instagram. Confira também o RA no sistema acadêmico.

## Dicas

- **Divulgação:** link na bio, sticker de link nos stories, grupos de WhatsApp das turmas e um QR Code impresso nos polos.
- **Navegador do Instagram:** quem abre o link pelo Instagram cai no navegador interno, que às vezes não salva imagens. O site detecta isso e sugere “Abrir no navegador”. Também dá para salvar segurando o dedo na imagem.
- **Stories somem em 24 h:** acompanhe as menções durante a campanha, não só no dia do sorteio.
- **LGPD:** o aluno aceita o uso dos dados só para o sorteio. Depois do resultado, apague ou arquive a planilha.

## Estrutura

```
index.html            Site do aluno
sorteio.html          Painel do sorteio (organizador)
css/style.css         Visual do site
css/sorteio.css       Visual do painel
js/config.js          ← TODAS as configurações
js/arte.js            Desenho da arte (canvas)
js/app.js             Fluxo do site (formulário, foto, envio, compartilhar)
js/sorteio.js         Lógica do painel
apps-script/Codigo.gs Backend da planilha (colar no Apps Script)
assets/               logo.png, fundo.png, moldura.png
```
