import { User } from "../entities/user";

// contrato da classe User - para manipular a classe User
export interface UserRepository {
    create(user: User): Promise<User>;
    listAll(): Promise<User[]>;
    listUserById(): Promise<User | null> ;
    update(id: User['id'], data: Partial<User>): Promise<User>;
    delete(id: User['id']): Promise<User>;
}