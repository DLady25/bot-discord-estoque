const { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const Estoque = require('../models/Estoque');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('vermetas')
    .setDescription('[ADMIN/GERÊNCIA] Visualiza metas de usuários ou cargos')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addStringOption(option =>
      option.setName('item')
        .setDescription('Item específico ou "todos"')
        .setRequired(true)
        .addChoices(
          { name: 'Todos', value: 'todos' },
          { name: 'ópio', value: 'ópio' },
          { name: 'éter', value: 'éter' },
          { name: 'metileno', value: 'metileno' },
          { name: 'plástico', value: 'plástico' }
        )
    )
    .addMentionableOption(option =>
      option.setName('alvo')
        .setDescription('Usuário ou cargo para ver metas')
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      // 1. Verificar permissões
      const cargosPermitidos = [
        process.env.ADMIN_ROLE_ID,
        process.env.GERENTE_ROLE_ID
      ];
      
      if (!interaction.member.roles.cache.some(r => cargosPermitidos.includes(r.id))) {
        return interaction.reply({
          content: '❌ Apenas ADMs/Gerentes podem usar este comando!',
          ephemeral: true
        });
      }

      // 2. Coletar dados
      const item = interaction.options.getString('item');
      const alvo = interaction.options.getMentionable('alvo');
      const isCargo = alvo.constructor.name === 'Role';

      // 3. Consulta otimizada com aggregation
      const pipeline = [
        {
          $match: item === 'todos' ? {} : { item }
        },
        {
          $project: {
            item: 1,
            metas: {
              $concatArrays: [
                { $ifNull: ['$metasUsuarios', []] },
                { $ifNull: ['$metasCargos', []] }
              ]
            }
          }
        },
        {
          $unwind: '$metas'
        },
        {
          $match: {
            $or: [
              { 
                'metas.usuarioId': isCargo ? undefined : alvo.id,
                'metas.roleId': undefined
              },
              { 
                'metas.roleId': isCargo ? alvo.id : undefined,
                'metas.usuarioId': undefined
              }
            ].filter(Boolean)
          }
        }
      ];

      const resultados = await Estoque.aggregate(pipeline);

      // 4. Processar resultados
      if (resultados.length === 0) {
        return interaction.reply({
          content: `❌ Nenhuma meta encontrada para ${isCargo ? 'o cargo' : 'o usuário'}!`,
          ephemeral: true
        });
      }

      // 5. Criar embed
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle(`📊 METAS ${item === 'todos' ? 'GERAIS' : item.toUpperCase()}`)
        .setDescription(`**Alvo:** ${isCargo ? alvo.name : alvo.username}`);

      resultados.forEach(({ item, metas }) => {
        const progressoDiario = metas.progressoDiario || 0;
        const progressoSemanal = metas.progressoSemanal || 0;
        const porcentagemDiaria = Math.round((progressoDiario / metas.metaDiaria) * 100) || 0;
        const porcentagemSemanal = Math.round((progressoSemanal / metas.metaSemanal) * 100) || 0;

        embed.addFields({
          name: `📦 ${item.toUpperCase()}`,
          value: [
            `✅ **Diária:** ${progressoDiario}/${metas.metaDiaria} (${porcentagemDiaria}%)`,
            `📅 **Semanal:** ${progressoSemanal}/${metas.metaSemanal} (${porcentagemSemanal}%)`,
            `⏰ **Atualizado:** <t:${Math.floor((metas.ultimaAtualizacao?.getTime() || Date.now()) / 1000)}:R>`
          ].join('\n'),
          inline: true
        });
      });

      await interaction.reply({ embeds: [embed], ephemeral: true });

    } catch (error) {
      console.error('Erro em /vermetas:', error);
      await interaction.reply({
        content: '❌ Erro ao buscar metas. Verifique os logs.',
        ephemeral: true
      });
    }
  }
};