export function isRecord(value: unknown): value is Record<string, unknown> {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function optionalArray(value: unknown): unknown[] {
    if (value == null) return [];
    if (!Array.isArray(value)) throw new Error('Dados do provedor inválidos.');
    return value;
}

export function optionalString(value: unknown): string | undefined {
    if (value == null) return undefined;
    if (typeof value !== 'string')
        throw new Error('Dados do provedor inválidos.');
    return value;
}
