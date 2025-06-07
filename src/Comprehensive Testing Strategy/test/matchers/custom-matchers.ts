declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUser(): R;
      toBeValidUserResponse(): R;
      toHaveValidTimestamp(): R;
    }
  }
}

expect.extend({
  toBeValidUser(received: any) {
    const pass = received &&
      typeof received.id === 'string' &&
      typeof received.name === 'string' &&
      typeof received.email === 'string' &&
      received.createdAt instanceof Date &&
      received.updatedAt instanceof Date;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid user`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid user`,
        pass: false,
      };
    }
  },

  toBeValidUserResponse(received: any) {
    const pass = received &&
      typeof received.statusCode === 'number' &&
      typeof received.message === 'string' &&
      received.data !== undefined;

    if (pass) {
      return {
        message: () => `expected ${JSON.stringify(received)} not to be a valid user response`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${JSON.stringify(received)} to be a valid user response`,
        pass: false,
      };
    }
  },

  toHaveValidTimestamp(received: any) {
    const timestamp = new Date(received);
    const pass = !isNaN(timestamp.getTime());

    if (pass) {
      return {
        message: () => `expected ${received} not to be a valid timestamp`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be a valid timestamp`,
        pass: false,
      };
    }
  },
});
