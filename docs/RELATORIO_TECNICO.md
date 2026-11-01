# Relatório técnico — NEXORA Commerce

## Escopo e método

O material recebido não contém um catálogo de defeitos separado. A investigação
partiu dos sintomas reproduzíveis no Flask, das rotas e dos critérios do
validador da Missão 04. O fluxo seguiu POE: prever o resultado de cada rota,
observar a resposta com o `test_client` e explicar a causa antes da correção.

## Diagnóstico

| Sintoma observado | Hipótese | Evidência/teste | Causa |
|---|---|---|---|
| `/produto/101` não abre um produto | A rota de detalhe não foi ligada à loja | `GET /produto/101` retornou 404 | A aplicação registrava apenas a página do catálogo e as rotas da API |
| Validação da Missão 04 falha antes de executar os demais checks | Falta o template exigido pelo validador | `POST /api/mission/validate-4` retornou `complete=false`, `passed=0`, `total=1` | `templates/produto.html` não existia; o validador encerra cedo quando o template falta |
| Havia risco de catálogos divergirem conforme a forma de registro | As duas implementações mantêm cópias independentes de `PRODUCTS` | Comparação de identidade e inspeção de `integration.py` e `ecommerce_blueprint.py` | O Flask ativo registra `integration.py`; o blueprint opcional mantinha outra lista de produtos |

Comportamentos verificados e preservados: `/api/shop/health` retorna 200;
ordenação inválida retorna 400; produto inexistente na API retorna JSON 404; e
a validação do carrinho calcula preços a partir do catálogo do servidor e
rejeita quantidade acima do estoque com 409.

## Correções e evolução funcional

- Criada a rota SSR `GET /produto/<int:product_id>` e o template
  `templates/produto.html`. Produtos inexistentes exibem mensagem amigável e
  status 404. O contrato JSON de `/api/shop/products/<id>` permaneceu intacto.
- Os nomes dos produtos na coleção agora levam à página de detalhe; o modal
  existente continua disponível no botão “Ver detalhes”.
- O catálogo foi centralizado em `ecommerce_blueprint.py`; a integração ativa
  importa a mesma lista, evitando divergência entre as duas formas de registro.
- Adicionada lista de desejos no catálogo, no modal de detalhes e em um painel
  próprio. O navegador armazena somente os IDs; nomes, preços, imagens e
  disponibilidade vêm do catálogo retornado pela API. IDs removidos do catálogo
  são descartados na inicialização.
- A lista permite remoção, navegação ao produto e inclusão no carrinho.
  Armazenamento indisponível gera aviso explícito ao usuário.

## Verificação

Comando: `python -m unittest discover -s tests -v`

Resultado: **7 testes passaram**. A suíte cobre filtros e ordenação, detalhe e
404, contrato JSON da API, validador da Missão 04, preço/estoque do carrinho,
catálogo único e integração/persistência da lista de desejos. `node --check
static/ecommerce/ecommerce.js` também passou. Na validação manual pelo navegador,
foi confirmado que adicionar um produto atualiza a lista e o contador, e que o
item continua salvo após recarregar a loja.

## Limitações conhecidas

A lista é anônima e específica do navegador/perfil: não sincroniza entre
dispositivos e não é recuperável após limpar os dados locais. O projeto não
possui autenticação nem entidade de cliente; persistência por conta exigiria
uma decisão de produto e suporte de backend.

## Diagrama

Ver [FLUXO-DADOS-E-ROTAS.md](./FLUXO-DADOS-E-ROTAS.md).

## Decisão arquitetural

Ver [ADR-001-lista-de-desejos.md](./ADR-001-lista-de-desejos.md).
