import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { ApiKeysService } from './api-keys.service';
import { agentContext } from '../audit/agent-context';

/**
 * Two concerns handled at the edge so no controller changes are needed:
 *  - P7-04: an `x-api-key` token is resolved to its owning person and the
 *    `x-user-email` header is rewritten, leaving authz/attribution untouched.
 *  - B-03: the `x-agent-tag` header is captured into request-scoped context
 *    for agent attribution on audit rows.
 */
@Injectable()
export class ApiKeyMiddleware implements NestMiddleware {
  constructor(private readonly keys: ApiKeysService) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const tag = req.headers['x-agent-tag'];
    agentContext.run({ tag: typeof tag === 'string' ? tag : null }, () => {
      void (async () => {
        const token = req.headers['x-api-key'];
        if (typeof token === 'string' && token.length > 0) {
          const person = await this.keys.personForToken(token);
          if (person) req.headers['x-user-email'] = person.email;
        }
        next();
      })().catch(next);
    });
  }
}
