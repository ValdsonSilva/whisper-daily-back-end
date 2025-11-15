import { User } from "../../domain/entities/user";
import { UserRepository } from "../../domain/ports/user.repository";

/**
 * Nesse useCase temos regras de negócio para a chamada dos métodos
 * que operam sobre a entidade User no banco de dados.
 */
// export class CreateUserUseCase implements UserRepository {
    // constructor(private readonly userRepository: UserRepository) { };

    // async execute(user: User) {

    //     if (!user.nickname && !user.displayName) {
    //         throw new Error('Alguma identificação de nome deve ser passada')
    //     }

    //     return this.userRepository.create(user);
    // }
    
    //     constructor(private readonly prisma: PrismaClient) {};


    // async listAll(): Promise<User[]> {
    //
    //     const users = User;
    //     // users.users

    // }

    // listUserById(): Promise<User | null> {

    // }

    // create(user: User): Promise<User> {

    // }

    // update(id: User["id"], data: Partial<User>): Promise<User> {

    // }

    // delete(id: User["id"]): Promise<User> {

    // }
// };