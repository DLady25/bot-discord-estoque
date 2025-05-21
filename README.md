# Documentação do Bot de Estoque para Discord

## Visão Geral

Este bot foi desenvolvido para gerenciar o estoque de itens no Discord, permitindo o registro de entradas e saídas, definição de metas por usuário e cargo, e notificações automáticas quando metas são atingidas.

## Estrutura do Projeto

```
bot-discord-estoque/
├── src/
│   ├── commands/       # Comandos do bot
│   ├── models/         # Modelos de dados (MongoDB)
│   ├── utils/          # Utilitários e helpers
│   └── index.js        # Arquivo principal
├── package.json        # Dependências
└── .env                # Variáveis de ambiente (não versionado)
```

## Tecnologias Utilizadas

- **Discord.js**: Framework para interação com a API do Discord
- **MongoDB/Mongoose**: Banco de dados para armazenamento de itens e histórico
- **Node.js**: Ambiente de execução JavaScript

## Configuração

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto com as seguintes variáveis:

```
TOKEN=seu_token_do_discord_bot
MONGODB_URI=sua_uri_de_conexao_mongodb
CARGO_GERENCIA_ID=id_do_cargo_de_gerencia
CANAL_NOTIFICACOES_ID=id_do_canal_de_notificacoes
```

### Instalação

1. Clone o repositório
2. Instale as dependências: `npm install`
3. Configure o arquivo `.env`
4. Inicie o bot: `node src/index.js`

## Comandos Disponíveis

### Comandos Básicos

#### `/status`
Verifica se o bot está online e mostra estatísticas básicas.

#### `/ver`
Mostra o estoque atual de todos os itens.

**Parâmetros:**
- `categoria` (opcional): Filtra itens por categoria específica

**Exemplo:**
```
/ver categoria:geral
```

#### `/metas`
Visualiza todas as metas configuradas.

### Comandos de Operação

#### `/add`
Adiciona itens ao estoque.

**Fluxo:**
1. Selecione o item no menu dropdown
2. Digite a quantidade a ser adicionada

#### `/retirar`
Retira itens do estoque.

**Fluxo:**
1. Selecione o item no menu dropdown
2. Digite a quantidade a ser retirada

### Comandos de Gerenciamento

#### `/item-novo`
Adiciona um novo tipo de item ao sistema.

**Parâmetros:**
- `nome` (obrigatório): Nome do novo item
- `categoria` (opcional): Categoria do item (padrão: "geral")
- `descricao` (opcional): Descrição do item

**Exemplo:**
```
/item-novo nome:madeira categoria:recursos descricao:Madeira para construção
```

#### `/zerar`
Zera o estoque de um item específico.

**Parâmetros:**
- `item` (obrigatório): Nome do item para zerar

**Exemplo:**
```
/zerar item:madeira
```

#### `/meta-user`
Define metas para usuários específicos.

#### `/meta-cargo`
Define metas para cargos específicos.

#### `/meta-geral`
Define metas gerais para itens.

### Comandos Administrativos

#### `/admin-reset`
Limpa o banco de dados (requer permissões administrativas).

#### `/admin-rollback`
Reverte operações recentes (requer permissões administrativas).

## Permissões

- **Comandos Básicos**: Todos os usuários
- **Comandos de Operação**: Todos os usuários
- **Comandos de Gerenciamento**: Usuários com permissão MANAGE_GUILD
- **Comandos Administrativos**: Administradores do servidor

## Funcionalidades Principais

### Sistema Dinâmico de Itens
O bot permite adicionar qualquer tipo de item ao estoque, organizados por categorias.

### Controle de Estoque
Registra entradas e saídas de itens, mantendo histórico completo de operações.

### Sistema de Metas
Permite definir metas diárias e semanais para:
- Itens específicos
- Usuários individuais
- Cargos no servidor

### Notificações Automáticas
Envia notificações quando:
- Metas individuais são atingidas
- Metas de cargo são atingidas
- Metas gerais de item são atingidas

## Manutenção

### Backup do Banco de Dados
Recomenda-se fazer backup regular do banco MongoDB.

### Reinicialização Periódica
O bot possui sistema de reconexão automática, mas é recomendável reiniciá-lo periodicamente para garantir estabilidade.

### Limpeza de Histórico
Para manter o desempenho, considere limpar o histórico de operações antigas periodicamente.
