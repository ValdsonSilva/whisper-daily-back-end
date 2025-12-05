
export const messagePromptInUserLanguage = (title: string, language: string) => {

    if (language === "en") return `Today my intention is to: ${title}. Which small steps could i do to achiev it?`

    return `Minha intenção hoje é: ${title}. Quais pequenos passos posso tomar para realizar isso?`;
}