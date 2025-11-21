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
  if (!WEBHOOK_URL || WEBHOOK_URL.includes('your-unique-id')) {
      return {
          success: false,
          message: "URL do Webhook não configurado. Por favor, edite `constants.ts`."
      };
  }
  
  try {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (response.ok) {
      return {
        success: true,
        message: "PDF enviado para geração com sucesso.",
      };
    } else {
       // Fornece uma mensagem de erro mais útil para o problema de IP
      if (response.status === 403) {
        return {
          success: false,
          message: `Erro 403: Acesso negado. O Make.com pode estar bloqueando o IP. (Vide nota em webhookService.ts)`,
        };
      }
      return {
        success: false,
        message: `Erro ao enviar dados para geração do PDF. Status: ${response.status}.`,
      };
    }
  } catch (error) {
    console.error("Webhook call failed:", error);
    return {
      success: false,
      message: "Erro de conexão. A chamada direta ao Webhook falhou, possivelmente devido a bloqueio de IP.",
    };
  }
};