// import Fastify, { FastifyReply, FastifyRequest } from 'fastify';

// const app = Fastify();
// const huggingFaceApiKey = 'your-hugging-face-api-key';

// // Rota para interação com o modelo Llama
// app.post('/ask', async (req: FastifyRequest, reply: FastifyReply) => {
//   const { question } = req.body;

//   try {
//     const response = await app.post(
//       'https://api-inference.huggingface.co/models/your-model-name',
//       {
//         inputs: question,
//       },
//       {
//         headers: {
//           Authorization: `Bearer ${huggingFaceApiKey}`,
//         },
//       }
//     );

//     reply.status(200).send({ answer: response.data.generated_text });
//   } catch (error) {
//     reply.status(500).send({ error: 'Erro ao acessar o modelo', details: error.message });
//   }
// });

// app.listen(3000, (err, address) => {
//   if (err) {
//     console.error(err);
//     process.exit(1);
//   }
//   console.log(`Server listening at ${address}`);
// });

// src/modules/whisper/whisper.routes.ts
import { FastifyInstance } from 'fastify';
import { WhisperService } from './whisper.service';
import { WhisperMode } from './whisper.huggingFace.types';

export async function whisperRoutes(app: FastifyInstance) {
    app.post('/ai/whisper/reply', async (req, reply) => {
        try {
            const body = req.body as {
                message: string;
                mode?: WhisperMode; // manhã / noite / geral (conversa livre)
                context?: any;
            };

            if (!body?.message || typeof body.message !== 'string') {
                return reply.code(400).send({ message: 'message is required' });
            }

            const response = await WhisperService.generateReply({
                message: body.message,
                mode: body.mode ?? 'general',
                context: body.context,
            });

            return reply.code(200).send(response);
        } catch (error: any) {
            console.error('\nWhisper AI Liama endpoint error:', error);
            return reply.code(500).send({ message: 'Erro ao gerar resposta da Whisper' });
        }
    });
}

/**
 * Resumo do fluxo (do app até a IA)
 * O app (WhisperDaily) manda um POST para /ai/whisper/reply com:
 * {
  "message": "Hoje acordei cansado, meio desanimado.",
  "mode": "morning",
  "context": {
    "currentIntention": "ser mais gentil comigo",
    "whisperLeafEarnedToday": false,
    "lastMessages": [
      { "from": "user", "text": "Ontem foi pesado no trabalho." }
    ]
  }
}
 */
