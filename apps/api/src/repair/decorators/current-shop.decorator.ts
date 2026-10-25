import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthShop {
  shopId: string;
  email: string;
}

export const CurrentShop = createParamDecorator((_data: unknown, ctx: ExecutionContext): AuthShop => {
  const request = ctx.switchToHttp().getRequest();
  return request.user as AuthShop;
});
