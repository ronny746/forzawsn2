/* eslint-disable */
const ExcelJS = require('exceljs');
const nodemailer = require('nodemailer');
const moment = require('moment-timezone');
import { fetchData } from './attendence.controller'
// import sequelize from '../../helpers/common/init_mysql';
// const { QueryTypes } = require("sequelize");

// Function to convert data to Excel
async function convertToExcel(data: any) {
    // Create a new Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Data');

    // Add header row
    worksheet.addRow(Object.keys(data[0]));

    // Add data rows
    data.forEach((row: any) => {
        worksheet.addRow(Object.values(row));
    });

    // Save the workbook to a buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
}

// Function to send email
async function sendEmail(attachment: any, data: any, Email: any) {
    console.log(Email)

    const kolkataDate = moment.tz("Asia/Kolkata").format("MMM D, YYYY");

    const tableRows = data.map((row: any) => {
        return `<tr>${Object.values(row).map(value => `<td>${value}</td>`).join('')}</tr>`;
    });
    const tableHTML = `
    <div>
    <h3>Hi All</h3>
    <p>Please find the ${kolkataDate} attendance report below.</p>
    <br />
        <table border="1">
          <thead>
            <tr>${Object.keys(data[0]).map(key => `<th>${key}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${tableRows.join('')}
          </tbody>
        </table>
        <p>Note: Please upload the pre-visit plan through the portal.</p>
        <p>Please get in contact with the sales application support team with any issues or inquiries.</p>
        <br />
        <a href="https://wsn3.workgateway.in" target="_blank">Go to portal</a>
        <p>Thank You,</p>
        <p>Warm Regards,</p>
        <p>Sales Application Support Team</p>
        </div>
      `;

    // Create a Nodemailer transporter
    let transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: "gkverma@forzamedi.com",
            pass: "egvw rejv rpnk nrvg",
        },
    });

    //   let transporter = nodemailer.createTransport({
    //     host: 'smtp.example.com',
    //     port: 587,
    //     secure: false,
    //     auth: {
    //       user: 'your_email@example.com',
    //       pass: 'your_email_password'
    //     }
    //   });

    // Send mail with defined transport object
    let info = await transporter.sendMail({
        from: 'gkverma@forzamedi.com',
        to: 'salesgroup@forzamedi.com',
        // cc: 'hrgroup@forzamedi.com , hverma@forzamedi.com, satyajeet@forzamedi.com, support@wcspl.net',
        cc: 'hrgroup@forzamedi.com , hverma@forzamedi.com, support@wcspl.net',
        // cc: 'hverma@forzamedi, hrgroup@forzamedi.com, support@wcspl.com',
        subject: 'Daily Attendence Report',
        text: 'Please find the attached Excel file.',
        html: `
        ${tableHTML}`,
        attachments: [{
            filename: 'data.xlsx',
            content: attachment
        }]
    });
    await transporter.sendMail({
        from: 'gkverma@forzamedi.com',
        to: 'faizabadamit24@gmail.com',
        subject: 'Daily Attendence Report',
        text: 'Please find the attached Excel file.',
        html: `
        ${tableHTML}`,
        attachments: [{
            filename: 'data.xlsx',
            content: attachment
        }]
    });

    console.log('Email sent: ', info.messageId);
}


// Call the main function

// export const sendAttendenceMail = async (): Promise<void> => {
//     try {
//         // Fetch data from MySQL database
//         const selectQuery = 'SELECT emp.EMPCode, emp.Email FROM dbo.employeedetails emp';
//         const results: any = await sequelize.query(selectQuery, {
//             replacements: { EMPCode: "IT003" },
//             type: QueryTypes.SELECT,
//         });
//         results.map(async (item: any) => {
//             const data = await fetchData(item.EMPCode);
//             if (data.length === 0) {
//                 let transporter = nodemailer.createTransport({
//                     service: "gmail",
//                     auth: {
//                         user: "faizabadamit26@gmail.com",
//                         pass: "xwgksbbxrweruwyl",
//                     },
//                 });

//                 // Send mail with defined transport object
//                 await transporter.sendMail({
//                     from: 'faizabadamit26@gmail.com',
//                     to: item.Email,
//                     subject: 'Data Export',
//                     text: 'Today, you have no attendence visit record.',
//                 });
//                 return;
//             }

//             // Convert data to Excel
//             const excelBuffer = await convertToExcel(data);

//             // Send email with Excel attachment
//             await sendEmail(excelBuffer, data, item.Email);
//         })

//         console.log('Email sent successfully.');
//         console.log('cronJob running');
//         return;
//     } catch (error) {
//         console.error('Error:', error);
//     }
// }

export const sendAttendenceMail = async (): Promise<void> => {
    try {
        // Fetch data from MySQL database
        // const selectQuery = 'SELECT emp.EMPCode, emp.Email FROM dbo.employeedetails emp';
        // const results: any = await sequelize.query(selectQuery, {
        //     replacements: { EMPCode: "IT003" },
        //     type: QueryTypes.SELECT,
        // });
        // results.map(async (item: any) => {
            const data = await fetchData("IT002");
            if (data.length === 0) {
                let transporter = nodemailer.createTransport({
                    service: "gmail",
                    auth: {
                        user: "gkverma@forzamedi.com",
                        pass: "egvw rejv rpnk nrvg",
                    },
                });

                // Send mail with defined transport object
                await transporter.sendMail({
                    from: 'gkverma@forzamedi.com',
                    to: 'john@forzamedi.com',
                    // to: Email,
                    // cc: 'faizabadamit24@gmail.com',
                    cc: 'hrgroup@forzamedi.com , hverma@forzamedi.com, satyajeet@forzamedi.com, support@wcspl.net',
                    subject: 'Data Export',
                    text: 'Today, you have no attendence visit record.',
                });
                return;
            }

            // Convert data to Excel
            const excelBuffer = await convertToExcel(data);

            // Send email with Excel attachment
            await sendEmail(excelBuffer, data, 'devaiah@forzamedi.com');
        // })

        console.log('Email sent successfully.');
        console.log('cronJob running');
        return;
    } catch (error) {
        console.error('Error:', error);
    }
}
