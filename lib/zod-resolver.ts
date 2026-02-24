import { z } from "zod";
import type { FieldErrors, FieldValues } from "react-hook-form";

type ResolverResult<T extends FieldValues> =
    | { values: T; errors: Record<string, never> }
    | { values: Record<string, never>; errors: FieldErrors<T> };

type Resolver<T extends FieldValues> = (
    values: T,
) => Promise<ResolverResult<T>>;

export function zodResolver<T extends FieldValues>(
    schema: z.ZodType<T>,
): Resolver<T> {
    return async (values: T): Promise<ResolverResult<T>> => {
        const result = schema.safeParse(values);

        if (result.success) {
            return {
                values: result.data,
                errors: {} as Record<string, never>,
            };
        }

        const fieldErrors: FieldErrors<T> = {};

        for (const issue of result.error.issues) {
            const path = issue.path;

            if (path.length === 0) {
                continue;
            }

            let current: Record<string, unknown> = fieldErrors;

            for (let i = 0; i < path.length; i++) {
                const segment = String(path[i]);

                if (i === path.length - 1) {
                    if (!current[segment]) {
                        current[segment] = {
                            type: issue.code,
                            message: issue.message,
                        };
                    }
                } else {
                    if (!current[segment]) {
                        current[segment] = {};
                    }
                    current = current[segment] as Record<string, unknown>;
                }
            }
        }

        return {
            values: {} as Record<string, never>,
            errors: fieldErrors,
        };
    };
}
