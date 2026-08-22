/**
 * Drizzle mappings for the tables better-auth needs.
 *
 * The Django app in `../src` owns this schema -- these definitions must mirror
 * the models in `src/login/models.py`, they do not create anything. Run the
 * Django migrations, never `drizzle-kit push`, to change the shape of these
 * tables.
 *
 * The property names below are deliberately the *database* column names rather
 * than camelCase: better-auth's drizzle adapter looks columns up by the DB field
 * name it resolves from `lib/auth.ts` (`schemaModel[dbFieldName]`), so a
 * camelCase key here makes the lookup silently miss.
 */
import {
  bigint,
  bigserial,
  boolean,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';

/** Django: login.CustomUser */
export const user = pgTable('login_customuser', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  email: varchar('email', { length: 254 }).notNull().unique(),
  first_name: varchar('first_name', { length: 30 }).notNull(),
  last_name: varchar('last_name', { length: 30 }).notNull(),
  email_verified: boolean('email_verified').notNull().default(false),
  image: varchar('image', { length: 500 }).notNull().default(''),
  role: varchar('role', { length: 20 }).notNull().default('teacher'),
  is_active: boolean('is_active').notNull().default(true),
  is_staff: boolean('is_staff').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true }),
  updated_at: timestamp('updated_at', { withTimezone: true }),
});

/** Django: login.AuthAccount -- holds the credential hash */
export const account = pgTable('auth_account', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  provider_id: varchar('provider_id', { length: 100 }).notNull(),
  account_id: varchar('account_id', { length: 255 }).notNull(),
  // better-auth 1.7 matches credential accounts on issuer === 'local:credential'
  issuer: varchar('issuer', { length: 255 }).notNull(),
  password: varchar('password', { length: 255 }).notNull().default(''),
  access_token: text('access_token'),
  refresh_token: text('refresh_token'),
  id_token: text('id_token'),
  access_token_expires_at: timestamp('access_token_expires_at', {
    withTimezone: true,
  }),
  refresh_token_expires_at: timestamp('refresh_token_expires_at', {
    withTimezone: true,
  }),
  scope: text('scope'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/** Django: login.AuthSession */
export const session = pgTable('auth_session', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  user_id: bigint('user_id', { mode: 'number' })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 255 }).notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/** Django: login.AuthVerification */
export const verification = pgTable('auth_verification', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: text('value').notNull(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true }).notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true }).notNull(),
});

/**
 * Django: students.Student -- the learner record a student login points at.
 * Not part of the better-auth schema; queried directly by the app, so plain
 * camelCase keys are fine here.
 */
export const student = pgTable('students_student', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  level: varchar('level', { length: 20 }).notNull(),
  email: varchar('email', { length: 254 }).notNull().default(''),
  assignedClassId: bigint('assigned_class_id', { mode: 'number' }),
  userId: bigint('user_id', { mode: 'number' }),
});

/** Django: students.StudentClass */
export const studentClass = pgTable('students_studentclass', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
});

/**
 * Django: study_materials.StudyMaterial.
 *
 * `file` and `thumbnail` contain Django storage object names, not permanent
 * public URLs. Private B2 URLs must be signed when they are rendered.
 */
export const studyMaterial = pgTable(
  'study_materials_studymaterial',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    title: varchar('title', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 280 }).notNull().unique(),
    description: text('description').notNull(),
    materialType: varchar('material_type', { length: 20 })
      .notNull()
      .default('pdf'),
    content: text('content').notNull(),
    category: varchar('category', { length: 20 }).notNull(),
    level: varchar('level', { length: 20 }).notNull(),
    studentClassId: bigint('student_class_id', { mode: 'number' }).references(
      () => studentClass.id,
      { onDelete: 'set null' },
    ),
    file: varchar('file', { length: 100 }).notNull(),
    thumbnail: varchar('thumbnail', { length: 100 }),
    originalFilename: varchar('original_filename', { length: 255 }).notNull(),
    mimeType: varchar('mime_type', { length: 100 }).notNull(),
    fileSizeBytes: bigint('file_size_bytes', { mode: 'number' }),
    pageCount: integer('page_count'),
    status: varchar('status', { length: 20 }).notNull().default('draft'),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    position: integer('position').notNull().default(0),
    uploadedAt: timestamp('uploaded_at', { withTimezone: true }).notNull(),
    editedAt: timestamp('edited_at', { withTimezone: true }).notNull(),
    uploadedById: bigint('uploaded_by_id', { mode: 'number' }).references(
      () => user.id,
      { onDelete: 'cascade' },
    ),
  },
  (table) => [
    index('study_material_visible_idx').on(
      table.status,
      table.level,
      table.category,
    ),
    index('study_material_position_idx').on(table.position),
  ],
);

export const schema = {
  user,
  account,
  session,
  verification,
  student,
  studentClass,
  studyMaterial,
};
