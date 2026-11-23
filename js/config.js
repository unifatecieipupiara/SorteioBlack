/* =====================================================================
   CONFIGURAÇÕES DO SORTEIO — edite somente este arquivo.
   Tudo que aparece entre aspas pode ser trocado à vontade.
   ===================================================================== */
window.CONFIG = {
  // ---------------------------------------------------------------
  // 1) BANCO DE DADOS
  // Cole aqui a URL do Google Apps Script (termina com /exec).
  // Enquanto estiver vazio, o site roda em "modo de teste" e NÃO salva
  // as inscrições.
  // ---------------------------------------------------------------
  urlBackend: '',

  // ---------------------------------------------------------------
  // 2) CAMPANHA
  // ---------------------------------------------------------------
  campanha: {
    selo: 'Exclusivo para alunos dos polos Barra do Mendes e Ipupiara',
    titulo: 'Sorteio Black UniFatecie',
    subtitulo: 'Crie sua arte de estudante, poste nos stories e concorra!',
    premio: '6 camisas UniFatecie',
    premioDetalhe: '3 camisas para cada polo',
    // Foto do prêmio exibida na tela inicial (se o arquivo não existir, o site mostra sem foto)
    imagemPremio: 'assets/premio.jpg',
    legendaImagemPremio: 'Imagem ilustrativa',
    // Depois desta data/hora o site para de aceitar inscrições.
    // Formato: AAAA-MM-DDTHH:MM:SS-03:00 (horário de Brasília). Deixe '' para não encerrar.
    encerramento: '2026-11-30T23:59:00-03:00',
    dataSorteio: '01/12/2026',
  },

  // Perfil que o aluno deve marcar nos stories (sem o @)
  perfilInstagram: 'unifatecie.ipupiara',

  // Os dois polos (o texto aparece igual na arte e na planilha)
  polos: ['Polo Ipupiara-BA', 'Polo Barra do Mendes-BA'],

  // Lista de cursos (aparece nesta ordem no formulário)
  cursos: [
    'Administração',
    'Agente Comunitário',
    'Análise e Desenvolvimento de Sistemas',
    'Arquitetura e Urbanismo',
    'Artes',
    'Artes Visuais',
    'Biblioteconomia',
    'Biomedicina',
    'Ciência do Futuro',
    'Ciências Biológicas – Bacharelado',
    'Ciências Biológicas – Licenciatura',
    'Ciências Contábeis',
    'Ciências Econômicas',
    'Comércio Exterior',
    'Design de Interiores',
    'Design de Moda',
    'Design de Produto',
    'Design Gráfico',
    'Educação Especial',
    'Educação Física – Bacharelado',
    'Educação Física – Licenciatura',
    'Engenharia Agronômica (Agronomia)',
    'Engenharia Ambiental e Sanitária',
    'Engenharia Civil',
    'Engenharia da Computação',
    'Engenharia de Produção',
    'Engenharia de Software',
    'Engenharia Elétrica',
    'Engenharia Mecânica',
    'Estética e Cosmética',
    'Estudos Teóricos Psicanalíticos e Sociais',
    'Farmácia',
    'Filosofia',
    'Fisioterapia',
    'Fonoaudiologia',
    'Gastronomia',
    'Geografia',
    'Gestão Ambiental',
    'Gestão Comercial',
    'Gestão da Produção Industrial',
    'Gestão da Qualidade',
    'Gestão de Recursos Humanos',
    'Gestão de Segurança Privada',
    'Gestão do Agronegócio',
    'Gestão Financeira',
    'Gestão Hospitalar',
    'Gestão Pública',
    'História',
    'Hotelaria',
    'Inteligência Artificial e Machine Learning',
    'Investigação Forense e Perícia Criminal',
    'Jogos Digitais',
    'Jornalismo',
    'Letras (Português/Inglês)',
    'Letras (Português/Libras)',
    'Logística',
    'Marketing',
    'Matemática',
    'Música',
    'Negócios Imobiliários',
    'Nutrição',
    'Pedagogia',
    'Podologia',
    'Processos Escolares',
    'Processos Gerenciais',
    'Processos Químicos',
    'Produção Publicitária',
    'Psicopedagogia',
    'Publicidade e Propaganda',
    'Química',
    'Radiologia',
    'Secretariado',
    'Segurança da Informação',
    'Segurança do Trabalho',
    'Segurança Pública',
    'Serviço Social',
    'Sistemas de Informação',
    'Sistemas para Internet',
    'Sociologia',
    'Teologia',
    'Terapia Ocupacional',
    'Terapias Integrativas e Complementares',
  ],
  // true = mostra a opção "Outro curso" com campo para digitar
  permitirOutroCurso: false,

  // Regras exibidas no site (botão "Regulamento")
  regulamento: [
    'Podem participar alunos matriculados nos polos Ipupiara-BA e Barra do Mendes-BA.',
    'Serão sorteadas 6 camisas UniFatecie: 3 entre os alunos do Polo Ipupiara-BA e 3 entre os alunos do Polo Barra do Mendes-BA.',
    'Cada aluno participa uma única vez, identificado pelo RA. No sorteio, o ganhador é identificado pelo RA.',
    'Para valer, é obrigatório publicar a arte nos stories do Instagram marcando o perfil indicado, até a data de encerramento.',
    'O story precisa ficar no ar por 24 horas. Contas que não marcarem o perfil serão desclassificadas.',
    'O sorteio será realizado na data informada e o ganhador será contatado pelo Instagram.',
    'Os dados informados (nome, RA, polo, curso e @ do Instagram) serão usados apenas para este sorteio.',
  ],

  // ---------------------------------------------------------------
  // 3) ARTE (formato stories 1080 x 1920)
  // ---------------------------------------------------------------
  arte: {
    largura: 1080,
    altura: 1920,

    // Fundo feito no Canva (PNG/JPG 1080x1920). Ex.: 'assets/fundo.png'
    // Vazio = usa o fundo preto padrão do site.
    fundo: '',

    // Moldura feita no Canva, desenhada POR CIMA da foto
    // (PNG com o espaço da foto transparente). Ex.: 'assets/moldura.png'
    moldura: '',

    // Logo da UniFatecie (de preferência PNG claro, fundo transparente)
    logo: 'assets/logo.png',
    logoPosicao: { x: 540, y: 215, larguraMax: 560, alturaMax: 165 },
    logoTextoReserva: 'UniFatecie', // usado se o arquivo do logo não existir

    corDestaque: '#FF7A00',

    // Palavra repetida em contorno no fundo padrão (marca d'água). '' = sem textura
    textura: 'BLACK',
    corTexto: '#FFFFFF',
    corTextoSecundario: '#C9C9C9',

    // Área da foto do aluno.
    // formato: 'circulo' (usa raio) ou 'retangulo' (usa largura, altura e cantos)
    foto: {
      formato: 'circulo',
      x: 540, // centro
      y: 770, // centro
      raio: 300,
      largura: 640,
      altura: 760,
      cantos: 48,
      borda: true, // anel laranja em volta da foto
    },

    // Bloco de textos (fica centralizado verticalmente entre "topo" e "base")
    textos: {
      x: 540,
      topo: 1130,
      base: 1625,
      larguraMax: 940,
      rotulo: 'ESTUDANTE DE',
      mostrarNome: true,
      mostrarPolo: true,
    },

    // Faixa no rodapé da arte. Use {perfil} para inserir o @. Vazio = sem faixa.
    rodape: '@{perfil}',
    rodapeY: 1695,
  },
};
