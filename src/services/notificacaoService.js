// Serviço de Notificações

const { EmbedBuilder } = require("discord.js");
const mongoose = require("mongoose");
const Notificacao = require("../models/Notificacao");
const NotificacaoConfigUsuario = require("../models/NotificacaoConfigUsuario");
const Estoque = require("../models/Estoque"); // Importar Estoque para buscas
const { CORES, EMOJIS } = require("../utils/visualHelper");

/**
 * Envia uma notificação para um usuário ou canal.
 *
 * @param {Client} client O cliente Discord.js.
 * @param {string} destinatarioId ID do usuário ou canal de destino.
 * @param {string} tipo Tipo da notificação (enum do Schema Notificacao).
 * @param {string} mensagem Conteúdo textual da mensagem.
 * @param {EmbedBuilder} [embed] Embed opcional.
 * @param {object} [dadosRelacionados] Dados contextuais para salvar no histórico.
 * @param {boolean} [salvarHistorico=true] Se deve salvar a notificação no banco de dados.
 */
async function enviarNotificacao(client, destinatarioId, tipo, mensagem, embed = null, dadosRelacionados = {}, salvarHistorico = true) {
    try {
        let target;
        let configUsuario = null;
        let canalDestino = null;

        // Determina o alvo (usuário ou canal)
        // Tenta buscar usuário primeiro
        try {
            target = await client.users.fetch(destinatarioId);
            configUsuario = await NotificacaoConfigUsuario.findOne({ usuarioId: destinatarioId });
            // Prioriza DM, depois canal preferencial, depois DM como fallback
            if (configUsuario?.canalPreferencial === "DM" || !configUsuario?.canalPreferencial) {
                canalDestino = target; // Envia para DM
            } else {
                try {
                    canalDestino = await client.channels.fetch(configUsuario.canalPreferencial);
                } catch (fetchError) {
                    console.warn(`[NotificacaoService] Canal preferencial ${configUsuario.canalPreferencial} não encontrado para ${destinatarioId}. Enviando para DM.`);
                    canalDestino = target; // Fallback para DM se canal não encontrado
                }
            }
        } catch (userError) {
            // Se não for usuário, tenta buscar canal (para gerentes)
            try {
                target = await client.channels.fetch(destinatarioId);
                canalDestino = target;
            } catch (channelError) {
                console.error(`[NotificacaoService] Falha ao encontrar destinatário (Usuário/Canal): ${destinatarioId}`, userError, channelError);
                return; // Não foi possível encontrar o destino
            }
        }

        if (!canalDestino) {
             // Fallback final (deve ser raro)
            if (target && target.constructor.name === "User") {
                canalDestino = target;
            } else {
                 console.error(`[NotificacaoService] Canal de destino final inválido ou não encontrado para ${destinatarioId}`);
                 return;
            }
        }

        // Verifica configurações do usuário (se aplicável e se for notificação individual)
        if (configUsuario && target.constructor.name === "User") {
            let deveEnviar = true;
            switch (tipo) {
                case "meta_diaria_usuario":
                    deveEnviar = configUsuario.notificarMetaDiariaAtingida;
                    break;
                case "meta_semanal_usuario":
                    deveEnviar = configUsuario.notificarMetaSemanalAtingida;
                    break;
                case "proximidade_meta_usuario":
                    deveEnviar = configUsuario.notificarProximidadeMeta;
                    break;
                case "lembrete_meta_usuario":
                    deveEnviar = configUsuario.notificarMetasNaoAtingidas;
                    break;
                default:
                    deveEnviar = true; // Outros tipos (ex: gerência) não dependem config individual
            }
            if (!deveEnviar) {
                // console.log(`[NotificacaoService] Notificação tipo '${tipo}' desativada para ${destinatarioId}`);
                return; // Não envia se desativado pelo usuário
            }
        }

        // Envia a mensagem
        const payload = {
            content: mensagem,
            embeds: embed ? [embed] : []
        };

        await canalDestino.send(payload);
        console.log(`[NotificacaoService] Notificação tipo '${tipo}' enviada para ${destinatarioId} via canal ${canalDestino.id}`);

        // Salva no histórico (se habilitado e se for notificação individual)
        if (salvarHistorico && target.constructor.name === "User") {
            const novaNotificacao = new Notificacao({
                destinatarioId,
                tipo,
                mensagem,
                embed: embed ? embed.toJSON() : null,
                dadosRelacionados,
                lida: false // Começa como não lida.
            });
            await novaNotificacao.save();
        }

    } catch (error) {
        // Tratar erros específicos da API do Discord
        if (error.code === 50001) { // Missing Access
            console.error(`[NotificacaoService] Erro ao enviar para ${destinatarioId}: Sem acesso ao canal ${canalDestino?.id || "desconhecido"}.`);
        } else if (error.code === 50007) { // Cannot send messages to this user
             console.error(`[NotificacaoService] Erro ao enviar DM para ${destinatarioId}: Usuário bloqueou o bot ou DMs estão desativadas.`);
        } else {
            console.error(`[NotificacaoService] Erro genérico ao enviar notificação tipo '${tipo}' para ${destinatarioId}:`, error);
        }
    }
}

// --- Funções específicas para cada tipo de notificação --- 

async function notificarMetaAtingida(client, usuarioId, tipoMeta, item, meta, progresso) {
    const tipoNotificacao = tipoMeta === "diaria" ? "meta_diaria_usuario" : "meta_semanal_usuario";
    const emoji = tipoMeta === "diaria" ? EMOJIS.SUCESSO : "🏆";
    const mensagem = `Parabéns, <@${usuarioId}>! ${emoji} Você atingiu sua meta ${tipoMeta} de ${meta} para o item **${item}** (Progresso: ${progresso})!`;
    
    const embed = new EmbedBuilder()
        .setColor(CORES.SUCESSO)
        .setTitle(`Meta ${tipoMeta.charAt(0).toUpperCase() + tipoMeta.slice(1)} Atingida!`)
        .setDescription(`Item: **${item}**\nMeta: ${meta}\nProgresso Atual: ${progresso}`)
        .setTimestamp();

    await enviarNotificacao(client, usuarioId, tipoNotificacao, mensagem, embed, { itemId: item, meta, progresso });
}

async function notificarProximidadeMeta(client, usuarioId, tipoMeta, item, meta, progresso, limiar) {
    const tipoNotificacao = "proximidade_meta_usuario";
    const percentual = Math.round((progresso / meta) * 100);
    const mensagem = `Atenção, <@${usuarioId}>! 🔥 Você está quase lá! Atingiu ${percentual}% da sua meta ${tipoMeta} de ${meta} para o item **${item}**.`;

    const embed = new EmbedBuilder()
        .setColor(CORES.ALERTA)
        .setTitle("Quase Lá!")
        .setDescription(`Item: **${item}**\nMeta ${tipoMeta}: ${meta}\nProgresso Atual: ${progresso} (${percentual}%)`)
        .setTimestamp();

    // TODO: Adicionar lógica para evitar spam (ex: checar se já enviou hoje/semana)
    await enviarNotificacao(client, usuarioId, tipoNotificacao, mensagem, embed, { itemId: item, tipoMeta, meta, progresso, limiar });
}

// --- Funções para Gerentes (Chamadas por comandos manuais ou agendamento) ---

async function gerarResumoDiario(client, interaction = null) {
    console.log("[NotificacaoService] Gerando Resumo Diário...");
    try {
        const itensComMetas = await Estoque.find({ "metasUsuarios.0": { $exists: true } }).lean();
        let usuariosAtingiramMeta = 0;
        let totalMetasDefinidas = 0;
        let topPerformers = []; // { usuarioId, usuarioNome, item, progresso, meta }

        for (const item of itensComMetas) {
            for (const metaUsuario of item.metasUsuarios) {
                if (metaUsuario.metaDiaria > 0) {
                    totalMetasDefinidas++;
                    if (metaUsuario.progressoDiario >= metaUsuario.metaDiaria) {
                        usuariosAtingiramMeta++;
                        topPerformers.push({ 
                            usuarioId: metaUsuario.usuarioId, 
                            usuarioNome: metaUsuario.usuarioNome, 
                            item: item.item, 
                            progresso: metaUsuario.progressoDiario, 
                            meta: metaUsuario.metaDiaria 
                        });
                    }
                }
            }
        }
        
        // Ordenar top performers por quem mais excedeu a meta (percentualmente)
        topPerformers.sort((a, b) => (b.progresso / b.meta) - (a.progresso / a.meta));
        topPerformers = topPerformers.slice(0, 5); // Pegar top 5

        const embed = new EmbedBuilder()
            .setColor(CORES.INFO)
            .setTitle("📊 Resumo Diário de Metas")
            .setDescription(`Resumo do desempenho diário da equipe:`)
            .addFields(
                { name: "Usuários que Atingiram Metas", value: `${usuariosAtingiramMeta} / ${totalMetasDefinidas}`, inline: true },
                { name: "Top 5 Desempenhos (Diário)", value: topPerformers.length > 0 ? topPerformers.map(p => `<@${p.usuarioId}>: ${p.progresso}/${p.meta} em **${p.item}**`).join("\n") : "Nenhum destaque hoje." }
            )
            .setTimestamp();

        const tipoNotificacao = interaction ? "resumo_diario_gerente_manual" : "resumo_diario_gerente_auto";
        await enviarNotificacao(client, process.env.CANAL_NOTIFICACOES_ID, tipoNotificacao, "Segue o resumo diário de metas:", embed, {}, false);
        
        if (interaction) {
            await interaction.reply({ content: "Resumo diário gerado e enviado para o canal de notificações.", ephemeral: true });
        }
    } catch (error) {
        console.error("[NotificacaoService] Erro ao gerar resumo diário:", error);
        if (interaction) {
            await interaction.reply({ content: "Erro ao gerar o resumo diário.", ephemeral: true });
        }
    }
}

async function gerarRelatorioSemanal(client, interaction = null) {
    console.log("[NotificacaoService] Gerando Relatório Semanal...");
     try {
        const itensComMetas = await Estoque.find({ "metasUsuarios.0": { $exists: true } }).lean();
        let usuariosAtingiramMeta = 0;
        let totalMetasDefinidas = 0;
        let performanceGeral = []; // { usuarioId, usuarioNome, item, progresso, meta }

        for (const item of itensComMetas) {
            for (const metaUsuario of item.metasUsuarios) {
                if (metaUsuario.metaSemanal > 0) {
                    totalMetasDefinidas++;
                    if (metaUsuario.progressoSemanal >= metaUsuario.metaSemanal) {
                        usuariosAtingiramMeta++;
                    }
                    performanceGeral.push({ 
                        usuarioId: metaUsuario.usuarioId, 
                        usuarioNome: metaUsuario.usuarioNome, 
                        item: item.item, 
                        progresso: metaUsuario.progressoSemanal, 
                        meta: metaUsuario.metaSemanal 
                    });
                }
            }
        }
        
        // Ordenar por quem mais atingiu a meta (percentualmente)
        performanceGeral.sort((a, b) => (b.progresso / b.meta) - (a.progresso / a.meta));
        const topPerformers = performanceGeral.slice(0, 5); // Top 5 da semana

        const embed = new EmbedBuilder()
            .setColor(CORES.INFO)
            .setTitle("📅 Relatório Semanal Comparativo")
            .setDescription(`Visão geral do desempenho semanal da equipe:`)
            .addFields(
                { name: "Usuários que Atingiram Metas Semanais", value: `${usuariosAtingiramMeta} / ${totalMetasDefinidas}`, inline: true },
                { name: "Top 5 Desempenhos (Semanal)", value: topPerformers.length > 0 ? topPerformers.map(p => `<@${p.usuarioId}>: ${p.progresso}/${p.meta} em **${p.item}**`).join("\n") : "Nenhum destaque esta semana." }
                // TODO: Adicionar comparação entre cargos se necessário
            )
            .setTimestamp();

        const tipoNotificacao = interaction ? "relatorio_semanal_gerente_manual" : "relatorio_semanal_gerente_auto";
        await enviarNotificacao(client, process.env.CANAL_NOTIFICACOES_ID, tipoNotificacao, "Segue o relatório semanal comparativo:", embed, {}, false);
        
        if (interaction) {
            await interaction.reply({ content: "Relatório semanal gerado e enviado para o canal de notificações.", ephemeral: true });
        }
    } catch (error) {
        console.error("[NotificacaoService] Erro ao gerar relatório semanal:", error);
        if (interaction) {
            await interaction.reply({ content: "Erro ao gerar o relatório semanal.", ephemeral: true });
        }
    }
}

// --- Funções para Lembretes e Alertas (Agendamento) ---

async function enviarLembretesMetasNaoAtingidas(client, tipoPeriodo) {
    console.log(`[NotificacaoService] Iniciando verificação de lembretes ${tipoPeriodo}...`);
    try {
        const itensComMetas = await Estoque.find({ "metasUsuarios.0": { $exists: true } }).lean();
        const campoProgresso = tipoPeriodo === "diario" ? "progressoDiario" : "progressoSemanal";
        const campoMeta = tipoPeriodo === "diario" ? "metaDiaria" : "metaSemanal";

        for (const item of itensComMetas) {
            for (const metaUsuario of item.metasUsuarios) {
                if (metaUsuario[campoMeta] > 0 && metaUsuario[campoProgresso] < metaUsuario[campoMeta]) {
                    // Verifica se o usuário quer receber este lembrete (já feito dentro de enviarNotificacao)
                    const mensagem = `🔔 Lembrete: Sua meta ${tipoPeriodo} para **${item.item}** (${metaUsuario[campoMeta]}) ainda não foi atingida (${metaUsuario[campoProgresso]}).`;
                    const embed = new EmbedBuilder()
                        .setColor(CORES.ATENCAO)
                        .setTitle(`Lembrete de Meta ${tipoPeriodo.charAt(0).toUpperCase() + tipoPeriodo.slice(1)}`) 
                        .setDescription(`Item: **${item.item}**\nMeta: ${metaUsuario[campoMeta]}\nProgresso: ${metaUsuario[campoProgresso]}`)
                        .setTimestamp();
                    
                    await enviarNotificacao(client, metaUsuario.usuarioId, "lembrete_meta_usuario", mensagem, embed, { itemId: item.item, tipoMeta: tipoPeriodo });
                }
            }
        }
        console.log(`[NotificacaoService] Verificação de lembretes ${tipoPeriodo} concluída.`);
    } catch (error) {
        console.error(`[NotificacaoService] Erro ao enviar lembretes ${tipoPeriodo}:`, error);
    }
}

async function enviarAlertasAltoDesempenho(client, usuarioId, itemId, tipoMeta, meta, progresso) {
     // Chamado de metricasHelper se progresso > X% da meta
    const tipoNotificacao = "alerta_alto_desempenho_gerente";
    const mensagem = `🚀 Desempenho Excepcional! <@${usuarioId}> superou a meta ${tipoMeta} de ${meta} para o item **${itemId}**, atingindo ${progresso}!`;
    
    const embed = new EmbedBuilder()
        .setColor("#00FF00") // Verde brilhante
        .setTitle("Desempenho Excepcional!")
        .setDescription(`Usuário: <@${usuarioId}>\nItem: **${itemId}**\nMeta ${tipoMeta}: ${meta}\nProgresso: ${progresso}`)
        .setTimestamp();

    await enviarNotificacao(client, process.env.CANAL_NOTIFICACOES_ID, tipoNotificacao, mensagem, embed, { usuarioId, itemId, tipoMeta, meta, progresso }, false); // Não salva histórico para alerta de gerência
}

async function enviarAlertasBaixoDesempenho(client, tipoPeriodo) {
    console.log(`[NotificacaoService] Iniciando verificação de baixo desempenho ${tipoPeriodo}...`);
    try {
        const itensComMetas = await Estoque.find({ "metasUsuarios.0": { $exists: true } }).lean();
        const campoProgresso = tipoPeriodo === "diario" ? "progressoDiario" : "progressoSemanal";
        const campoMeta = tipoPeriodo === "diario" ? "metaDiaria" : "metaSemanal";
        const thresholdPercent = 0.25; // Ex: Alerta se < 25% da meta
        let usuariosBaixoDesempenho = []; // { usuarioId, usuarioNome, item, progresso, meta }

        for (const item of itensComMetas) {
            for (const metaUsuario of item.metasUsuarios) {
                if (metaUsuario[campoMeta] > 0) {
                    const percentualAtingido = metaUsuario[campoProgresso] / metaUsuario[campoMeta];
                    if (percentualAtingido < thresholdPercent) {
                        usuariosBaixoDesempenho.push({
                            usuarioId: metaUsuario.usuarioId,
                            usuarioNome: metaUsuario.usuarioNome,
                            item: item.item,
                            progresso: metaUsuario[campoProgresso],
                            meta: metaUsuario[campoMeta]
                        });
                    }
                }
            }
        }

        if (usuariosBaixoDesempenho.length > 0) {
            // Agrupar por usuário para evitar spam
            const agrupadoPorUsuario = usuariosBaixoDesempenho.reduce((acc, curr) => {
                acc[curr.usuarioId] = acc[curr.usuarioId] || { nome: curr.usuarioNome, itens: [] };
                acc[curr.usuarioId].itens.push(`**${curr.item}** (${curr.progresso}/${curr.meta})`);
                return acc;
            }, {});

            let description = `Os seguintes usuários apresentaram baixo desempenho (<${thresholdPercent * 100}%) em suas metas ${tipoPeriodo}:

`;
            for (const userId in agrupadoPorUsuario) {
                description += `<@${userId}> (${agrupadoPorUsuario[userId].nome}): ${agrupadoPorUsuario[userId].itens.join(", ")}\n`;
            }

            const embed = new EmbedBuilder()
                .setColor(CORES.ERRO)
                .setTitle(`🚨 Alerta de Baixo Desempenho (${tipoPeriodo.charAt(0).toUpperCase() + tipoPeriodo.slice(1)})`)
                .setDescription(description)
                .setTimestamp();

            await enviarNotificacao(client, process.env.CANAL_NOTIFICACOES_ID, "alerta_baixo_desempenho_gerente", "Alerta de baixo desempenho detectado:", embed, {}, false);
        } else {
            console.log(`[NotificacaoService] Nenhum baixo desempenho detectado para o período ${tipoPeriodo}.`);
        }
        console.log(`[NotificacaoService] Verificação de baixo desempenho ${tipoPeriodo} concluída.`);
    } catch (error) {
        console.error(`[NotificacaoService] Erro ao verificar baixo desempenho ${tipoPeriodo}:`, error);
    }
}


module.exports = {
    enviarNotificacao,
    notificarMetaAtingida,
    notificarProximidadeMeta,
    gerarResumoDiario,
    gerarRelatorioSemanal,
    // Funções de agendamento
    enviarLembretesMetasNaoAtingidas, 
    enviarAlertasAltoDesempenho,
    enviarAlertasBaixoDesempenho
};

