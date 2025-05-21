const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('limpar-db')
    .setDescription('[GERÊNCIA] Limpa todo o banco de dados')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator) // Opcional: só aparece para admins
    .setDMPermission(false),
    
  async execute(interaction) {
    // Verifica se o usuário tem o cargo de gerência
    const cargoGerenciaId = process.env.CARGO_GERENCIA_ID;
    const membro = interaction.member;
    
    if (!membro.roles.cache.has(cargoGerenciaId)) {
      return interaction.reply({
        content: '❌ Apenas a Gerência pode usar este comando!',
        flags: MessageFlagsBitField.Flags.Ephemeral
      });
    }

    // Confirmação perigosa
    const confirmacaoEmbed = {
      color: 0xff0000,
      title: '⚠️ ATENÇÃO ⚠️',
      description: 'Você está prestes a **APAGAR TODOS OS DADOS** do banco!\n\nDigite `CONFIRMAR` para prosseguir ou `CANCELAR` para abortar.',
    };

    await interaction.reply({
      embeds: [confirmacaoEmbed],
      flags: MessageFlagsBitField.Flags.Ephemeral
    });

    // Filtro para coletar a resposta
    const filter = m => m.author.id === interaction.user.id;
    const collector = interaction.channel.createMessageCollector({ 
      filter, 
      time: 15000,
      max: 1
    });

    collector.on('collect', async m => {
      if (m.content.toUpperCase() === 'CONFIRMAR') {
        try {
          await Estoque.deleteMany({});
          
          const successEmbed = {
            color: 0x00ff00,
            title: '✅ Banco de dados limpo',
            description: 'Todos os registros foram removidos com sucesso!',
          };
          
          await interaction.followUp({
            embeds: [successEmbed],
            flags: MessageFlagsBitField.Flags.Ephemeral
          });
        } catch (error) {
          console.error(error);
          await interaction.followUp({
            content: '❌ Ocorreu um erro ao limpar o banco!',
            flags: MessageFlagsBitField.Flags.Ephemeral
          });
        }
      } else {
        await interaction.followUp({
          content: 'Operação cancelada.',
          flags: MessageFlagsBitField.Flags.Ephemeral
        });
      }
    });

    collector.on('end', collected => {
      if (collected.size === 0) {
        interaction.followUp({
          content: 'Tempo esgotado. Operação cancelada.',
          flags: MessageFlagsBitField.Flags.Ephemeral
        });
      }
    });
  }
};