type NumberType = "Int" | "Float";
type ParseMethod = `parse${NumberType}`;

export function numberFromEnv(key: string, numberType: NumberType = "Int"): number {
    const val = process.env[key];
    if (val == null) {
        throw new Error(`Missing numeric environment variable: ${key}`);
    }

    const method = `parse${numberType}` as ParseMethod;
    const parsed = Number[method](val);
    if (Number.isNaN(parsed)) {
        throw new Error(`Environment variable '${key}' value '${val}' is not a number`);
    }

    return parsed;
}
