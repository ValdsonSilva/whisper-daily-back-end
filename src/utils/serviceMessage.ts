// utils/serviceMessage.ts
type SupportedLocale = 'pt' | 'en';

interface BuildServiceMessageParams {
    achieved: boolean | null;
    title: string;            // ex.: prevRitual[0].title
    locale?: string | null;   // ex.: "pt-BR", "en-US", etc.
    subjectPt?: string;       // opcional: "tarefa" (default) | "ritual" | ...
    subjectEn?: string;       // opcional: "task" (default) | "ritual" | ...
}

export function buildServiceMessage({
    achieved,
    title,
    locale,
    subjectPt = 'tarefa',
    subjectEn = 'task',
}: BuildServiceMessageParams): string {
    const lang: SupportedLocale = normalizeLocale(locale);

    if (lang === 'pt') {

        if (achieved === null) {
            return `Não respondi se concluí ou não a ${subjectPt}: ${title}`
        }

        return achieved
            ? `Sim, concluí a ${subjectPt}: ${title}.`
            : `Não concluí a ${subjectPt}: ${title}.`;
    }

    // en (fallback)
    if (achieved === null) {
        return `I didn't answer if achieved or not the ${subjectPt}: ${title}`;
    }

    return achieved
        ? `Yes, I achieved the ${subjectEn}: ${title}.`
        : `I did not achieve the ${subjectEn}: ${title}.`;
}

function normalizeLocale(locale?: string | null): SupportedLocale {
    const code = (locale ?? '').slice(0, 2).toLowerCase();
    return code === 'pt' ? 'pt' : 'en';
}
