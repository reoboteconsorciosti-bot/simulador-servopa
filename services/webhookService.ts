import { WEBHOOK_URL } from '../constants';

/**
 * NOTA DE ARQUITETURA IMPORTANTE:
 * 
 * O erro "IP address is not valid" recebido do Make.com indica que o webhook está
 * rejeitando a chamada por motivos de segurança, pois ela se origina de um IP
 * de cliente desconhecido ou não confiável (o navegador do usuário).
 * 
 * A SOLUÇÃO CORRETA E PERMANENTE é NÃO chamar este webhook diretamente do frontend.
 * Em vez disso, o fluxo deve ser:
 * 
 * 1. O frontend (React) salva os dados da simulação no Firestore.
 * 2. Um gatilho (trigger) no Firestore ativa uma Firebase Cloud Function.
 * 3. A Cloud Function (rodando em um servidor seguro do Google) faz a chamada
 *    para o webhook do Make.com.
 * 
 * Esta função é mantida aqui como um placeholder para demonstrar o fluxo, mas em
 * um ambiente de produção, ela seria substituída pela chamada ao Firestore.
 */
export const sendProposalWebhook = async (payload: Record<string, any>): Promise<{ success: boolean; message: string }> => {
  try {
    const token = localStorage.getItem('sim-pro-token');
    if (!token) {
      return {
        success: false,
        message: "Usuário não autenticado. Por favor, faça login novamente."
      };
    }

    const response = await fetch('/api/webhook/proposal', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return {
        success: true,
        message: "PDF enviado para geração com sucesso.",
      };
    } else {
      const data = await response.json();
      return {
        success: false,
        message: data.message || `Erro ao enviar dados. Status: ${response.status}`,
      };
    }
  } catch (error) {
    console.error("Webhook call failed:", error);
    return {
      success: false,
      message: "Erro de conexão com o servidor.",
    };
  }
};