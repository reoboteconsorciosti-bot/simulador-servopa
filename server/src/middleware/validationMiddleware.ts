import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const validate = (schema: ZodSchema) => (req: Request, res: Response, next: NextFunction) => {
    try {
        schema.parse(req.body);
        next();
    } catch (error: any) {
        if (error instanceof ZodError) {
            // Format Zod errors into user-friendly Portuguese messages
            const formattedErrors = error.issues.map((err: any) => {
                const field = err.path.join('.');
                let message = '';

                switch (err.code) {
                    case 'invalid_type':
                        if (err.expected === 'string') {
                            message = `O campo "${field}" deve ser um texto.`;
                        } else {
                            message = `O campo "${field}" está com tipo inválido.`;
                        }
                        break;
                    case 'too_small':
                        if (err.type === 'string') {
                            message = `O campo "${field}" deve ter no mínimo ${err.minimum} caracteres.`;
                        } else {
                            message = `O campo "${field}" é muito pequeno.`;
                        }
                        break;
                    case 'invalid_string':
                        if (err.validation === 'email') {
                            message = `Por favor, insira um e-mail válido.`;
                        } else if (err.validation === 'url') {
                            message = `O campo "${field}" deve ser uma URL válida.`;
                        } else {
                            message = `O campo "${field}" está em formato inválido.`;
                        }
                        break;
                    case 'invalid_enum_value':
                        message = `O campo "${field}" deve ser um dos seguintes valores: ${err.options.join(', ')}.`;
                        break;
                    default:
                        message = err.message || `Erro de validação no campo "${field}".`;
                }

                return {
                    field,
                    message
                };
            });

            // Return the first error message as the main message
            const firstError = formattedErrors[0];
            return res.status(400).json({
                message: firstError?.message || 'Erro de validação. Por favor, verifique os dados enviados.',
                errors: formattedErrors
            });
        }

        return res.status(400).json({
            message: 'Erro de validação. Por favor, verifique os dados enviados.',
            errors: []
        });
    }
};
