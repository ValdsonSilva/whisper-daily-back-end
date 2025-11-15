import fp from 'fastify-plugin';
import { ZodType } from 'zod';

export default fp(async (app: any) => {
  app.setValidatorCompiler(({ schema }: any) => {
    return (data: any) => {
      const parsed = (schema as ZodType).safeParse(data);
      return parsed.success ? { value: parsed.data } : { error: parsed.error };
    };
  });

  app.setSerializerCompiler(() => (payload: any) => JSON.stringify(payload));
});
