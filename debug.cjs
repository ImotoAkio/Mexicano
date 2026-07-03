const fs = require("fs");
const dotenv = require("dotenv");
const env = dotenv.parse(fs.readFileSync(".env"));
console.log("GOOGLE_CLIENT_EMAIL length:", env.GOOGLE_CLIENT_EMAIL ? env.GOOGLE_CLIENT_EMAIL.length : 0);
console.log("GOOGLE_PRIVATE_KEY length:", env.GOOGLE_PRIVATE_KEY ? env.GOOGLE_PRIVATE_KEY.length : 0);
