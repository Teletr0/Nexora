// 6 missões. Cada uma ensina uma armadilha real.
// Strings de código usam \` (escape) para não colidir com template literals.

export const MISSIONS = [
  {
    id: "await",
    title: "Missão 1 · O await esquecido",
    narrative:
      "Você fez o primeiro fetch. Apareceu 'undefined' em vez da lista. " +
      "Encontre o bug e corrija usando async/await.",
    concept:
      "fetch() devolve uma Promise. Sem await, você recebe a Promise, " +
      "não a Response — e res.json() quebra.",
    starter: [
      "async function carregar() {",
      "  const res = fetch(\"/api/usuarios\");   // BUG: falta await",
      "  const data = await res.json();",
      "  return data;",
      "}"
    ].join("\n"),
    entry: "carregar",
    args: "",
    forbidden: /\.then\s*\(/,
    forbiddenMsg:
      "Esta missão é sobre await. Tente resolver sem usar .then() — " +
      "troque fetch(...) por await fetch(...).",
    tests: [
      {
        name: "retorna uma lista (não uma Promise)",
        fn: r => Array.isArray(r),
        failMsg: "O retorno não é array. Veja se res é a Response ou ainda a Promise."
      },
      {
        name: "a lista tem 6 usuários",
        fn: r => Array.isArray(r) && r.length === 6,
        failMsg: "Não veio a lista do Flask. Confirme que /api/usuarios responde."
      },
      {
        name: "cada usuário tem nome (string)",
        fn: r => Array.isArray(r) && r.every(u => u && typeof u.name === "string"),
        failMsg: "Os itens não têm .name — a resposta não é a esperada."
      }
    ],
    hint:
      "Olhe a linha do fetch. Falta uma palavra antes do fetch: " +
      "await. Sem ela, res é uma Promise, não uma Response.",
    solution: [
      "async function carregar() {",
      "  const res = await fetch(\"/api/usuarios\");",
      "  const data = await res.json();",
      "  return data;",
      "}"
    ].join("\n")
  },

  {
    id: "status",
    title: "Missão 2 · O status ignorado",
    narrative:
      "A API respondeu 500 (servidor quebrado) mas o código tentou ler " +
      "o JSON mesmo assim. Corrija para lançar erro quando !res.ok.",
    concept:
      "fetch NÃO lança erro em 4xx/5xx. Ele só falha se a rede cair. " +
      "Você precisa checar response.ok manualmente.",
    starter: [
      "async function carregar() {",
      "  const res = await fetch(\"/api/usuarios?scenario=error\");",
      "  // BUG: falta checar res.ok",
      "  const data = await res.json();",
      "  return data;",
      "}"
    ].join("\n"),
    entry: "carregar",
    args: "",
    tests: [
      {
        name: "lança erro em HTTP 500",
        fn: () => false,
        expectThrow: true,
        failMsg: "Nenhum erro foi lançado. O código leu o JSON mesmo com status 500."
      },
      {
        name: "a mensagem do erro menciona o problema (500/status/erro)",
        fn: () => false,
        expectThrow: true,
        errorMatch: /500|status|erro|falha|http/i,
        failMsg:
          "O erro foi lançado, mas a mensagem não indica o status. " +
          "Use: throw new Error(\"HTTP \" + res.status)"
      }
    ],
    hint:
      "Adicione, depois do fetch e antes do .json(): " +
      "if (!res.ok) throw new Error(\"HTTP \" + res.status);",
    solution: [
      "async function carregar() {",
      "  const res = await fetch(\"/api/usuarios?scenario=error\");",
      "  if (!res.ok) throw new Error(\"HTTP \" + res.status);",
      "  const data = await res.json();",
      "  return data;",
      "}"
    ].join("\n")
  },

  {
    id: "xss",
    title: "Missão 3 · A injeção silenciosa",
    narrative:
      "Um usuário se cadastrou com o nome '<b>Ana</b>'. Seu código " +
      "interpretou o HTML. Corrija para exibir como texto literal.",
    concept:
      "textContent trata tudo como texto. innerHTML interpreta tags — " +
      "e permite XSS (execução de código malicioso).",
    starter: [
      "function renderUser(u) {",
      "  const div = document.createElement(\"div\");",
      "  div.innerHTML = u.name;   // BUG: interpreta HTML",
      "  return div;",
      "}"
    ].join("\n"),
    entry: "renderUser",
    args: '({ name: "<b>Ana</b>", email: "a@b.c" })',
    tests: [
      {
        name: "não cria elemento <b> no DOM (sem interpretar HTML)",
        fn: r => !!r && !r.querySelector("b"),
        failMsg: "A tag <b> foi criada. innerHTML interpretou o HTML."
      },
      {
        name: "o texto '<b>Ana</b>' aparece literalmente",
        fn: r => !!r && r.textContent.includes("<b>Ana</b>"),
        failMsg:
          "O texto não aparece. Cuidado: usar innerHTML='' também não cria <b>, " +
          "mas apaga o conteúdo. Use textContent = u.name."
      },
      {
        name: "o nome completo é exibido (não truncado)",
        fn: r => !!r && r.textContent.trim().length >= "<b>Ana</b>".length,
        failMsg: "O conteúdo foi truncado. Exiba u.name inteiro."
      }
    ],
    hint:
      "Troque div.innerHTML = u.name por div.textContent = u.name. " +
      "textContent nunca interpreta HTML.",
    solution: [
      "function renderUser(u) {",
      "  const div = document.createElement(\"div\");",
      "  div.textContent = u.name;",
      "  return div;",
      "}"
    ].join("\n")
  },

  {
    id: "malformed",
    title: "Missão 4 · O JSON mentiroso",
    narrative:
      "O servidor respondeu 200 OK mas o corpo era texto puro, não JSON. " +
      "Seu código travou com erro técnico ilegível. Corrija para dar " +
      "uma mensagem clara ao usuário.",
    concept:
      "response.json() pode rejeitar quando o corpo não é JSON válido. " +
      "Envolva em try/catch e lance um erro com mensagem clara.",
    starter: [
      "async function carregar() {",
      "  const res = await fetch(\"/api/usuarios?scenario=malformed\");",
      "  if (!res.ok) throw new Error(\"HTTP \" + res.status);",
      "  const data = await res.json();   // BUG: lança SyntaxError cru",
      "  return data;",
      "}"
    ].join("\n"),
    entry: "carregar",
    args: "",
    tests: [
      {
        name: "lança erro",
        fn: () => false,
        expectThrow: true,
        failMsg: "Nenhum erro foi lançado."
      },
      {
        name: "o erro NÃO é um SyntaxError cru do parser",
        fn: () => false,
        expectThrow: true,
        errorNotName: "SyntaxError",
        failMsg:
          "O erro foi o SyntaxError do JSON.parse, não uma mensagem sua. " +
          "Envolva res.json() em try/catch e lance new Error(...)."
      },
      {
        name: "a mensagem menciona JSON/parse/válido (linguagem clara)",
        fn: () => false,
        expectThrow: true,
        errorMatch: /json|parse|v[aá]lid|corpo|resposta/i,
        failMsg:
          "A mensagem do erro não indica o problema real. " +
          "Use: throw new Error(\"Resposta não é JSON válido\")"
      }
    ],
    hint:
      "Envolva só o res.json() em try/catch e lance: " +
      "throw new Error('Resposta não é JSON válido');",
    solution: [
      "async function carregar() {",
      "  const res = await fetch(\"/api/usuarios?scenario=malformed\");",
      "  if (!res.ok) throw new Error(\"HTTP \" + res.status);",
      "  let data;",
      "  try {",
      "    data = await res.json();",
      "  } catch {",
      "    throw new Error(\"Resposta não é JSON válido\");",
      "  }",
      "  return data;",
      "}"
    ].join("\n")
  },

  {
    id: "filter",
    title: "Missão 5 · O filtro quebrado",
    narrative:
      "A busca por 'ana' não encontra 'Ana Beatriz'. O filtro diferencia " +
      "maiúsculas de minúsculas. Corrija para funcionar com qualquer caixa.",
    concept:
      "Comparar strings exige normalizar. toLowerCase() resolve. " +
      "toLocaleLowerCase('pt-BR') também respeita acentos.",
    starter: [
      "function filtrar(usuarios, termo) {",
      "  return usuarios.filter(u => u.name.includes(termo));   // BUG",
      "}"
    ].join("\n"),
    entry: "filtrar",
    args: '([{name:"Ana Beatriz"},{name:"Beto"},{name:"Joana"}], "ana")',
    tests: [
      {
        name: "encontra 'Ana Beatriz' com 'ana'",
        fn: r => Array.isArray(r) && r.some(u => u.name === "Ana Beatriz"),
        failMsg: "Não encontrou 'Ana Beatriz' buscando 'ana'."
      },
      {
        name: "não inclui 'Beto'",
        fn: r => Array.isArray(r) && !r.some(u => u.name === "Beto"),
        failMsg: "'Beto' não deveria aparecer buscando 'ana'."
      },
      {
        name: "encontra 'Joana' também (substring case-insensitive)",
        fn: r => Array.isArray(r) && r.some(u => u.name === "Joana"),
        failMsg:
          "'Joana' contém 'ana' (substring). Se falhou, o filtro está " +
          "comparando nome exato, não substring."
      }
    ],
    extraCalls: [
      {
        args: '([{name:"Ana Beatriz"},{name:"Beto"},{name:"Joana"}], "BET")',
        name: "generaliza: busca 'BET' encontra 'Beto'",
        fn: r => Array.isArray(r) && r.some(u => u.name === "Beto"),
        failMsg: "'BET' deveria encontrar 'Beto'. Não hardcode resultados."
      },
      {
        args: '([{name:"Ana Beatriz"},{name:"Beto"}], "ana")',
        name: "funciona com lista diferente de 3",
        fn: r => Array.isArray(r) && r.length === 1 && r[0].name === "Ana Beatriz",
        failMsg: "Não generaliza: falhou com lista de 2 elementos."
      }
    ],
    hint:
      "Antes do includes, normalize os dois lados: " +
      "termo.toLowerCase() e u.name.toLowerCase().",
    solution: [
      "function filtrar(usuarios, termo) {",
      "  const t = termo.toLowerCase();",
      "  return usuarios.filter(u => u.name.toLowerCase().includes(t));",
      "}"
    ].join("\n")
  },

  {
    id: "real-api",
    title: "Missão Bônus · API pública real (JSONPlaceholder)",
    narrative:
      "Tudo que você aprendeu até aqui também vale para APIs na internet. " +
      "Busque usuários da JSONPlaceholder via nosso proxy Flask " +
      "(para evitar CORS) e retorne a lista completa.",
    concept:
      "O padrão é sempre o mesmo: await fetch, checar res.ok, await res.json, " +
      "validar o formato. Só muda a URL.",
    starter: [
      "async function carregar() {",
      "  const res = fetch(\"/api/externo/usuarios\");   // BUG: falta await",
      "  if (!res.ok) throw new Error(\"HTTP \" + res.status);",
      "  const data = await res.json();",
      "  return data;",
      "}"
    ].join("\n"),
    entry: "carregar",
    args: "",
    forbidden: /\.then\s*\(/,
    forbiddenMsg:
      "Esta missão é sobre await. Use await fetch(...), não .then().",
    tests: [
      {
        name: "retorna uma lista não vazia",
        fn: r => Array.isArray(r) && r.length > 0,
        failMsg: "Não veio lista. Confirme que o proxy /api/externo/usuarios responde."
      },
      {
        name: "cada item tem id (number) e name (string)",
        fn: r => Array.isArray(r) && r.every(u =>
          u && typeof u.id === "number" && typeof u.name === "string"
        ),
        failMsg: "Os itens não têm a estrutura de usuário (id, name)."
      },
      {
        name: "veio de uma API pública real (>= 8 usuários, estrutura real)",
        fn: r => Array.isArray(r) && r.length >= 8 && r.every(u =>
          u && u.email !== undefined && (u.address || u.company || u.phone)
        ),
        failMsg:
          "A resposta parece fabricada. Use o proxy real " +
          "/api/externo/usuarios — a JSONPlaceholder retorna ~10 usuários " +
          "com email, address, company, etc."
      }
    ],
    hint:
      "É o mesmo bug da Missão 1. Adicione await antes do fetch. " +
      "O proxy /api/externo/usuarios é o Flask repassando a JSONPlaceholder.",
    solution: [
      "async function carregar() {",
      "  const res = await fetch(\"/api/externo/usuarios\");",
      "  if (!res.ok) throw new Error(\"HTTP \" + res.status);",
      "  const data = await res.json();",
      "  return data;",
      "}"
    ].join("\n")
  }
];
