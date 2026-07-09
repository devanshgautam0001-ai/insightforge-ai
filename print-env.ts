import * as dotenv from "dotenv";
dotenv.config();

console.log("SQL_HOST:", process.env.SQL_HOST);
console.log("SQL_USER:", process.env.SQL_USER);
console.log("SQL_PASSWORD Length:", process.env.SQL_PASSWORD ? process.env.SQL_PASSWORD.length : "NOT SET");
console.log("SQL_DB_NAME:", process.env.SQL_DB_NAME);
console.log("SQL_ADMIN_USER:", process.env.SQL_ADMIN_USER);
console.log("SQL_ADMIN_PASSWORD Length:", process.env.SQL_ADMIN_PASSWORD ? process.env.SQL_ADMIN_PASSWORD.length : "NOT SET");
console.log("PORT:", process.env.PORT);
console.log("NODE_ENV:", process.env.NODE_ENV);
