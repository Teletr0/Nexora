// Dados dos quizzes por conceito.
// correct: índice da resposta certa (0, 1 ou 2)
// fb: feedback específico por alternativa.

export const QUIZZES = {
  dom: {
    correct: 1,
    fb: [
      "Não é linguagem — HTML é marcação, DOM é a árvore de objetos " +
      "que o navegador constrói a partir dele.",
      "Exato! O DOM é a representação viva do HTML. JS manipula essa árvore.",
      "Não é banco — é uma estrutura em memória que desaparece ao fechar a aba."
    ]
  },
  api: {
    correct: 1,
    fb: [
      "JSON é só um formato. A API é o contrato — pode devolver JSON, " +
      "texto, imagem ou binário.",
      "Certo! API é o contrato: URL + formato + comportamento.",
      "Não é framework — API não tem nada a ver com bibliotecas de código."
    ]
  },
  promise: {
    correct: 1,
    fb: [
      "Não. Sem await, você tem a Promise — não os dados. " +
      "Os dados só chegam quando ela resolver.",
      "Isso! fetch() retorna uma Promise imediatamente. " +
      "await é o que extrai o valor.",
      "Não lança erro imediato. Erros de rede rejeitam a Promise; " +
      "erros HTTP são detectados via res.ok."
    ]
  },
  fetch: {
    correct: 1,
    fb: [
      "Isso é o erro #1. fetch NÃO rejeita em 4xx/5xx — só em falha de rede.",
      "Correto! fetch entrega a Response normalmente. " +
      "Você checa res.ok para saber se o status é 2xx.",
      "Não retorna null — retorna uma Response com ok=false e status=500."
    ]
  },
  json: {
    correct: 1,
    fb: [
      "Não. O navegador não converte automático — o corpo chega como texto.",
      "Exato! JSON.parse ou response.json() interpreta o texto e devolve objeto.",
      "Não. Atribuir string a variável mantém string. " +
      "Precisa parse para virar objeto."
    ]
  }
};
