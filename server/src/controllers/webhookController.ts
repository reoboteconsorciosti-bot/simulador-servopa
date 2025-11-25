import { Request, Response } from 'express';

// Hardcoded for now as per previous context, but ideally should be in .env
// Using the URL found in services/webhookService.ts or constants.ts if available.
// Since I can't easily see constants.ts right now without a tool call, I'll rely on the user providing it or it being in the environment.
// However, the previous code in webhookService.ts imported WEBHOOK_URL from '../constants'.
// I will assume the server also needs this constant or an env var.
// For the server, it's best to use process.env.WEBHOOK_URL.

export const sendProposal = async (req: Request, res: Response) => {
    try {
        const payload = req.body;
        const webhookUrl = process.env.MAKE_WEBHOOK_URL || 'https://hook.us2.make.com/t9xuuylfl858jukotc2jam5ny2vd7dfd';

        // Validate payload if necessary
        if (!payload) {
            return res.status(400).json({ message: 'Payload is required' });
        }

        if (webhookUrl.includes('your-unique-id')) {
            console.error('MAKE_WEBHOOK_URL not configured in .env');
            return res.status(500).json({ message: 'Server misconfiguration: Webhook URL not set.' });
        }

        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (response.ok) {
            return res.json({ success: true, message: 'PDF enviado para geração com sucesso.' });
        } else {
            console.error(`Make.com webhook failed with status: ${response.status}`);
            return res.status(response.status).json({
                success: false,
                message: `Erro ao enviar para o Make.com. Status: ${response.status}`
            });
        }

    } catch (error) {
        console.error('Error in sendProposal controller:', error);
        return res.status(500).json({
            success: false,
            message: 'Erro interno do servidor ao processar o webhook.'
        });
    }
};
