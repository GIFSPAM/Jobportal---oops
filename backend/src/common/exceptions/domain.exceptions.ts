import { HttpException, HttpStatus } from '@nestjs/common';

/** Domain-level exceptions. */
export class BadRequestError extends HttpException {
  constructor(message = 'Bad request.', details?: unknown) {
    super({ statusCode: HttpStatus.BAD_REQUEST, message, details }, HttpStatus.BAD_REQUEST);
  }
}

export class UnauthorizedError extends HttpException {
  constructor(message = 'Authentication required.') {
    super({ statusCode: HttpStatus.UNAUTHORIZED, message }, HttpStatus.UNAUTHORIZED);
  }
}

export class ForbiddenError extends HttpException {
  constructor(message = 'You do not have permission to perform this action.') {
    super({ statusCode: HttpStatus.FORBIDDEN, message }, HttpStatus.FORBIDDEN);
  }
}

export class NotFoundError extends HttpException {
  constructor(message = 'Resource not found.') {
    super({ statusCode: HttpStatus.NOT_FOUND, message }, HttpStatus.NOT_FOUND);
  }
}

export class ConflictError extends HttpException {
  constructor(message = 'Resource already exists.') {
    super({ statusCode: HttpStatus.CONFLICT, message }, HttpStatus.CONFLICT);
  }
}

/** Raised when an entity violates a relational invariant (foreign key, enum range, …) that the caller can realistically fix. */
export class UnprocessableError extends HttpException {
  constructor(message = 'The request could not be processed.', details?: unknown) {
    super(
      { statusCode: HttpStatus.UNPROCESSABLE_ENTITY, message, details },
      HttpStatus.UNPROCESSABLE_ENTITY,
    );
  }
}
