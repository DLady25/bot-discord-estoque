// Utilitário para validação de entrada de dados
// Centraliza funções de validação para uso em todos os comandos

module.exports = {
  // Validação de quantidade
  validarQuantidade: (quantidade) => {
    // Verifica se é um número
    if (isNaN(quantidade)) return { valido: false, mensagem: 'A quantidade deve ser um número.' };
    
    // Converte para número
    const num = Number(quantidade);
    
    // Verifica se é positivo
    if (num <= 0) return { valido: false, mensagem: 'A quantidade deve ser maior que zero.' };
    
    // Verifica se é inteiro
    if (!Number.isInteger(num)) return { valido: false, mensagem: 'A quantidade deve ser um número inteiro.' };
    
    // Verifica se está dentro de limites razoáveis
    if (num > 1000000) return { valido: false, mensagem: 'A quantidade é muito grande. Máximo: 1.000.000.' };
    
    return { valido: true, valor: num };
  },
  
  // Validação de nome de item
  validarNomeItem: (nome) => {
    if (!nome) return { valido: false, mensagem: 'O nome do item não pode estar vazio.' };
    
    // Remove espaços extras e converte para minúsculas
    const nomeProcessado = nome.trim().toLowerCase();
    
    // Verifica tamanho mínimo
    if (nomeProcessado.length < 2) return { valido: false, mensagem: 'O nome do item deve ter pelo menos 2 caracteres.' };
    
    // Verifica tamanho máximo
    if (nomeProcessado.length > 50) return { valido: false, mensagem: 'O nome do item deve ter no máximo 50 caracteres.' };
    
    // Verifica caracteres especiais indesejados
    const regex = /^[a-záàâãéèêíïóôõöúçñ0-9\s-]+$/i;
    if (!regex.test(nomeProcessado)) return { 
      valido: false, 
      mensagem: 'O nome do item contém caracteres inválidos. Use apenas letras, números, espaços e hífen.' 
    };
    
    return { valido: true, valor: nomeProcessado };
  },
  
  // Validação de categoria
  validarCategoria: (categoria) => {
    if (!categoria) return { valido: true, valor: 'geral' }; // Valor padrão se não fornecido
    
    // Remove espaços extras e converte para minúsculas
    const categoriaProcessada = categoria.trim().toLowerCase();
    
    // Verifica tamanho mínimo
    if (categoriaProcessada.length < 2) return { valido: false, mensagem: 'A categoria deve ter pelo menos 2 caracteres.' };
    
    // Verifica tamanho máximo
    if (categoriaProcessada.length > 30) return { valido: false, mensagem: 'A categoria deve ter no máximo 30 caracteres.' };
    
    // Verifica caracteres especiais indesejados
    const regex = /^[a-záàâãéèêíïóôõöúçñ0-9\s-]+$/i;
    if (!regex.test(categoriaProcessada)) return { 
      valido: false, 
      mensagem: 'A categoria contém caracteres inválidos. Use apenas letras, números, espaços e hífen.' 
    };
    
    return { valido: true, valor: categoriaProcessada };
  },
  
  // Validação de descrição
  validarDescricao: (descricao) => {
    if (!descricao) return { valido: true, valor: '' }; // Valor padrão se não fornecido
    
    // Remove espaços extras
    const descricaoProcessada = descricao.trim();
    
    // Verifica tamanho máximo
    if (descricaoProcessada.length > 200) return { 
      valido: false, 
      mensagem: 'A descrição deve ter no máximo 200 caracteres.' 
    };
    
    return { valido: true, valor: descricaoProcessada };
  },
  
  // Validação de ID de usuário
  validarUsuarioId: (id) => {
    if (!id) return { valido: false, mensagem: 'ID de usuário não fornecido.' };
    
    // Verifica formato de Snowflake do Discord
    const regex = /^\d{17,20}$/;
    if (!regex.test(id)) return { valido: false, mensagem: 'ID de usuário inválido.' };
    
    return { valido: true, valor: id };
  },
  
  // Validação de ID de cargo
  validarCargoId: (id) => {
    if (!id) return { valido: false, mensagem: 'ID de cargo não fornecido.' };
    
    // Verifica formato de Snowflake do Discord
    const regex = /^\d{17,20}$/;
    if (!regex.test(id)) return { valido: false, mensagem: 'ID de cargo inválido.' };
    
    return { valido: true, valor: id };
  }
};
