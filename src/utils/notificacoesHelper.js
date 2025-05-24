const { EmbedBuilder } = require('discord.js');
const { CORES, EMOJIS } = require('./visualHelper');

/**
 * Sistema de notificações para o bot de estoque
 * Gerencia notificações para usuários e gerentes sobre metas e atualizações
 */

// Função para criar embed de notificação baseado no tipo
const criarEmbedNotificacao = (tipo, dados) => {
  let embed = new EmbedBuilder()
    .setTimestamp();
  
  switch (tipo) {
    case 'meta_diaria_atingida':
      embed.setColor(CORES.SUCESSO)
        .setTitle(`${EMOJIS.SUCESSO} Meta Diária Atingida!`)
        .setDescription(`Você atingiu sua meta diária para **${dados.item}**!`)
        .addFields(
          { name: 'Meta', value: `${dados.meta}`, inline: true },
          { name: 'Progresso', value: `${dados.progresso}`, inline: true }
        )
        .setFooter({ text: 'Continue com o bom trabalho!' });
      break;
      
    case 'meta_semanal_atingida':
      embed.setColor(CORES.SUCESSO)
        .setTitle(`${EMOJIS.SUCESSO} Meta Semanal Atingida!`)
        .setDescription(`Você atingiu sua meta semanal para **${dados.item}**!`)
        .addFields(
          { name: 'Meta', value: `${dados.meta}`, inline: true },
          { name: 'Progresso', value: `${dados.progresso}`, inline: true }
        )
        .setFooter({ text: 'Excelente trabalho!' });
      break;
      
    case 'meta_proxima':
      embed.setColor(CORES.ALERTA)
        .setTitle(`${EMOJIS.ALERTA} Quase lá!`)
        .setDescription(`Você está próximo de atingir sua meta para **${dados.item}**!`)
        .addFields(
          { name: 'Meta', value: `${dados.meta}`, inline: true },
          { name: 'Progresso', value: `${dados.progresso} (${dados.porcentagem}%)`, inline: true },
          { name: 'Restante', value: `${dados.restante}`, inline: true }
        )
        .setFooter({ text: 'Continue assim!' });
      break;
      
    case 'meta_usuario_atingida':
      embed.setColor(CORES.SUCESSO)
        .setTitle(`${EMOJIS.SUCESSO} Meta Atingida por Usuário`)
        .setDescription(`**${dados.usuarioNome}** atingiu a meta ${dados.tipo} para **${dados.item}**!`)
        .addFields(
          { name: 'Meta', value: `${dados.meta}`, inline: true },
          { name: 'Tipo', value: `${dados.tipo}`, inline: true }
        )
        .setFooter({ text: 'Notificação para gerentes' });
      break;
      
    case 'meta_nao_atingida':
      embed.setColor(CORES.ERRO)
        .setTitle(`${EMOJIS.ALERTA} Meta Não Atingida`)
        .setDescription(`Sua meta ${dados.tipo} para **${dados.item}** não foi atingida.`)
        .addFields(
          { name: 'Meta', value: `${dados.meta}`, inline: true },
          { name: 'Progresso', value: `${dados.progresso} (${dados.porcentagem}%)`, inline: true }
        )
        .setFooter({ text: 'Tente novamente amanhã!' });
      break;
      
    case 'resumo_diario':
      embed.setColor(CORES.PRIMARIO)
        .setTitle(`${EMOJIS.ESTATISTICAS} Resumo Diário de Metas`)
        .setDescription(`Resumo de desempenho do dia ${dados.data}`)
        .addFields(
          { name: 'Metas Atingidas', value: `${dados.metasAtingidas}`, inline: true },
          { name: 'Metas Pendentes', value: `${dados.metasPendentes}`, inline: true },
          { name: 'Taxa de Sucesso', value: `${dados.taxaSucesso}%`, inline: true }
        );
      
      // Adicionar top performers se existirem
      if (dados.topPerformers && dados.topPerformers.length > 0) {
        let topList = '';
        dados.topPerformers.forEach((user, index) => {
          topList += `${index + 1}. **${user.nome}**: ${user.progresso} ${user.item}\n`;
        });
        embed.addFields({ name: 'Top Performers', value: topList });
      }
      
      embed.setFooter({ text: 'Relatório gerado automaticamente' });
      break;
      
    default:
      embed.setColor(CORES.PRIMARIO)
        .setTitle('Notificação')
        .setDescription(dados.mensagem || 'Nova notificação do sistema');
      break;
  }
  
  return embed;
};

// Enviar notificação para um usuário específico
const enviarNotificacaoUsuario = async (client, usuarioId, tipo, dados) => {
  try {
    const usuario = await client.users.fetch(usuarioId);
    const embed = criarEmbedNotificacao(tipo, dados);
    await usuario.send({ embeds: [embed] });
    console.log(`Notificação enviada para usuário ${usuarioId}: ${tipo}`);
    return true;
  } catch (error) {
    console.error(`Erro ao enviar notificação para usuário ${usuarioId}:`, error);
    return false;
  }
};

// Enviar notificação para todos os usuários com um cargo específico
const enviarNotificacaoGerentes = async (client, cargoId, tipo, dados) => {
  try {
    // Buscar todos os servidores onde o bot está
    const guilds = client.guilds.cache;
    let envios = 0;
    
    // Para cada servidor
    for (const [guildId, guild] of guilds) {
      try {
        // Buscar o cargo
        const cargo = await guild.roles.fetch(cargoId);
        if (!cargo) continue;
        
        // Buscar membros com o cargo
        const membros = cargo.members;
        
        // Enviar para cada membro
        for (const [memberId, membro] of membros) {
          await enviarNotificacaoUsuario(client, memberId, tipo, dados);
          envios++;
        }
      } catch (guildError) {
        console.error(`Erro ao processar guild ${guildId}:`, guildError);
      }
    }
    
    console.log(`Notificação enviada para ${envios} gerentes: ${tipo}`);
    return envios;
  } catch (error) {
    console.error(`Erro ao enviar notificação para gerentes:`, error);
    return 0;
  }
};

// Enviar notificação para um canal específico
const enviarNotificacaoCanal = async (client, canalId, tipo, dados) => {
  try {
    const canal = await client.channels.fetch(canalId);
    const embed = criarEmbedNotificacao(tipo, dados);
    await canal.send({ embeds: [embed] });
    console.log(`Notificação enviada para canal ${canalId}: ${tipo}`);
    return true;
  } catch (error) {
    console.error(`Erro ao enviar notificação para canal ${canalId}:`, error);
    return false;
  }
};

// Verificar se um usuário está próximo de atingir uma meta
const verificarProximidadeMeta = (meta, progresso) => {
  if (!meta || meta <= 0 || !progresso) return false;
  
  const porcentagem = (progresso / meta) * 100;
  // Retorna true se o progresso estiver entre 80% e 99% da meta
  return porcentagem >= 80 && porcentagem < 100;
};

// Calcular porcentagem de progresso
const calcularPorcentagem = (meta, progresso) => {
  if (!meta || meta <= 0 || !progresso) return 0;
  return Math.round((progresso / meta) * 100);
};

module.exports = {
  enviarNotificacaoUsuario,
  enviarNotificacaoGerentes,
  enviarNotificacaoCanal,
  verificarProximidadeMeta,
  calcularPorcentagem
};
