export class DatabaseHelpers {
  static async clearDatabase(repository: any): Promise<void> {
    if (repository.users) {
      repository.users = [];
    }
  }

  static async seedDatabase(repository: any, users: any[]): Promise<void> {
    if (repository.users) {
      repository.users = [...users];
    }
  }

  static createTestUsers(count: number = 5): any[] {
    return Array.from({ length: count }, (_, index) => ({
      id: `test-user-${index + 1}`,
      name: `Test User ${index + 1}`,
      email: `test${index + 1}@example.com`,
      phone: `123456789${index}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));
  }
}
