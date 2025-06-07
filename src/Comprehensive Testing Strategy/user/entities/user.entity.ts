export class User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<User>) {
    Object.assign(this, partial);
  }
}
