// // // import mysql from 'mysql2';

// // // // Create a connection pool
// // // const pool = mysql.createPool({
// // //   host: 'localhost',
// // //   user: 'root',
// // //   password: '12345',
// // //   database: 'wsn-duplicate',
// // //   waitForConnections: true,
// // //   connectionLimit: 10,
// // //   queueLimit: 0,
// // // });

// // // // Export the connection pool to be used by other modules
// // // export default pool.promise();

// // // db.js

// import { Sequelize } from 'sequelize';

// // // const sequelize = new Sequelize({
// // //   dialect: 'mysql',
// // //   host: process.env.MYSQL_HOST,
// // //   username: process.env.MYSQL_USER,
// // //   password: process.env.MYSQL_PASS,
// // //   database: process.env.MYSQL_DB_NAME,

// // // });
// // const sequelize = new Sequelize({
// //   dialect: 'mysql',
// //   host: 'localhost',
// //   username: 'root',
// //   password: '12345',
// //   // database: 'wsn-duplicate',
// //   database: 'wsn',
// // });

// const sequelize = new Sequelize('WSNPROD', 'wsnuser', 'System@12345', {
//   dialect: 'mssql',
//   host: 'localhost',
//   port: 1434, // Ensure this is the correct port
//   dialectOptions: {
//     options: {
//       encrypt: false, // Set to false if not using Azure
//       trustServerCertificate: true, // Helps with SSL certificate issues
//     }
//   },
// });

// module.exports = sequelize;

// export default sequelize;

import { sequelize } from 'sequelize';

const sequelize = new Sequelize('WSNPROD', 'wsnuser', 'System@12345', {
  host: '14.99.179.131',
  dialect: 'mssql',
  port: 1433,
  dialectOptions: {
    options: {
      encrypt: false,
      trustServerCertificate: true,
    }
  },
  pool: {
    acquire: 30000, // lower timeout for testing
  },
  logging: false,
});
