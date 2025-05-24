const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { CORES, EMOJIS, TEXTOS } = require('../utils/visualHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('notificacoes-config')
    .setDescription('Configura suas preferências de notificações')
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('Tipo de notificação para configurar')
        .setRequired(true)
        .addChoices(
          { name: 'Metas Diárias', value: 'diaria' },
          { name: 'Metas Semanais', value: 'semanal' },
          { name: 'Proximidade de Metas', value: 'proxima' },
          { name: 'Resumos', value: 'resumo' },
          { name: 'Todas', value: 'todas' }
        ))
    .addBooleanOption(option =>
      option.setName('estado')
        .setDescription('Ativar ou desativar notificações')
        .setRequired(true)),
        
  async execute(interaction) {
    try {
      const tipo = interaction.options.getString('tipo');
      const estado = interaction.options.getBoolean('estado');
      
      // Aqui você implementaria a lógica para salvar as preferências no banco de dados
      // Por exemplo, criando um modelo ConfigNotificacoes
      
      // Por enquanto, vamos apenas simular a resposta
      const embed = new EmbedBuilder()
        .setColor(estado ? CORES.SUCESSO : CORES.ALERTA)
        .setTitle(`${estado ? EMOJIS.SUCESSO : EMOJIS.DESATIVAR} Configuração de Notificações`)
        .setDescription(`Notificações de **${getTipoNome(tipo)}** foram ${estado ? 'ativadas' : 'desativadas'} com sucesso!`)
        .setFooter({ text: `Configurado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true
      });
      
    } catch (error) {
      console.error('Erro ao configurar notificações:', error);
      await interaction.reply({
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true
      });
    }
  }
};

// Função auxiliar para obter nome amigável do tipo
function getTipoNome(tipo) {
  switch (tipo) {
    case 'diaria': return 'Metas Diárias';
    case 'semanal': return 'Metas Semanais';
    case 'proxima': return 'Proximidade de Metas';
    case 'resumo': return 'Resumos';
    case 'todas': return 'Todas as Notificações';
    default: return tipo;
  }
}
