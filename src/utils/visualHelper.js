// Arquivo de constantes para padronização visual
// Centraliza cores, emojis e estilos para uso consistente em todos os comandos

module.exports = {
  // Cores para embeds por tipo de ação
  CORES: {
    SUCESSO: '#00FF00',      // Verde para operações bem-sucedidas
    ALERTA: '#FFA500',       // Laranja para alertas e saídas de estoque
    ERRO: '#FF0000',         // Vermelho para erros
    INFO: '#00FFFF',         // Ciano para informações gerais
    PRIMARIO: '#5865F2',     // Azul Discord para comandos principais
    SECUNDARIO: '#99AAB5',   // Cinza para comandos secundários
    META: '#9B59B6'          // Roxo para comandos relacionados a metas
  },
  
  // Emojis para diferentes tipos de ações
  EMOJIS: {
    SUCESSO: '✅',
    ERRO: '❌',
    ALERTA: '⚠️',
    INFO: 'ℹ️',
    ENTRADA: '📥',
    SAIDA: '📤',
    ESTOQUE: '📦',
    META: '🎯',
    META_BATIDA: '🏆',
    TEMPO: '⏰',
    ADMIN: '🔧',
    NOVO: '🆕',
    ZERAR: '🧹',
    STATUS: '🤖',
    DESATIVAR: '🚫',
    ATIVAR: '✅',
  },
  
  // Textos padrão para rodapés e mensagens comuns
  TEXTOS: {
    RODAPE_TEMPO: 'Operação expira em 60 segundos',
    ERRO_GENERICO: 'Ocorreu um erro ao processar o comando. Tente novamente mais tarde.',
    TEMPO_ESGOTADO: 'Tempo esgotado. Operação cancelada.',
    QUANTIDADE_INVALIDA: 'Quantidade inválida! Use números positivos.',
    SEM_ITENS: 'Não há itens cadastrados no estoque. Use `/item-novo` para adicionar itens.'
  },
  
  // Funções auxiliares para formatação consistente
  formatarNomeItem: (nome) => {
    if (!nome) return '';
    return nome.charAt(0).toUpperCase() + nome.slice(1).toLowerCase();
  },
  
  formatarData: (data) => {
    if (!data) return '';
    return new Date(data).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  },
  
  formatarQuantidade: (quantidade) => {
    return quantidade.toLocaleString('pt-BR');
  }
};
