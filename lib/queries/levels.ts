import { db } from "@/lib/db";
import { levels } from "@/lib/db/schema/students";
import { eq, asc } from "drizzle-orm";
import type { Level } from "@/lib/types";

// Get all levels ordered by progression sequence
export async function getAllLevels(): Promise<Level[]> {
    const rows = await db.select().from(levels).orderBy(asc(levels.order));

    return rows as Level[];
}

// Get a single level by ID
export async function getLevelById(id: string): Promise<Level | null> {
    const rows = await db
        .select()
        .from(levels)
        .where(eq(levels.id, id))
        .limit(1);

    return (rows[0] as Level) ?? null;
}

// Get next level in progression (by order)
export async function getNextLevel(
    currentOrder: number,
): Promise<Level | null> {
    const allLevels = await getAllLevels();
    const nextLevel = allLevels.find((l) => l.order > currentOrder);
    return nextLevel ?? null;
}
