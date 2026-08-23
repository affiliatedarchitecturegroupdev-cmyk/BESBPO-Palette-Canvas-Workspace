import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Module, NestModule, MiddlewareConsumer } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';

/**
 * P5-04 security remediation, wired as a Nest module so it applies regardless of
 * build layout (src bootstrap or standalone-compiled test app):
 *  - SecurityHeadersModule adds conservative headers to every response
 *  - GlobalErrorFilter returns a uniform error shape and never leaks internals on 5xx
 */

@Catch()
export class GlobalErrorFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    if (status >= 500) {
      // eslint-disable-next-line no-console
      console.error('unhandled error:', exception);
      res.status(500).json({ statusCode: 500, error: 'internal_error', message: 'Internal server error' });
      return;
    }
    const body = exception instanceof HttpException ? exception.getResponse() : undefined;
    const message =
      typeof body === 'string' ? body : (body as { message?: string | string[] })?.message ?? 'Request failed';
    res.status(status).json({ statusCode: status, error: 'request_failed', message });
  }
}

@Module({
  providers: [{ provide: APP_FILTER, useClass: GlobalErrorFilter }],
})
export class SecurityModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply((req: any, res: any, next: () => void) => {
        res.setHeader('x-content-type-options', 'nosniff');
        res.setHeader('x-frame-options', 'DENY');
        res.setHeader('referrer-policy', 'no-referrer');
        res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
        res.setHeader('content-security-policy', "default-src 'self'; frame-ancestors 'none'; base-uri 'self'");
        next();
      })
      .forRoutes('*');
  }
}
