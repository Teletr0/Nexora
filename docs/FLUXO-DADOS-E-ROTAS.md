# Fluxo de dados e rotas investigadas

## Aplicação e catálogo

```mermaid
flowchart TD
    Browser[Navegador]
    App[app.py / Flask]
    Integration[register_ecommerce_routes]
    Catalog[ecommerce_blueprint.PRODUCTS]
    StoreJS[static/ecommerce/ecommerce.js]
    StoreHTML[templates/ecommerce.html]
    ProductHTML[templates/produto.html]
    Wishlist[localStorage: IDs da lista]

    Browser -->|GET /ecommerce| App
    App -->|render_template| StoreHTML
    StoreHTML --> StoreJS
    StoreJS -->|GET /api/shop/products, /categories| App
    App --> Integration
    Integration --> Catalog
    Catalog -->|JSON: produtos e categorias| StoreJS
    StoreJS -->|salva/remove IDs| Wishlist
    Wishlist -->|reconcilia IDs com catálogo carregado| StoreJS
    StoreJS -->|GET /produto/{id} pelo link do nome| App
    App -->|busca pelo ID| Catalog
    Catalog -->|produto ou ausente| App
    App -->|renderiza 200 ou página amigável 404| ProductHTML
```

`ecommerce_blueprint.py` também define um blueprint opcional que usa o mesmo
catálogo. A aplicação atual não registra esse blueprint: `app.py` registra as
rotas de `integration.py` por meio de `register_ecommerce_routes(app)`.

## Rotas observadas

| Método e rota | Origem | Entrada/dados | Resultado |
|---|---|---|---|
| `GET /` | `app.py` | — | `templates/index.html` |
| `GET /api/usuarios` | `app.py` | Dados locais e parâmetro `scenario` | JSON de usuários ou resposta de erro simulada |
| `GET /api/externo/usuarios` | `app.py` | Requisição externa com timeout | JSON externo ou 502 |
| `GET /ecommerce` | `integration.py` | — | `templates/ecommerce.html` |
| `GET /api/shop/health` | `integration.py` | — | Estado do serviço |
| `GET /api/shop/categories` | `integration.py` | Catálogo compartilhado | Categorias em JSON |
| `GET /api/shop/products` | `integration.py` | `q`, `category`, `sort` | Produtos filtrados/ordenados |
| `GET /api/shop/products/<id>` | `integration.py` | ID inteiro | Produto em JSON ou 404 JSON |
| `POST /api/shop/cart/validate` | `integration.py` | `{items: [{id, quantity}]}` | Preço/estoque validados no servidor |
| `GET /produto/<id>` | `integration.py` | ID inteiro | Página SSR do produto ou 404 amigável |
| `POST /api/mission/validate-4` | `app.py` e `mission_validators.py` | — | Checks de template, rotas e link da loja |

## Fronteiras de persistência

- **Lista de desejos:** `localStorage` contém somente IDs de produto. Os dados
  atuais são obtidos do catálogo da API na inicialização; não há endpoint de
  escrita nem identidade de cliente no sistema.
- **Carrinho:** o navegador mantém IDs e quantidades localmente. A rota de
  validação de carrinho é usada pela atividade didática para demonstrar que
  preço e estoque são autoritativos no servidor.
- **Produtos:** `ecommerce_blueprint.PRODUCTS` é a única lista Python; a
  integração ativa e o blueprint opcional a reutilizam.
