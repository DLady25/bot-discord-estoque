const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');

// Função auxiliar para atualizar métricas
async function atualizarMetricas(item, usuario, quantidade, acao, interaction) {
  try {
    // Atualizar métricas do usuário
    await Estoque.findOneAndUpdate(
      { 
        item,
        "metasUsuarios.usuarioId": usuario.id 
      },
      { 
        $inc: { 
          "metasUsuarios.$.progressoDiario": acao === 'entrada' ? quantidade : 0,
          "metasUsuarios.$.progressoSemanal": acao === 'entrada' ? quantidade : 0
        },
        $set: {
          "metasUsuarios.$.ultimaAtualizacao": new Date()
        }
      }
    );

    // Atualizar métricas de cargos
    if (interaction && interaction.member) {
      const member = interaction.member;
      for (const role of member.roles.cache.values()) {
        await Estoque.findOneAndUpdate(
          { 
            item,
            "metasCargos.roleId": role.id 
          },
          { 
            $inc: { 
              "metasCargos.$.progressoDiario": acao === 'entrada' ? quantidade : 0,
              "metasCargos.$.progressoSemanal": acao === 'entrada' ? quantidade : 0
            },
            $set: {
              "metasCargos.$.ultimaAtualizacao": new Date()
            }
          }
        );
      }
    }

    // Verificar e notificar metas batidas
    const CANAL_NOTIFICACOES_ID = process.env.CANAL_NOTIFICACOES_ID;
    const CARGO_GERENCIA_ID = process.env.CARGO_GERENCIA_ID;
    
    if (CANAL_NOTIFICACOES_ID && interaction && interaction.client) {
      const itemComMetas = await Estoque.findOne({ item });
      if (!itemComMetas) return;

      const canalNotificacoes = await interaction.client.channels.fetch(CANAL_NOTIFICACOES_ID).catch(() => null);
      if (!canalNotificacoes) return;

      // Verificar metas de usuário
      for (const metaUsuario of itemComMetas.metasUsuarios || []) {
        if (metaUsuario.usuarioId === usuario.id) {
          if (metaUsuario.metaDiaria && metaUsuario.progressoDiario >= metaUsuario.metaDiaria) {
            await canalNotificacoes.send({
              content: `🎉 <@${usuario.id}> bateu a meta diária de ${item} (${metaUsuario.progressoDiario}/${metaUsuario.metaDiaria})!`,
              allowedMentions: { users: [usuario.id] }
            });
          }
          
          if (metaUsuario.metaSemanal && metaUsuario.progressoSemanal >= metaUsuario.metaSemanal) {
            await canalNotificacoes.send({
              content: `🏆 <@${usuario.id}> bateu a meta semanal de ${item} (${metaUsuario.progressoSemanal}/${metaUsuario.metaSemanal})!`,
              allowedMentions: { users: [usuario.id] }
            });
          }
        }
      }

      // Verificar metas de cargo
      if (interaction.member) {
        const guild = interaction.guild;
        for (const metaCargo of itemComMetas.metasCargos || []) {
          if (interaction.member.roles.cache.has(metaCargo.roleId)) {
            if (metaCargo.metaDiaria && metaCargo.progressoDiario >= metaCargo.metaDiaria) {
              const role = await guild.roles.fetch(metaCargo.roleId).catch(() => null);
              if (role) {
                await canalNotificacoes.send({
                  content: `🎉 O cargo ${role.name} bateu a meta diária de ${item} (${metaCargo.progressoDiario}/${metaCargo.metaDiaria})!`,
                  allowedMentions: { roles: [metaCargo.roleId] }
                });
              }
            }
            
            if (metaCargo.metaSemanal && metaCargo.progressoSemanal >= metaCargo.metaSemanal) {
              const role = await guild.roles.fetch(metaCargo.roleId).catch(() => null);
              if (role) {
                await canalNotificacoes.send({
                  content: `🏆 O cargo ${role.name} bateu a meta semanal de ${item} (${metaCargo.progressoSemanal}/${metaCargo.metaSemanal})!`,
                  allowedMentions: { roles: [metaCargo.roleId] }
                });
              }
            }
          }
        }
      }

      // Notificar gerência
      if (CARGO_GERENCIA_ID) {
        if (itemComMetas.metaDiaria && itemComMetas.quantidade >= itemComMetas.metaDiaria) {
          await canalNotificacoes.send({
            content: `🚀 Meta diária de ${item} foi batida! (${itemComMetas.quantidade}/${itemComMetas.metaDiaria})`,
            allowedMentions: { roles: [CARGO_GERENCIA_ID] }
          });
        }

        if (itemComMetas.metaSemanal && itemComMetas.quantidade >= itemComMetas.metaSemanal) {
          await canalNotificacoes.send({
            content: `🚀 Meta semanal de ${item} foi batida! (${itemComMetas.quantidade}/${itemComMetas.metaSemanal})`,
            allowedMentions: { roles: [CARGO_GERENCIA_ID] }
          });
        }
      }
    }
  } catch (error) {
    console.error('Erro ao atualizar métricas:', error);
  }
}

// Exportar a função para uso em outros arquivos
module.exports = {
  atualizarMetricas
};
