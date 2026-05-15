// Formula Engine xpression parser & evaluator for custom formulas
//
// Supports: +, -, *, /, parentheses, numeric literals, and named variables
// Variables are resolved from a provided context (Record<string, number>)
//
// This is a hand-written recursive-descent parser that does NOT use eval(),
// making it safe from code injection.
//
// Grammar:
//   Expression = Term (('+' | '-') Term)*
//   Term       = Unary (('*' | '/') Unary)*
//   Unary      = '-' Unary | Primary
//   Primary    = NUMBER | VARIABLE | '(' Expression ')'
//
// Functions (optional built-ins):
//   AVG(a, b, c, ...)   – average of arguments
//   SUM(a, b, c, ...)   – sum of arguments
//   MIN(a, b, c, ...)   – minimum of arguments
//   MAX(a, b, c, ...)   – maximum of arguments
//   COUNT(a, b, c, ...) – count of arguments
// ---------------------------------------------------------------------------

export class FormulaError extends Error {
    constructor(
        message: string,
        public position?: number,
    ) {
        super(message);
        this.name = "FormulaError";
    }
}

// Tokenizer
type TokenType =
    | "NUMBER"
    | "VARIABLE"
    | "PLUS"
    | "MINUS"
    | "STAR"
    | "SLASH"
    | "LPAREN"
    | "RPAREN"
    | "COMMA"
    | "EOF";

interface Token {
    type: TokenType;
    value: string;
    position: number;
}

function tokenize(expression: string): Token[] {
    const tokens: Token[] = [];
    let i = 0;
    const len = expression.length;

    while (i < len) {
        const ch = expression[i];

        // Skip whitespace
        if (ch === " " || ch === "\t" || ch === "\n" || ch === "\r") {
            i++;
            continue;
        }

        // Numbers (integer or decimal)
        if (ch >= "0" && ch <= "9") {
            const start = i;
            while (
                i < len &&
                ((expression[i] >= "0" && expression[i] <= "9") ||
                    expression[i] === ".")
            ) {
                i++;
            }
            const numStr = expression.slice(start, i);
            // Validate it's a proper number
            if (Number.isNaN(Number(numStr))) {
                throw new FormulaError(`Angka tidak valid: "${numStr}"`, start);
            }
            tokens.push({ type: "NUMBER", value: numStr, position: start });
            continue;
        }

        // Variables and function names (letters, digits, underscores)
        if (
            (ch >= "a" && ch <= "z") ||
            (ch >= "A" && ch <= "Z") ||
            ch === "_"
        ) {
            const start = i;
            while (
                i < len &&
                ((expression[i] >= "a" && expression[i] <= "z") ||
                    (expression[i] >= "A" && expression[i] <= "Z") ||
                    (expression[i] >= "0" && expression[i] <= "9") ||
                    expression[i] === "_")
            ) {
                i++;
            }
            tokens.push({
                type: "VARIABLE",
                value: expression.slice(start, i),
                position: start,
            });
            continue;
        }

        // Operators and punctuation
        const start = i;
        switch (ch) {
            case "+":
                tokens.push({ type: "PLUS", value: "+", position: start });
                i++;
                break;
            case "-":
                tokens.push({ type: "MINUS", value: "-", position: start });
                i++;
                break;
            case "*":
                tokens.push({ type: "STAR", value: "*", position: start });
                i++;
                break;
            case "/":
                tokens.push({ type: "SLASH", value: "/", position: start });
                i++;
                break;
            case "(":
                tokens.push({ type: "LPAREN", value: "(", position: start });
                i++;
                break;
            case ")":
                tokens.push({ type: "RPAREN", value: ")", position: start });
                i++;
                break;
            case ",":
                tokens.push({ type: "COMMA", value: ",", position: start });
                i++;
                break;
            default:
                throw new FormulaError(
                    `Karakter tidak dikenali: "${ch}"`,
                    start,
                );
        }
    }

    tokens.push({ type: "EOF", value: "", position: len });
    return tokens;
}

// Built-in functions
const BUILTIN_FUNCTIONS: Record<string, (args: number[]) => number> = {
    AVG: (args) => {
        if (args.length === 0) return 0;
        return args.reduce((a, b) => a + b, 0) / args.length;
    },
    AVERAGE: (args) => {
        if (args.length === 0) return 0;
        return args.reduce((a, b) => a + b, 0) / args.length;
    },
    SUM: (args) => args.reduce((a, b) => a + b, 0),
    MIN: (args) => {
        if (args.length === 0) return 0;
        return Math.min(...args);
    },
    MAX: (args) => {
        if (args.length === 0) return 0;
        return Math.max(...args);
    },
    COUNT: (args) => args.length,
};

const BUILTIN_FUNCTION_NAMES = new Set(Object.keys(BUILTIN_FUNCTIONS));

// Parser & Evaluator
class Parser {
    private tokens: Token[];
    private pos: number;
    private variables: Record<string, number>;

    constructor(tokens: Token[], variables: Record<string, number>) {
        this.tokens = tokens;
        this.pos = 0;
        this.variables = variables;
    }

    private current(): Token {
        return this.tokens[this.pos];
    }

    private consume(expected?: TokenType): Token {
        const tok = this.current();
        if (expected && tok.type !== expected) {
            throw new FormulaError(
                `Diharapkan ${expected}, ditemukan "${tok.value || "akhir ekspresi"}"`,
                tok.position,
            );
        }
        this.pos++;
        return tok;
    }

    parse(): number {
        const result = this.expression();
        if (this.current().type !== "EOF") {
            const tok = this.current();
            throw new FormulaError(
                `Token tidak terduga: "${tok.value}"`,
                tok.position,
            );
        }
        return result;
    }

    // Expression = Term (('+' | '-') Term)*
    private expression(): number {
        let left = this.term();

        while (
            this.current().type === "PLUS" ||
            this.current().type === "MINUS"
        ) {
            const op = this.consume();
            const right = this.term();
            if (op.type === "PLUS") {
                left = left + right;
            } else {
                left = left - right;
            }
        }

        return left;
    }

    // Term = Unary (('*' | '/') Unary)*
    private term(): number {
        let left = this.unary();

        while (
            this.current().type === "STAR" ||
            this.current().type === "SLASH"
        ) {
            const op = this.consume();
            const right = this.unary();
            if (op.type === "STAR") {
                left = left * right;
            } else {
                if (right === 0) {
                    throw new FormulaError("Pembagian dengan nol", op.position);
                }
                left = left / right;
            }
        }

        return left;
    }

    // Unary = '-' Unary | Primary
    private unary(): number {
        if (this.current().type === "MINUS") {
            this.consume();
            return -this.unary();
        }
        return this.primary();
    }

    // Primary = NUMBER | FUNCTION '(' args ')' | VARIABLE | '(' Expression ')'
    private primary(): number {
        const tok = this.current();

        // Number literal
        if (tok.type === "NUMBER") {
            this.consume();
            return Number(tok.value);
        }

        // Variable or function call
        if (tok.type === "VARIABLE") {
            const name = tok.value;
            this.consume();

            // Check if this is a function call
            if (
                this.current().type === "LPAREN" &&
                BUILTIN_FUNCTION_NAMES.has(name.toUpperCase())
            ) {
                return this.functionCall(name.toUpperCase(), tok.position);
            }

            // Otherwise it's a variable
            const upperName = name.toUpperCase();
            // Try exact match first, then case-insensitive
            if (name in this.variables) {
                return this.variables[name];
            }
            // Case-insensitive lookup
            const found = Object.entries(this.variables).find(
                ([k]) => k.toUpperCase() === upperName,
            );
            if (found) {
                return found[1];
            }

            throw new FormulaError(
                `Variabel tidak ditemukan: "${name}"`,
                tok.position,
            );
        }

        // Parenthesized expression
        if (tok.type === "LPAREN") {
            this.consume();
            const result = this.expression();
            this.consume("RPAREN");
            return result;
        }

        throw new FormulaError(
            `Token tidak terduga: "${tok.value || "akhir ekspresi"}"`,
            tok.position,
        );
    }

    // Function call: already consumed VARIABLE, now consume '(' args ')'
    private functionCall(name: string, position: number): number {
        this.consume("LPAREN");

        const args: number[] = [];
        if (this.current().type !== "RPAREN") {
            args.push(this.expression());
            while (this.current().type === "COMMA") {
                this.consume();
                args.push(this.expression());
            }
        }

        this.consume("RPAREN");

        const fn = BUILTIN_FUNCTIONS[name];
        if (!fn) {
            throw new FormulaError(
                `Fungsi tidak dikenali: "${name}"`,
                position,
            );
        }

        return fn(args);
    }
}

// Public API
/**
 * Evaluate a formula expression with the given variable context.
 *
 * @param expression - The formula string, e.g. "(UH1 + UH2) / 2 * 0.6 + UTS * 0.2"
 * @param variables - Map of variable names to numeric values
 * @returns The computed result
 * @throws FormulaError if the expression is invalid
 */
export function evaluateFormula(
    expression: string,
    variables: Record<string, number> = {},
): number {
    if (!expression || expression.trim().length === 0) {
        throw new FormulaError("Ekspresi formula kosong");
    }

    const tokens = tokenize(expression);
    const parser = new Parser(tokens, variables);
    const result = parser.parse();

    if (!Number.isFinite(result)) {
        throw new FormulaError("Hasil formula tidak valid (infinity atau NaN)");
    }

    return result;
}

/**
 * Validate a formula expression without evaluating it.
 * All variables are given a dummy value of 1 so the expression can be
 * fully parsed and checked.
 *
 * @returns An object with `valid` and optionally `error` and `variables` (list of variable names found).
 */
export function validateFormula(expression: string): {
    valid: boolean;
    error?: string;
    position?: number;
    variables: string[];
} {
    if (!expression || expression.trim().length === 0) {
        return {
            valid: false,
            error: "Ekspresi formula kosong",
            variables: [],
        };
    }

    try {
        const tokens = tokenize(expression);

        // Extract variable names (excluding built-in function names)
        const variableNames: string[] = [];
        for (let i = 0; i < tokens.length; i++) {
            const tok = tokens[i];
            if (tok.type === "VARIABLE") {
                const isFunction =
                    BUILTIN_FUNCTION_NAMES.has(tok.value.toUpperCase()) &&
                    i + 1 < tokens.length &&
                    tokens[i + 1].type === "LPAREN";
                if (!isFunction) {
                    // Deduplicate (case-insensitive)
                    const upper = tok.value.toUpperCase();
                    if (!variableNames.some((v) => v.toUpperCase() === upper)) {
                        variableNames.push(tok.value);
                    }
                }
            }
        }

        // Try parsing with dummy values
        const dummyVars: Record<string, number> = {};
        for (const v of variableNames) {
            dummyVars[v] = 1;
        }

        const parser = new Parser(tokens, dummyVars);
        const result = parser.parse();

        if (!Number.isFinite(result)) {
            return {
                valid: false,
                error: "Hasil formula tidak valid",
                variables: variableNames,
            };
        }

        return { valid: true, variables: variableNames };
    } catch (err) {
        if (err instanceof FormulaError) {
            return {
                valid: false,
                error: err.message,
                position: err.position,
                variables: [],
            };
        }
        return {
            valid: false,
            error: "Error tidak dikenal saat validasi formula",
            variables: [],
        };
    }
}

/**
 * Extract variable names from a formula expression.
 * Returns empty array if the expression is invalid.
 */
export function extractVariables(expression: string): string[] {
    const result = validateFormula(expression);
    return result.variables;
}

/**
 * Get list of available built-in function names.
 */
export function getBuiltinFunctions(): string[] {
    return Array.from(BUILTIN_FUNCTION_NAMES);
}

/**
 * Build a variable context from assignment data.
 * Creates variable names from assignment names by replacing spaces with
 * underscores and converting to uppercase.
 *
 * If an explicit variable mapping is provided, it takes precedence.
 *
 * @param assignments - Array of assignments with id, name, and the student's score
 * @param variableMapping - Optional explicit mapping of variable names to assignment IDs
 * @returns A Record<string, number> mapping variable names to scores
 */
export function buildVariableContext(
    assignments: {
        id: string;
        name: string;
        score: number | null;
        maxScore: number;
    }[],
    variableMapping?: Record<string, string>,
): Record<string, number> {
    const context: Record<string, number> = {};

    if (variableMapping && Object.keys(variableMapping).length > 0) {
        // Use explicit mapping
        for (const [varName, assignmentId] of Object.entries(variableMapping)) {
            const assignment = assignments.find((a) => a.id === assignmentId);
            if (assignment && assignment.score !== null) {
                context[varName] = assignment.score;
            }
        }
    } else {
        // Auto-generate from assignment names
        for (const a of assignments) {
            if (a.score !== null) {
                const varName = normalizeAssignmentName(a.name);
                context[varName] = a.score;
            }
        }
    }

    return context;
}

/**
 * Normalize an assignment name into a valid variable name.
 * - Trims whitespace
 * - Replaces spaces with underscores
 * - Removes characters that aren't letters, digits, or underscores
 * - Converts to uppercase
 * - Prepends '_' if starts with a digit
 */
export function normalizeAssignmentName(name: string): string {
    let normalized = name
        .trim()
        .replace(/\s+/g, "_")
        .replace(/[^a-zA-Z0-9_]/g, "")
        .toUpperCase();

    if (!normalized) {
        normalized = "VAR";
    }

    // Variable names can't start with a digit
    if (normalized[0] >= "0" && normalized[0] <= "9") {
        normalized = "_" + normalized;
    }

    return normalized;
}

/**
 * Generate a suggested auto-variable mapping for a set of assignments.
 * This is useful for showing the teacher what variable names will be used
 * when they don't provide an explicit mapping.
 */
export function generateAutoMapping(
    assignments: { id: string; name: string }[],
): Record<string, string> {
    const mapping: Record<string, string> = {};
    const usedNames = new Set<string>();

    for (const a of assignments) {
        let varName = normalizeAssignmentName(a.name);

        // Handle duplicates by appending a number
        if (usedNames.has(varName)) {
            let counter = 2;
            while (usedNames.has(`${varName}_${counter}`)) {
                counter++;
            }
            varName = `${varName}_${counter}`;
        }

        usedNames.add(varName);
        mapping[varName] = a.id;
    }

    return mapping;
}
