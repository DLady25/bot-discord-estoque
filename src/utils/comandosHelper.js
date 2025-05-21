/**
 * Utilitário para documentação de comandos
 * 
 * Este arquivo contém informações detalhadas sobre cada comando do bot,
 * incluindo descrição, uso, exemplos e permissões necessárias.
 * 
 * Usado para gerar ajuda contextual e documentação automática.
 */

module.exports = {
  // Comandos Básicos
  'status': {
    categoria: 'Básico',
    descricao: 'Verifica se o bot está online e mostra estatísticas básicas.',
    uso: '/status',
    exemplo: '/status',
    permissao: 'Todos os usuários',
    aliases: ['ping']
  },
  
  'ver': {
    categoria: 'Básico',
    descricao: 'Mostra o estoque atual de todos os itens.',
    uso: '/ver [categoria]',
    exemplo: '/ver categoria:recursos',
    permissao: 'Todos os usuários',
    parametros: [
      {
        nome: 'categoria',
        descricao: 'Filtra itens por categoria específica',
        obrigatorio: false
      }
    ]
  },
  
  'metas': {
    categoria: 'Básico',
    descricao: 'Visualiza todas as metas configuradas.',
    uso: '/metas',
    exemplo: '/metas',
    permissao: 'Todos os usuários'
  },
  
  // Comandos de Operação
  'add': {
    categoria: 'Operação',
    descricao: 'Adiciona itens ao estoque.',
    uso: '/add',
    exemplo: '/add',
    permissao: 'Todos os usuários',
    fluxo: [
      'Selecione o item no menu dropdown',
      'Digite a quantidade a ser adicionada'
    ]
  },
  
  'retirar': {
    categoria: 'Operação',
    descricao: 'Retira itens do estoque.',
    uso: '/retirar',
    exemplo: '/retirar',
    permissao: 'Todos os usuários',
    fluxo: [
      'Selecione o item no menu dropdown',
      'Digite a quantidade a ser retirada'
    ]
  },
  
  // Comandos de Gerenciamento
  'item-novo': {
    categoria: 'Gerenciamento',
    descricao: 'Adiciona um novo tipo de item ao sistema.',
    uso: '/item-novo nome:string [categoria:string] [descricao:string]',
    exemplo: '/item-novo nome:madeira categoria:recursos descricao:Madeira para construção',
    permissao: 'MANAGE_GUILD',
    parametros: [
      {
        nome: 'nome',
        descricao: 'Nome do novo item',
        obrigatorio: true
      },
      {
        nome: 'categoria',
        descricao: 'Categoria do item (padrão: "geral")',
        obrigatorio: false
      },
      {
        nome: 'descricao',
        descricao: 'Descrição do item',
        obrigatorio: false
      }
    ]
  },
  
  'zerar': {
    categoria: 'Gerenciamento',
    descricao: 'Zera o estoque de um item específico.',
    uso: '/zerar item:string',
    exemplo: '/zerar item:madeira',
    permissao: 'MANAGE_GUILD',
    parametros: [
      {
        nome: 'item',
        descricao: 'Nome do item para zerar',
        obrigatorio: true
      }
    ]
  },
  
  'meta-user': {
    categoria: 'Gerenciamento',
    descricao: 'Define metas para usuários específicos.',
    uso: '/meta-user usuario:user item:string [meta_diaria:number] [meta_semanal:number]',
    exemplo: '/meta-user usuario:@João item:madeira meta_diaria:50 meta_semanal:300',
    permissao: 'MANAGE_GUILD',
    parametros: [
      {
        nome: 'usuario',
        descricao: 'Usuário para definir a meta',
        obrigatorio: true
      },
      {
        nome: 'item',
        descricao: 'Item para definir a meta',
        obrigatorio: true
      },
      {
        nome: 'meta_diaria',
        descricao: 'Meta diária para o usuário',
        obrigatorio: false
      },
      {
        nome: 'meta_semanal',
        descricao: 'Meta semanal para o usuário',
        obrigatorio: false
      }
    ]
  },
  
  'meta-cargo': {
    categoria: 'Gerenciamento',
    descricao: 'Define metas para cargos específicos.',
    uso: '/meta-cargo cargo:role item:string [meta_diaria:number] [meta_semanal:number]',
    exemplo: '/meta-cargo cargo:@Coletores item:madeira meta_diaria:100 meta_semanal:600',
    permissao: 'MANAGE_GUILD',
    parametros: [
      {
        nome: 'cargo',
        descricao: 'Cargo para definir a meta',
        obrigatorio: true
      },
      {
        nome: 'item',
        descricao: 'Item para definir a meta',
        obrigatorio: true
      },
      {
        nome: 'meta_diaria',
        descricao: 'Meta diária para o cargo',
        obrigatorio: false
      },
      {
        nome: 'meta_semanal',
        descricao: 'Meta semanal para o cargo',
        obrigatorio: false
      }
    ]
  },
  
  'meta-geral': {
    categoria: 'Gerenciamento',
    descricao: 'Define metas gerais para itens.',
    uso: '/meta-geral item:string [meta_diaria:number] [meta_semanal:number]',
    exemplo: '/meta-geral item:madeira meta_diaria:500 meta_semanal:3000',
    permissao: 'MANAGE_GUILD',
    parametros: [
      {
        nome: 'item',
        descricao: 'Item para definir a meta',
        obrigatorio: true
      },
      {
        nome: 'meta_diaria',
        descricao: 'Meta diária geral',
        obrigatorio: false
      },
      {
        nome: 'meta_semanal',
        descricao: 'Meta semanal geral',
        obrigatorio: false
      }
    ]
  },
  
  // Comandos Administrativos
  'admin-reset': {
    categoria: 'Administrativo',
    descricao: 'Limpa o banco de dados.',
    uso: '/admin-reset confirmar:boolean',
    exemplo: '/admin-reset confirmar:true',
    permissao: 'ADMINISTRATOR',
    parametros: [
      {
        nome: 'confirmar',
        descricao: 'Confirmação para executar a operação',
        obrigatorio: true
      }
    ],
    aviso: 'CUIDADO: Esta operação é irreversível e apagará todos os dados!'
  },
  
  'admin-rollback': {
    categoria: 'Administrativo',
    descricao: 'Reverte operações recentes.',
    uso: '/admin-rollback item:string [quantidade:number]',
    exemplo: '/admin-rollback item:madeira quantidade:5',
    permissao: 'ADMINISTRATOR',
    parametros: [
      {
        nome: 'item',
        descricao: 'Item para reverter operações',
        obrigatorio: true
      },
      {
        nome: 'quantidade',
        descricao: 'Número de operações a reverter',
        obrigatorio: false,
        padrao: 1
      }
    ]
  }
};
