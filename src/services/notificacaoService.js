// Serviço de Notificações

const { EmbedBuilder } = require("discord.js");
const Notificacao = require("../models/Notificacao");
const NotificacaoConfigUsuario = require("../models/NotificacaoConfigUsuario");
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
            canalDestino = configUsuario?.canalPreferencial === "DM" ? target : await client.channels.fetch(configUsuario?.canalPreferencial || destinatarioId);
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
             // Fallback para DM se canal preferencial não for encontrado ou for inválido
            if (target.constructor.name === 'User') {
                canalDestino = target;
            } else {
                 console.error(`[NotificacaoService] Canal de destino inválido ou não encontrado para ${destinatarioId}`);
                 return;
            }
        }

        // Verifica configurações do usuário (se aplicável)
        if (configUsuario) {
            switch (tipo) {
                case "meta_diaria_usuario":
                    if (!configUsuario.notificarMetaDiariaAtingida) return;
                    break;
                case "meta_semanal_usuario":
                    if (!configUsuario.notificarMetaSemanalAtingida) return;
                    break;
                case "proximidade_meta_usuario":
                    if (!configUsuario.notificarProximidadeMeta) return;
                    break;
                case "lembrete_meta_usuario":
                    if (!configUsuario.notificarMetasNaoAtingidas) return;
                    break;
            }
        }

        // Envia a mensagem
        const payload = {
            content: mensagem,
            embeds: embed ? [embed] : []
        };

        await canalDestino.send(payload);
        console.log(`[NotificacaoService] Notificação tipo '${tipo}' enviada para ${destinatarioId}`);

        // Salva no histórico (se habilitado)
        if (salvarHistorico) {
            const novaNotificacao = new Notificacao({
                destinatarioId,
                tipo,
                mensagem,
                embed: embed ? embed.toJSON() : null,
                dadosRelacionados,
                lida: false // Notificações para canais não são marcadas como lidas individualmente
                           // Para DMs, começa como não lida.
            });
            await novaNotificacao.save();
        }

    } catch (error) {
        console.error(`[NotificacaoService] Erro ao enviar notificação tipo '${tipo}' para ${destinatarioId}:`, error);
        // Considerar logar erro em um canal específico ou sistema de monitoramento
    }
}

// --- Funções específicas para cada tipo de notificação --- 

async function notificarMetaAtingida(client, usuarioId, tipoMeta, item, meta, progresso) {
    const tipoNotificacao = tipoMeta === 'diaria' ? 'meta_diaria_usuario' : 'meta_semanal_usuario';
    const emoji = tipoMeta === 'diaria' ? EMOJIS.SUCESSO : '🏆';
    const mensagem = `Parabéns, <@${usuarioId}>! ${emoji} Você atingiu sua meta ${tipoMeta} de ${meta} para o item **${item}** (Progresso: ${progresso})!`;
    
    const embed = new EmbedBuilder()
        .setColor(CORES.SUCESSO)
        .setTitle(`Meta ${tipoMeta.charAt(0).toUpperCase() + tipoMeta.slice(1)} Atingida!`)
        .setDescription(`Item: **${item}**\nMeta: ${meta}\nProgresso Atual: ${progresso}`)
        .setTimestamp();

    await enviarNotificacao(client, usuarioId, tipoNotificacao, mensagem, embed, { itemId: item, meta, progresso });
}

async function notificarProximidadeMeta(client, usuarioId, tipoMeta, item, meta, progresso, limiar) {
    const tipoNotificacao = 'proximidade_meta_usuario';
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

// --- Funções para Gerentes (Chamadas por comandos manuais ou agendamento futuro) ---

async function gerarResumoDiario(client, interaction) {
    // TODO: Implementar lógica para buscar dados e formatar resumo diário
    // Exemplo: Buscar todos os Estoque.metasUsuarios com progressoDiario >= metaDiaria
    // Agrupar por cargo, etc.
    const embed = new EmbedBuilder()
        .setColor(CORES.INFO)
        .setTitle("📊 Resumo Diário de Metas (Manual)")
        .setDescription("Lógica de resumo diário a ser implementada.")
        .setTimestamp();

    await enviarNotificacao(client, process.env.CANAL_NOTIFICACOES_ID, 'resumo_diario_gerente', "Segue o resumo diário solicitado:", embed, {}, false); // Não salva histórico de comando manual?
    if (interaction) await interaction.reply({ content: "Resumo diário gerado e enviado para o canal de notificações.", ephemeral: true });
}

async function gerarRelatorioSemanal(client, interaction) {
    // TODO: Implementar lógica para buscar dados e formatar relatório semanal
    // Exemplo: Buscar progressoSemanal, comparar com metaSemanal, comparar cargos...
    const embed = new EmbedBuilder()
        .setColor(CORES.INFO)
        .setTitle("📅 Relatório Semanal Comparativo (Manual)")
        .setDescription("Lógica de relatório semanal a ser implementada.")
        .setTimestamp();

    await enviarNotificacao(client, process.env.CANAL_NOTIFICACOES_ID, 'relatorio_semanal_gerente', "Segue o relatório semanal solicitado:", embed, {}, false);
    if (interaction) await interaction.reply({ content: "Relatório semanal gerado e enviado para o canal de notificações.", ephemeral: true });
}

// --- Funções para Lembretes e Alertas (Agendamento futuro) ---
// A estrutura está aqui, mas a chamada automática está desativada.

async function enviarLembretesMetasNaoAtingidas(client, tipoPeriodo) {
    console.log(`[NotificacaoService] Iniciando verificação de lembretes ${tipoPeriodo} (Agendamento Desativado)`);
    // TODO: Implementar busca por usuários com metas não atingidas no período
    // Para cada usuário, buscar config e enviar notificação tipo 'lembrete_meta_usuario'
}

async function enviarAlertasAltoDesempenho(client, usuarioId, itemId, tipoMeta, meta, progresso) {
     // Chamado de metricasHelper se progresso > X% da meta
    const tipoNotificacao = 'alerta_alto_desempenho_gerente';
    const mensagem = `🚀 Desempenho Excepcional! <@${usuarioId}> superou a meta ${tipoMeta} de ${meta} para o item **${itemId}**, atingindo ${progresso}!`;
    
    const embed = new EmbedBuilder()
        .setColor('#00FF00') // Verde brilhante
        .setTitle("Desempenho Excepcional!")
        .setDescription(`Usuário: <@${usuarioId}>\nItem: **${itemId}**\nMeta ${tipoMeta}: ${meta}\nProgresso: ${progresso}`)
        .setTimestamp();

    await enviarNotificacao(client, process.env.CANAL_NOTIFICACOES_ID, tipoNotificacao, mensagem, embed, { usuarioId, itemId, tipoMeta, meta, progresso });
}

async function enviarAlertasBaixoDesempenho(client, tipoPeriodo) {
    console.log(`[NotificacaoService] Iniciando verificação de baixo desempenho ${tipoPeriodo} (Agendamento Desativado)`);
    // TODO: Implementar busca por usuários com baixo desempenho
    // Enviar notificação tipo 'alerta_baixo_desempenho_gerente' para o canal
}


module.exports = {
    enviarNotificacao,
    notificarMetaAtingida,
    notificarProximidadeMeta,
    gerarResumoDiario,
    gerarRelatorioSemanal,
    // Funções de agendamento (chamadas manualmente ou por cron no futuro)
    enviarLembretesMetasNaoAtingidas, 
    enviarAlertasAltoDesempenho,
    enviarAlertasBaixoDesempenho
};

