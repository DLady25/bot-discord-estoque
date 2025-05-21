const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const Estoque = require('../models/Estoque');
const { CORES, EMOJIS, TEXTOS, formatarNomeItem } = require('../utils/visualHelper');
const { validarNomeItem, validarCategoria, validarDescricao } = require('../utils/validacaoHelper');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('item-novo')
    .setDescription('Adiciona um novo tipo de item ao sistema')
    .addStringOption(option =>
      option.setName('nome')
        .setDescription('Nome do novo item')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('categoria')
        .setDescription('Categoria do item')
        .setRequired(false))
    .addStringOption(option =>
      option.setName('descricao')
        .setDescription('Descrição do item')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.MANAGE_GUILD),
        
  async execute(interaction) {
    // Validar nome do item
    const nomeInput = interaction.options.getString('nome');
    const nomeValidacao = validarNomeItem(nomeInput);
    
    if (!nomeValidacao.valido) {
      return await interaction.reply({
        content: `${EMOJIS.ERRO} ${nomeValidacao.mensagem}`,
        ephemeral: true
      });
    }
    
    // Validar categoria
    const categoriaInput = interaction.options.getString('categoria');
    const categoriaValidacao = validarCategoria(categoriaInput);
    
    if (!categoriaValidacao.valido) {
      return await interaction.reply({
        content: `${EMOJIS.ERRO} ${categoriaValidacao.mensagem}`,
        ephemeral: true
      });
    }
    
    // Validar descrição
    const descricaoInput = interaction.options.getString('descricao');
    const descricaoValidacao = validarDescricao(descricaoInput);
    
    if (!descricaoValidacao.valido) {
      return await interaction.reply({
        content: `${EMOJIS.ERRO} ${descricaoValidacao.mensagem}`,
        ephemeral: true
      });
    }
    
    // Usar valores validados
    const nome = nomeValidacao.valor;
    const categoria = categoriaValidacao.valor;
    const descricao = descricaoValidacao.valor;

    try {
      // Verificar se o item já existe
      const itemExistente = await Estoque.findOne({ item: nome });
      
      if (itemExistente) {
        const embed = new EmbedBuilder()
          .setColor(CORES.ERRO)
          .setTitle(`${EMOJIS.ERRO} Erro ao Criar Item`)
          .setDescription(`O item **${formatarNomeItem(nome)}** já existe no sistema.`)
          .addFields({
            name: 'Quantidade atual',
            value: `${itemExistente.quantidade}`,
            inline: true
          });
          
        return await interaction.reply({ 
          embeds: [embed],
          ephemeral: true 
        });
      }

      // Criar novo item
      const novoItem = new Estoque({
        item: nome,
        categoria: categoria,
        descricao: descricao,
        quantidade: 0,
        ativo: true,
        dataCriacao: new Date(),
        dataAtualizacao: new Date()
      });

      await novoItem.save();

      const embed = new EmbedBuilder()
        .setColor(CORES.SUCESSO)
        .setTitle(`${EMOJIS.NOVO} Novo Item Criado`)
        .setDescription(`O item **${formatarNomeItem(nome)}** foi adicionado ao sistema com sucesso!`)
        .addFields(
          {
            name: 'Categoria',
            value: categoria,
            inline: true
          },
          {
            name: 'Descrição',
            value: descricao || 'Nenhuma descrição fornecida',
            inline: true
          }
        )
        .setFooter({ text: `Criado por ${interaction.user.username}` })
        .setTimestamp();

      await interaction.reply({ 
        embeds: [embed],
        ephemeral: false 
      });
      
    } catch (error) {
      console.error('Erro ao criar novo item:', error);
      await interaction.reply({ 
        content: `${EMOJIS.ERRO} ${TEXTOS.ERRO_GENERICO}`,
        ephemeral: true 
      });
    }
  }
};
