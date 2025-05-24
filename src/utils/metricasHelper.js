const Estoque = require('../models/Estoque');
const {
    notificarMetaAtingida,
    notificarProximidadeMeta,
    enviarAlertasAltoDesempenho 
} = require('../services/notificacaoService'); // Importar funções do serviço

/**
 * Atualiza as métricas de progresso para usuários e cargos após uma entrada/saída.
 * Também dispara notificações relevantes.
 *
 * @param {string} item O nome do item.
 * @param {object} usuario O objeto do usuário Discord.
 * @param {number} quantidade A quantidade da operação.
 * @param {string} acao 'entrada' ou 'saída'.
 * @param {Interaction} interaction A interação original.
 */
async function atualizarMetricas(item, usuario, quantidade, acao, interaction) {
    if (!interaction || !interaction.client || !interaction.member) {
        console.error('[metricasHelper] Interação inválida ou incompleta recebida.');
        return;
    }

    const client = interaction.client;
    const member = interaction.member;
    const guild = interaction.guild;

    try {
        // 1. Atualizar métricas do usuário
        const updateUsuario = {
            $inc: {},
            $set: { "metasUsuarios.$.ultimaAtualizacao": new Date() }
        };
        if (acao === 'entrada') {
            updateUsuario.$inc["metasUsuarios.$.progressoDiario"] = quantidade;
            updateUsuario.$inc["metasUsuarios.$.progressoSemanal"] = quantidade;
        }
        await Estoque.findOneAndUpdate(
            { item, "metasUsuarios.usuarioId": usuario.id },
            updateUsuario
        );

        // 2. Atualizar métricas de cargos do usuário
        for (const role of member.roles.cache.values()) {
            const updateCargo = {
                $inc: {},
                $set: { "metasCargos.$.ultimaAtualizacao": new Date() }
            };
            if (acao === 'entrada') {
                updateCargo.$inc["metasCargos.$.progressoDiario"] = quantidade;
                updateCargo.$inc["metasCargos.$.progressoSemanal"] = quantidade;
            }
            await Estoque.findOneAndUpdate(
                { item, "metasCargos.roleId": role.id },
                updateCargo
            );
        }

        // --- Lógica de Notificação --- 

        // Recarrega os dados do item com as metas atualizadas
        const itemComMetas = await Estoque.findOne({
             item, 
             $or: [ 
                 { "metasUsuarios.usuarioId": usuario.id }, 
                 { "metasCargos.roleId": { $in: Array.from(member.roles.cache.keys()) } }
             ]
        }).lean(); // .lean() para performance, já que não vamos salvar este doc

        if (!itemComMetas) return; // Sem metas definidas para este usuário/cargo

        // 3. Verificar Metas e Notificar Usuário
        const metaUsuario = itemComMetas.metasUsuarios?.find(m => m.usuarioId === usuario.id);

        if (metaUsuario && acao === 'entrada') { // Só notifica em entradas
            const { metaDiaria, progressoDiario, metaSemanal, progressoSemanal } = metaUsuario;
            const progressoDiarioAnterior = progressoDiario - quantidade;
            const progressoSemanalAnterior = progressoSemanal - quantidade;

            // Notificar Meta Diária Atingida (apenas se foi atingida NESTA atualização)
            if (metaDiaria > 0 && progressoDiario >= metaDiaria && progressoDiarioAnterior < metaDiaria) {
                await notificarMetaAtingida(client, usuario.id, 'diaria', item, metaDiaria, progressoDiario);
            }
            // Notificar Meta Semanal Atingida (apenas se foi atingida NESTA atualização)
            else if (metaSemanal > 0 && progressoSemanal >= metaSemanal && progressoSemanalAnterior < metaSemanal) {
                await notificarMetaAtingida(client, usuario.id, 'semanal', item, metaSemanal, progressoSemanal);
            }
            // Notificar Proximidade (se não atingiu ainda)
            else {
                // Checa proximidade diária
                if (metaDiaria > 0 && progressoDiario < metaDiaria) {
                    // Precisa buscar a config do usuário para o limiar
                    const configUsuario = await require('../models/NotificacaoConfigUsuario').findOne({ usuarioId: usuario.id }).lean();
                    const limiar = configUsuario?.limiarProximidadeMeta || 80;
                    if (progressoDiario >= (metaDiaria * limiar / 100) && progressoDiarioAnterior < (metaDiaria * limiar / 100)) {
                         await notificarProximidadeMeta(client, usuario.id, 'diaria', item, metaDiaria, progressoDiario, limiar);
                    }
                }
                // Checa proximidade semanal (se não atingiu diária ou semanal)
                else if (metaSemanal > 0 && progressoSemanal < metaSemanal) {
                    const configUsuario = await require('../models/NotificacaoConfigUsuario').findOne({ usuarioId: usuario.id }).lean();
                    const limiar = configUsuario?.limiarProximidadeMeta || 80;
                     if (progressoSemanal >= (metaSemanal * limiar / 100) && progressoSemanalAnterior < (metaSemanal * limiar / 100)) {
                         await notificarProximidadeMeta(client, usuario.id, 'semanal', item, metaSemanal, progressoSemanal, limiar);
                    }
                }
            }
            
            // Notificar Alto Desempenho (Ex: > 150% da meta diária/semanal)
            // Pode ser ajustado conforme necessário
            const limiarAltoDesempenho = 1.5; 
            if (metaDiaria > 0 && progressoDiario >= metaDiaria * limiarAltoDesempenho && progressoDiarioAnterior < metaDiaria * limiarAltoDesempenho) {
                 await enviarAlertasAltoDesempenho(client, usuario.id, item, 'diaria', metaDiaria, progressoDiario);
            }
             else if (metaSemanal > 0 && progressoSemanal >= metaSemanal * limiarAltoDesempenho && progressoSemanalAnterior < metaSemanal * limiarAltoDesempenho) {
                 await enviarAlertasAltoDesempenho(client, usuario.id, item, 'semanal', metaSemanal, progressoSemanal);
            }
        }

        // 4. Notificações de Cargo (Opcional - pode gerar muito spam, talvez remover ou refinar)
        // A lógica original enviava para o canal de notificações. Manter ou remover?
        // Por ora, vamos comentar essa parte para focar nas notificações individuais e de gerência.
        /*
        const CANAL_NOTIFICACOES_ID = process.env.CANAL_NOTIFICACOES_ID;
        if (CANAL_NOTIFICACOES_ID) {
            const canalNotificacoes = await client.channels.fetch(CANAL_NOTIFICACOES_ID).catch(() => null);
            if (canalNotificacoes) {
                for (const metaCargo of itemComMetas.metasCargos || []) {
                    if (member.roles.cache.has(metaCargo.roleId) && acao === 'entrada') {
                        const { metaDiaria, progressoDiario, metaSemanal, progressoSemanal } = metaCargo;
                        const progressoDiarioAnterior = progressoDiario - quantidade;
                        const progressoSemanalAnterior = progressoSemanal - quantidade;
                        const role = await guild.roles.fetch(metaCargo.roleId).catch(() => null);
                        if (!role) continue;

                        if (metaDiaria > 0 && progressoDiario >= metaDiaria && progressoDiarioAnterior < metaDiaria) {
                            await canalNotificacoes.send({
                                content: `🎉 O cargo ${role.name} bateu a meta diária de ${item} (${progressoDiario}/${metaDiaria})!`,
                                allowedMentions: { roles: [metaCargo.roleId] } // Cuidado com menções
                            });
                        }
                        if (metaSemanal > 0 && progressoSemanal >= metaSemanal && progressoSemanalAnterior < metaSemanal) {
                             await canalNotificacoes.send({
                                content: `🏆 O cargo ${role.name} bateu a meta semanal de ${item} (${progressoSemanal}/${metaSemanal})!`,
                                allowedMentions: { roles: [metaCargo.roleId] }
                            });
                        }
                    }
                }
            }
        }
        */

    } catch (error) {
        console.error('Erro ao atualizar métricas e enviar notificações:', error);
    }
}

module.exports = {
    atualizarMetricas
};

