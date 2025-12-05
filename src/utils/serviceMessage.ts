// utils/serviceMessage.ts
type SupportedLocale = 'pt' | 'en';

interface BuildServiceMessageParams {
    achieved: boolean;
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
        return achieved
            ? `Sim, concluí a ${subjectPt}: ${title}.`
            : `Não concluí a ${subjectPt}: ${title}.`;
    }

    // en (fallback)
    return achieved
        ? `Yes, I achieved the ${subjectEn}: ${title}.`
        : `I did not achieve the ${subjectEn}: ${title}.`;
}

function normalizeLocale(locale?: string | null): SupportedLocale {
    const code = (locale ?? '').slice(0, 2).toLowerCase();
    return code === 'pt' ? 'pt' : 'en';
}
