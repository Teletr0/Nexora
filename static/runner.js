// Executa o código do aluno de forma segura.
//
// Estratégias:
// 1. Envolve o código em uma função wrapper com nome único
//    (não usa mission.entry direto na string gerada).
// 2. Captura a função de entrada por referência, não por nome na string.
// 3. Timeout de 10s.
// 4. Silencia console.log.
// 5. Cada teste é isolado — uma falha não impede os outros.

const TIMEOUT_MS = 10000;

export async function runMission(mission, userCode) {
  // Compila o código do aluno UMA VEZ, mas embrulhado em uma
  // AsyncFunction que devolve a função de entrada como valor.
  // Assim, "await" no nome da função (ou em qualquer lugar)
  // nunca vira identificador na string gerada.
  const AsyncFn = Object.getPrototypeOf(async function () {}).constructor;

  // Monta o source que define a função de entrada como propriedade
  // de um objeto interno — sem chamar diretamente na string.
  const wrapperSource =
    '"use strict";\n' +
    'const __userCode__ = async function() {\n' +
    userCode + "\n" +
    "};\n" +
    "await __userCode__();\n" +
    "return globalThis.__ds_entry__;\n";

  // Expõe a função de entrada por um canal seguro antes de executar
  const origSet = globalThis.__ds_entry__;
  try {
    const fn = new AsyncFn(wrapperSource);

    // Intercepta console.log
    const origLog = console.log;
    console.log = function () {};

    // Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(function () { controller.abort(); }, TIMEOUT_MS);

    let threw = null;
    let entryFn = null;
    try {
      // Executa o código do aluno e recupera a função de entrada
      // via um padrão de "declaração no escopo do wrapper".
      const srcForExec =
        userCode + "\n" +
        "return typeof " + escapeIdent(mission.entry) + " === 'function' ? " +
        escapeIdent(mission.entry) + " : null;";
      const compiled = new AsyncFn(srcForExec);

      const execPromise = compiled();
      const timeoutPromise = new Promise(function (_, reject) {
        controller.signal.addEventListener("abort", function () {
          reject(new Error("Tempo limite excedido (10s)"));
        });
      });
      entryFn = await Promise.race([execPromise, timeoutPromise]);
    } catch (e) {
      threw = e;
    } finally {
      clearTimeout(timeoutId);
      console.log = origLog;
    }

    // Se falhou ao carregar o código, todos os testes falham
    if (threw) {
      return mission.tests.map(function (t) {
        if (t.expectThrow) {
          var match = t.errorMatch ? t.errorMatch.test(threw.message) : true;
          return {
            name: t.name,
            passed: match,
            detail: match ? threw.message : ("mensagem foi: \"" + threw.message + "\"")
          };
        }
        return { name: t.name, passed: false, detail: "erro no código: " + threw.message };
      });
    }

    // Se o código rodou mas não definiu a função de entrada
    if (typeof entryFn !== "function") {
      return mission.tests.map(function (t) {
        return {
          name: t.name,
          passed: false,
          detail: "função '" + mission.entry + "' não foi definida no código"
        };
      });
    }

    // Prepara os argumentos (avaliados uma vez)
    let argsValue;
    try {
      argsValue = mission.args ? new AsyncFn("return " + mission.args + ";")() : undefined;
      argsValue = await argsValue;
    } catch (e) {
      return mission.tests.map(function (t) {
        return { name: t.name, passed: false, detail: "argumento inválido: " + e.message };
      });
    }

    // Executa a função de entrada (uma vez por teste, para isolar efeitos)
    var callThrew = null;
    var callResult = undefined;
    var origLog2 = console.log;
    console.log = function () {};
    try {
      var controller2 = new AbortController();
      var timeoutId2 = setTimeout(function () { controller2.abort(); }, TIMEOUT_MS);
      try {
        var execPromise2 = entryFn(argsValue);
        var timeoutPromise2 = new Promise(function (_, reject) {
          controller2.signal.addEventListener("abort", function () {
            reject(new Error("Tempo limite excedido (10s)"));
          });
        });
        callResult = await Promise.race([execPromise2, timeoutPromise2]);
      } catch (e) {
        callThrew = e;
      } finally {
        clearTimeout(timeoutId2);
      }
    } finally {
      console.log = origLog2;
    }

    // Avalia cada teste
    var results = [];
    for (var i = 0; i < mission.tests.length; i++) {
      var t = mission.tests[i];
      var res;
      if (t.expectThrow) {
        if (callThrew) {
          var ok = t.errorMatch ? t.errorMatch.test(callThrew.message) : true;
          res = {
            name: t.name,
            passed: ok,
            detail: ok ? callThrew.message : ("mensagem: " + callThrew.message)
          };
        } else {
          res = { name: t.name, passed: false, detail: "não lançou erro" };
        }
      } else {
        if (callThrew) {
          res = { name: t.name, passed: false, detail: callThrew.message };
        } else {
          try {
            var passed = await Promise.resolve(t.fn(callResult));
            res = { name: t.name, passed: passed };
          } catch (e) {
            res = { name: t.name, passed: false, detail: e.message };
          }
        }
      }
      results.push(res);
    }
    return results;
  } finally {
    globalThis.__ds_entry__ = origSet;
  }
}

// Garante que o identificador não contém caracteres perigosos
// (mesmo que alguém edite missions.js depois).
function escapeIdent(name) {
  if (typeof name !== "string" || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(name)) {
    throw new Error("Nome de função inválido em missions.js: " + JSON.stringify(name));
  }
  return name;
}
