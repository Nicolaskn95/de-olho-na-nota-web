# Regras de Negócio — Lista de Compras 🛒

Documento de referência com todas as regras de negócio aplicadas na funcionalidade **Lista de Compras** do sistema **De Olho na Nota**.

---

## 1. Visão Geral

A Lista de Compras é uma funcionalidade que gera automaticamente uma lista de produtos recorrentes com base no histórico de notas fiscais do usuário em um mercado específico. O objetivo é ajudar o usuário a planejar suas compras futuras com estimativa de custo.

---

## 2. Seleção de Mercado

| Regra | Descrição |
|-------|-----------|
| **RN-001** | O mercado é identificado pelo **CNPJ** extraído das notas fiscais. |
| **RN-002** | Apenas mercados onde o usuário possui **pelo menos 1 nota fiscal** cadastrada são listados. |
| **RN-003** | O nome exibido respeita o sistema de **De-Para** (apelido definido pelo usuário). Se não houver de-para, exibe o nome original da nota fiscal. |
| **RN-004** | Para cada mercado, o sistema exibe: total de notas e quantidade de meses com histórico disponível. |

---

## 3. Período de Análise

| Regra | Descrição |
|-------|-----------|
| **RN-005** | O período padrão de análise é de **3 meses** anteriores à data atual. |
| **RN-006** | O usuário pode configurar o período de **1 a 6 meses**. |
| **RN-007** | O intervalo de datas é calculado como: `[hoje - periodoMeses meses, hoje]`. |

---

## 4. Critério de Recorrência (Produto Elegível)

| Regra | Descrição |
|-------|-----------|
| **RN-008** | Um produto é considerado **recorrente** quando aparece em compras de **pelo menos 2 meses distintos** no mercado selecionado dentro do período de análise. |
| **RN-009** | A contagem de meses distintos usa o formato `YYYY-MM` da data de emissão da nota fiscal que contém o produto. |
| **RN-010** | Produtos que aparecem em apenas 1 mês (compra esporádica) **não são incluídos** na lista. |
| **RN-011** | A frequência do produto (em quantos meses distintos foi comprado) é exibida ao usuário como indicador de recorrência. |

---

## 5. Agrupamento de Produtos

| Regra | Descrição |
|-------|-----------|
| **RN-012** | Os produtos são agrupados pelo **nome normalizado**: convertido para maiúsculas (`toUpperCase`) e sem espaços extras (`trim`). |
| **RN-013** | Variantes de tamanho/embalagem (ex: "COCA COLA 2L" vs "COCA COLA 350ML") são tratadas como **itens separados**. |
| **RN-014** | A normalização não aplica fuzzy matching — o agrupamento é por igualdade exata do nome normalizado. |

---

## 6. Cálculo de Quantidade

| Regra | Descrição |
|-------|-----------|
| **RN-015** | A quantidade sugerida é a **média arredondada para cima** (`Math.ceil`) de todas as compras do produto no período. |
| **RN-016** | A unidade de medida utilizada é a mais recente encontrada (UN, KG, CX, etc.). |

---

## 7. Estimativa de Preço

| Regra | Descrição |
|-------|-----------|
| **RN-017** | O valor unitário de referência é o **preço unitário da compra mais recente** (nota fiscal com `dataEmissao` mais recente). |
| **RN-018** | O valor estimado do item é calculado como: `valorEstimado = quantidadeMedia × valorUnitarioRecente`. |
| **RN-019** | A estimativa total da lista é o **somatório** de todos os `valorEstimado` dos itens. |
| **RN-020** | Os valores são formatados em **Real Brasileiro (BRL)** com 2 casas decimais. |

---

## 8. Apelidos de Produtos (De-Para de Nomes)

| Regra | Descrição |
|-------|-----------|
| **RN-021** | Produtos com nomes abreviados ou ilegíveis na nota fiscal podem receber um **apelido** definido pelo usuário. |
| **RN-022** | O apelido é vinculado ao **nome original** (normalizado) e ao **usuário** (relação única por par `userId + nomeOriginal`). |
| **RN-023** | Quando um apelido existe, a lista exibe o **apelido** como nome principal e mantém o nome original como referência (tooltip). |
| **RN-024** | O apelido persiste entre gerações de lista — ao gerar uma nova lista, os apelidos cadastrados são automaticamente aplicados. |
| **RN-025** | O usuário pode criar, editar e remover apelidos a qualquer momento. |

---

## 9. Ordenação da Lista

| Regra | Descrição |
|-------|-----------|
| **RN-026** | A lista é ordenada primariamente por **frequência** (descendente) — produtos mais recorrentes aparecem primeiro. |
| **RN-027** | Em caso de empate na frequência, a ordenação secundária é por **nome** (ascendente, ordem alfabética). |

---

## 10. Persistência e Salvamento

| Regra | Descrição |
|-------|-----------|
| **RN-028** | Cada usuário possui **no máximo 1 lista** ativa no banco de dados. |
| **RN-029** | Ao gerar uma nova lista, a lista anterior é **sobrescrita** (upsert por `userId`). |
| **RN-030** | Alterações nos checkboxes (marcar/desmarcar itens) são salvas inicialmente no **localStorage** do navegador. |
| **RN-031** | A cada **10 alterações** acumuladas, o sistema dispara um **auto-save em lote** para o banco de dados via API. |
| **RN-032** | Ao sair da página ou fechar o componente, alterações pendentes (< 10) são persistidas no **localStorage** para recuperação posterior. |
| **RN-033** | Ao reabrir a página, o sistema recupera alterações pendentes do localStorage e as aplica à lista carregada do banco. |

---

## 11. Manipulação da Lista

| Regra | Descrição |
|-------|-----------|
| **RN-034** | O usuário pode **remover** itens individualmente da lista gerada. |
| **RN-035** | O usuário pode **adicionar itens manualmente** à lista (nome, quantidade, unidade e valor estimado opcional). |
| **RN-036** | O usuário pode **excluir** a lista inteira para começar do zero. |
| **RN-037** | Marcar um item como "comprado" aplica um efeito visual de riscado (strikethrough) com animação. |

---

## 12. Interface Visual

| Regra | Descrição |
|-------|-----------|
| **RN-038** | A lista é exibida com visual de **caderno escolar**: linhas horizontais, margem vermelha à esquerda e espiral decorativa. |
| **RN-039** | A fonte utilizada nos itens da lista é **Patrick Hand** (Google Fonts) para simular escrita à mão. |
| **RN-040** | As cores do tema (checkboxes, botões, destaques) seguem a **paleta de cores do perfil** do usuário (`--user-color-primary`). |
| **RN-041** | O loading de geração utiliza uma **animação de livro** com as cores do perfil do usuário. |
| **RN-042** | Cards de resumo exibem: estimativa total, total de itens e progresso de itens comprados (com barra de progresso). |

---

## Diagrama de Fluxo

```
┌─────────────────────┐
│  Usuário acessa      │
│  /lista-compras      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     ┌──────────────────────┐
│ Existe lista ativa? │──── │ SIM: Exibir lista    │
│ (GET /lista-compras)│     │ com visual de caderno │
└──────────┬──────────┘     └──────────────────────┘
           │ NÃO
           ▼
┌─────────────────────┐
│ Listar mercados      │
│ com histórico        │
│ (GET /mercados)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Usuário seleciona    │
│ mercado + período    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Gerar lista          │
│ (POST /gerar)        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Para cada produto do mercado:       │
│ 1. Agrupar por nome normalizado     │
│ 2. Calcular frequência (meses)      │
│ 3. Filtrar freq >= 2                │
│ 4. Calcular qtd média (ceil)        │
│ 5. Buscar preço unitário recente    │
│ 6. Aplicar apelido se existir       │
│ 7. Calcular valorEstimado           │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────────────────────┐
│ Ordenar: frequência desc > nome asc │
│ Calcular estimativa total           │
│ Upsert no banco (1 lista/usuário)   │
└──────────┬──────────────────────────┘
           │
           ▼
┌─────────────────────┐
│ Exibir lista no      │
│ visual de caderno    │
│ com checkboxes       │
└─────────────────────┘
```

---

## Glossário

| Termo | Definição |
|-------|-----------|
| **NF / NFC-e** | Nota Fiscal de Consumidor Eletrônica — documento fiscal digital emitido por estabelecimentos. |
| **CNPJ** | Cadastro Nacional da Pessoa Jurídica — identificador único de empresas no Brasil. |
| **De-Para** | Sistema de mapeamento que permite ao usuário definir nomes amigáveis para entidades do sistema. |
| **Apelido** | Nome legível definido pelo usuário para substituir nomes abreviados/codificados que aparecem nas notas fiscais. |
| **Frequência** | Número de meses distintos em que um produto foi comprado dentro do período de análise. |
| **Recorrência** | Critério que determina se um produto aparece na lista (frequência ≥ 2 meses). |
| **Estimativa** | Valor projetado da compra baseado no preço mais recente multiplicado pela quantidade média. |
