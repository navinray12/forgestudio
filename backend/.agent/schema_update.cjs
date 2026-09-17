const fs = require('fs');
let schema = fs.readFileSync('prisma/schema.prisma', 'utf8');

// Append models
const newModels = `
// ==========================================
// Developer API Management & Plugins
// ==========================================

model ApiKey {
  id          String   @id @default(uuid()) @db.Uuid
  userId      String   @db.Uuid
  name        String
  keyPrefix   String
  keyHash     String   @unique
  environment String   @default("development")
  permissions Json     @default("[]")
  isActive    Boolean  @default(true)
  expiresAt   DateTime?
  lastUsedAt  DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  logs        ApiLog[]

  @@index([userId])
  @@map("api_keys")
}

model ApiLog {
  id           String   @id @default(uuid()) @db.Uuid
  apiKeyId     String?  @db.Uuid
  userId       String?  @db.Uuid
  endpoint     String
  method       String
  statusCode   Int
  responseTime Int
  ipAddress    String?
  userAgent    String?
  errorMessage String?
  createdAt    DateTime @default(now())

  apiKey       ApiKey?  @relation(fields: [apiKeyId], references: [id], onDelete: SetNull)
  user         User?    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([apiKeyId])
  @@index([userId])
  @@index([createdAt])
  @@map("api_logs")
}

model Plugin {
  id              String   @id @default(uuid()) @db.Uuid
  pluginId        String   @unique
  name            String
  description     String
  version         String
  compatibility   String   @default(">=1.0.0")
  status          String   @default("DISABLED")
  settings        Json     @default("{}")
  healthStatus    String   @default("HEALTHY")
  healthMessage   String?
  capabilities    Json     @default("[]")
  installedBy     String   @db.Uuid
  
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  lastCheckedAt   DateTime?

  user            User     @relation(fields: [installedBy], references: [id], onDelete: Cascade)
  activities      PluginActivity[]

  @@index([installedBy])
  @@map("plugins")
}

model PluginActivity {
  id          String   @id @default(uuid()) @db.Uuid
  pluginId    String   @db.Uuid
  action      String
  details     String?
  createdAt   DateTime @default(now())

  plugin      Plugin   @relation(fields: [pluginId], references: [id], onDelete: Cascade)

  @@index([pluginId])
  @@index([createdAt])
  @@map("plugin_activities")
}
`;

schema += "\n" + newModels;

// Add relations to User
// Find `websites            Website[]` and append after
schema = schema.replace(
    'websites            Website[]',
    'websites            Website[]\n  apiKeys             ApiKey[]\n  apiLogs             ApiLog[]\n  plugins             Plugin[]'
);

// We should also make sure Website model has custom post types referenced (because I restored before F-121). Wait, cpt.prisma might not have injected User/Website relation fields properly if they weren't added natively.
schema = schema.replace(
    'userId            String   @db.Uuid',
    'userId            String   @db.Uuid\n  customPostTypes   CustomPostType[]'
);


fs.writeFileSync('prisma/schema.prisma', schema);
