const fs = require('fs');

const f = fs.readFileSync('src/app.ts', 'utf8');

const injection1 = `
import developerRoutes from "./routes/developer.routes.js";
import composerRoutes from "./routes/composer.routes.js";
`;
let newFile = f.split('import developerRoutes from "./routes/developer.routes.js";').join(injection1);

const injection2 = `
app.use("/api/v1/developer/composer", composerRoutes);
app.use("/api/v1/developer", developerRoutes);
`;
newFile = newFile.split('app.use("/api/v1/developer", developerRoutes);').join(injection2);

fs.writeFileSync('src/app.ts', newFile);
