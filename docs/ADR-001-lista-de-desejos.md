# ADR-001: Persistência da lista de desejos no navegador

- **Status:** Aceita
- **Data:** 2026-11-01

## Contexto

A loja não possui autenticação, contas de cliente nem armazenamento
persistente no backend. O carrinho já salva no `localStorage` os identificadores
dos produtos e as quantidades, enquanto catálogo, preços e estoque são servidos
pela API Flask.

## Decisão

Persistir no `localStorage`, na chave `nexora-wishlist-v1`, somente uma lista
única de IDs de produtos. Na inicialização, reconciliar esses IDs com o
catálogo carregado de `/api/shop/products`; usar os objetos retornados pela API
para apresentar os dados atuais do produto. Não adicionar endpoints de escrita
nem associar a lista a uma identidade inexistente.

## Consequências

- A implementação segue o padrão de persistência do carrinho e não exige
  migração de banco, chave secreta ou dependência nova.
- A lista sobrevive a recargas no mesmo navegador e os dados de catálogo não
  ficam duplicados no armazenamento local.
- A lista não sincroniza entre navegadores/dispositivos e pode ser removida ao
  limpar os dados do navegador.
- Uma futura lista associada a contas deverá introduzir autenticação,
  persistência de backend, autorização e uma API própria; isso fica fora deste
  escopo.

## Alternativas consideradas

1. **Sessão anônima no servidor:** rejeitada porque o sistema não configura
   sessões para essa finalidade, requer segredo e ainda não oferece uma
   identidade durável ou recuperação entre dispositivos.
2. **Armazenar objetos completos no navegador:** rejeitada para evitar preços,
   estoque e descrições obsoletos divergirem do catálogo autoritativo da API.
