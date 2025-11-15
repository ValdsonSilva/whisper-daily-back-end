
interface UserDTO {
    id: string,
    email: string
    displayName?: string,
    nickname?: string,
    locale: string,
    timezone: string, // ex: "America/Fortaleza"

    // Preferências do ritual
    checkInHour: number, // 0..23 hora local para notificação
    checkInMinute: number, // 0..59
    soundEnabled: boolean,

    createdAt: Date, // default new Date().now()
    updatedAt: Date // default new Date().now()
}

export class User {

    id: UserDTO['id']
    email: UserDTO['email']
    displayName: UserDTO['displayName']
    nickname: UserDTO['nickname']
    locale: UserDTO['locale']
    timezone: UserDTO['timezone']
    checkInHour: UserDTO['checkInHour']
    checkInMinute: UserDTO['checkInMinute']
    soundEnabled: UserDTO['soundEnabled']
    createdAt: UserDTO['createdAt']
    updatedAt: UserDTO['updatedAt']

    public users: Array<UserDTO> = []

    constructor({
        id,
        email,
        displayName,
        nickname,
        locale,
        timezone,
        checkInHour,
        checkInMinute,
        soundEnabled,
        createdAt,
        updatedAt
    }: UserDTO) {
        this.id = id
        this.email = email
        this.displayName = displayName
        this.nickname = nickname
        this.locale = locale
        this.timezone = timezone
        this.checkInHour = checkInHour
        this.checkInMinute = checkInMinute
        this.soundEnabled = soundEnabled
        this.createdAt = createdAt
        this.updatedAt = updatedAt
    };

};

// const user = new User({});

