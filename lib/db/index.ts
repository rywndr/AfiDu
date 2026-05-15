import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as authSchema from "./schema/auth";
import * as academicsSchema from "./schema/academics";
import * as studentsSchema from "./schema/students";
import * as classesSchema from "./schema/classes";
import * as gradingSchema from "./schema/grading";
import * as paymentsSchema from "./schema/payments";
import * as materialsSchema from "./schema/materials";

const client = postgres(process.env.DATABASE_URL!);

export const db = drizzle({
    client,
    schema: {
        ...authSchema,
        ...academicsSchema,
        ...studentsSchema,
        ...classesSchema,
        ...gradingSchema,
        ...paymentsSchema,
        ...materialsSchema,
    },
});
