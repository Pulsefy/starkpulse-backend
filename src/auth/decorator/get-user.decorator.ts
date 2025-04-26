import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export const GetUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    // Extract request from context
    const request = ctx.switchToHttp().getRequest();

    // Extract user from request (populated by JWT strategy)
    const user = request.user;

    // If no data is provided, return entire user object
    if (!data) {
      return user;
    }

    // If data is provided, return specific property from user object
    return user?.[data];
  },
);
