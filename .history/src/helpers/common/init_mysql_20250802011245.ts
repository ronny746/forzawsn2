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

import { Sequelize } from 'sequelize';

const sequelize = new Sequelize('WSNPROD', 'wsnuser', 'System@12345', { 
  dialect: 'mssql',
  host: '',
  port: 1434,
  dialectOptions: {
    options: {
      encrypt: true, // Use true if connecting to Azure; otherwise, set to false
      packetSize: 16384, // Adjust packet size as needed
      trustServerCertificate: true, // Set to true for self-signed certificates
      requestTimeout: 120000,
    },
        // 30 seconds timeout for queries
  },
  pool: {
    max: 500,
    min: 2,
    acquire: 90000,
    idle: 10000,
  },
});

export default sequelize;
