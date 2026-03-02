const { hashSync } = require("bcryptjs");

const password = process.argv[2] || "";

if (!password) {
  console.error("Usage: npm run auth:hash -- \"your-password\"");
  process.exit(1);
}

const hash = hashSync(password, 12);
console.log(hash);

